"""
AGENT-X Models Package.

This package contains all model-related functionality for AGENT-X,
including model registry, LLMs, retrieval models, and visual models.
"""

from .registry import ModelType, ModelInfo, ModelRegistry, registry, get_model, list_models
from .nvidia import NVIDIAModel, Qwen2_5Coder32B, Llama3_1Nemotron70B, Llama3_3NemotronSuper49B

__all__ = [
    # Core
    'ModelType',
    'ModelInfo',
    'ModelRegistry',
    'registry',
    'get_model',
    'list_models',
    
    # NVIDIA Models
    'NVIDIAModel',
    'Qwen2_5Coder32B',
    'Llama3_1Nemotron70B',
    'Llama3_3NemotronSuper49B',
]
