"""
AGENT-X - Multi-Model AI Orchestration Tool

A powerful Python-based CLI for orchestrating multiple specialized AI models
from NVIDIA's NIM API, including LLMs, retrieval models, and visual models.
"""

__version__ = "0.3.0"

# Import key components to make them available at the package level
from .orchestrator import AgentOrchestrator
from .models.registry import registry, get_model, list_models
from .models.llm import DBRXInstruct, CodeGemma7B
from .models.visual import Flux1, Bria23
from .models.retrieval import NVEmbedV1, NVEmbedCode7B

# Initialize the registry with all available models
from .models.registry import ModelType

# Register LLM models
registry.register_model("dbrx-instruct", "Databricks DBRX Instruct for general purpose chat", DBRXInstruct, ModelType.LLM)
registry.register_model("codegemma-7b", "Google's CodeGemma 7B for code generation", CodeGemma7B, ModelType.LLM)

# Register Visual models
registry.register_model("flux-1", "Stability AI's Flux 1.0 for image generation", Flux1, ModelType.VISUAL)
registry.register_model("bria-2.3", "BRIA 2.3 for high-quality image generation", Bria23, ModelType.VISUAL)

# Register Retrieval models
registry.register_model("nv-embed-v1", "NVIDIA's general-purpose embedding model", NVEmbedV1, ModelType.RETRIEVAL)
registry.register_model("nv-embedcode-7b", "NVIDIA's code-specific embedding model", NVEmbedCode7B, ModelType.RETRIEVAL)

__all__ = [
    'AgentOrchestrator',
    'registry',
    'get_model',
    'list_models',
    'DBRXInstruct',
    'CodeGemma7B',
    'Flux1',
    'Bria23',
    'NVEmbedV1',
    'NVEmbedCode7B'
]
