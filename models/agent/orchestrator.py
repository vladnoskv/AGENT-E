"""
Master Agent Orchestrator

Routes user tasks to the appropriate specialized models using the model registry
and prompt templates. Designed to print final results unless verbose mode is on.
"""
from __future__ import annotations

import os
import asyncio
from typing import Any, Dict, Optional, List

from ..registry import registry, ModelType
from ..utils.prompt_loader import load_prompt


class MasterAgent:
    """Master agent to orchestrate multi-model tasks."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        if not self.api_key:
            raise RuntimeError("NVIDIA_API_KEY is not set")
        # Load system prompts
        self.system_prompt = load_prompt(
            "agent/system.md",
            default=(
                "You are a master orchestration agent. Route tasks to the right models, "
                "keep intermediate steps minimal, and return a concise final result."
            ),
        )
        self.router_prompt = load_prompt(
            "agent/router.md",
            default=(
                "Given a task description, decide if it requires: LLM (text/code), "
                "Retrieval (embeddings/search/rerank), or Visual (image gen/analysis)."
            ),
        )

    async def _route(self, task: str, override: Optional[str] = None) -> Dict[str, Any]:
        """Very lightweight routing based on keywords or override.
        Returns a dict {type, model_name}.
        """
        if override:
            info = registry.get_model_info(override)
            if not info:
                raise ValueError(f"Unknown model override: {override}")
            return {"type": info.model_type, "model_name": info.name}

        t = task.lower()
        # Simple heuristic routing; can be replaced with LLM-driven router later
        if any(k in t for k in ["image", "visual", "generate an image", "render"]):
            # Visual
            preferred = "flux-1"
            return {"type": ModelType.VISUAL, "model_name": preferred}
        if any(k in t for k in ["embedding", "search", "rerank", "retrieve", "similarity"]):
            # Retrieval
            preferred = "nv-embed-v1"
            return {"type": ModelType.RETRIEVAL, "model_name": preferred}
        # Default to LLM
        preferred = "dbrx-instruct"
        return {"type": ModelType.LLM, "model_name": preferred}

    async def run(self,
                  task: str,
                  model_override: Optional[str] = None,
                  params: Optional[Dict[str, Any]] = None,
                  verbose: bool = False) -> Dict[str, Any]:
        """Execute a task via the selected model and return a result dict.
        Result schema: {"final": str, "artifacts": optional dict}
        """
        params = params or {}
        route = await self._route(task, model_override)
        model_info = registry.get_model_info(route["model_name"])
        if verbose:
            print(f"[agent] Routed to {model_info.model_type.value}:{model_info.name}")
        model = registry.create_model(model_info.name, api_key=self.api_key, **params)

        if model_info.model_type == ModelType.LLM:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": task},
            ]
            resp = await model.generate(messages=messages, **params)
            final = resp["choices"][0]["message"]["content"]
            return {"final": final}
        elif model_info.model_type == ModelType.RETRIEVAL:
            docs = await model.get_embeddings([task], **params)
            # Provide a compact summary about the embedding
            dim = len(docs[0].embedding) if docs and docs[0].embedding else 0
            return {
                "final": f"Generated embedding with {dim} dimensions for the task.",
                "artifacts": {"embedding_dim": dim},
            }
        elif model_info.model_type == ModelType.VISUAL:
            images = await getattr(model, "generate_image")(prompt=task, **params)
            return {
                "final": f"Generated {len(images)} image(s). Save them to files as needed.",
                "artifacts": {"image_count": len(images)},
            }
        else:
            return {"final": f"Unsupported model type: {model_info.model_type}"}
