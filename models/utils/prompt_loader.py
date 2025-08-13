"""
Prompt Loader Utility

Loads system and task prompts from the prompts/ directory to avoid hardcoding.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parents[2]
PROMPTS_DIR = BASE_DIR / "prompts"


def load_prompt(path: str, default: Optional[str] = None) -> str:
    """Load a prompt file from the prompts directory.

    Args:
        path: Relative path inside prompts/, e.g. "agent/system.md"
        default: Optional fallback text if the file is missing
    Returns:
        The prompt text
    Raises:
        FileNotFoundError if file not found and no default provided
    """
    prompt_path = PROMPTS_DIR / path
    if prompt_path.exists():
        return prompt_path.read_text(encoding="utf-8")
    if default is not None:
        return default
    raise FileNotFoundError(f"Prompt not found: {prompt_path}")
