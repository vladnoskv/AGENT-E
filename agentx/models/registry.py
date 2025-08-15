"""
Model registry for managing all available models in AGENT-X.

This module provides a registry of available models and utilities for
creating and managing model instances.
"""

from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, Type, Any, Optional, List, Union
import logging

logger = logging.getLogger(__name__)

class ModelType(Enum):
    """Types of models available in the system."""
    LLM = auto()
    RETRIEVAL = auto()
    VISUAL = auto()
    MULTIMODAL = auto()


@dataclass
class ModelInfo:
    """Metadata about a model."""
    name: str
    description: str
    model_class: Type[Any]
    model_type: ModelType
    is_specialized: bool = False
    default_params: Optional[Dict[str, Any]] = None
    
    def __str__(self):
        return f"{self.name}: {self.description} (Type: {self.model_type.name})"


class ModelRegistry:
    """Registry for all available models in the system.
    
    This class implements the singleton pattern to ensure there's only one
    registry instance throughout the application.
    """
    
    _instance = None
    _models: Dict[str, ModelInfo] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_registry()
        return cls._instance
    
    def _initialize_registry(self):
        """Initialize the registry with all supported models."""
        # ===== Language Models =====
        self.register_model(
            "llama-3.3-70b-instruct",
            "Meta's Llama 3.3 70B - General purpose language model",
            None,
            ModelType.LLM,
            default_params={
                "temperature": 0.7,
                "max_tokens": 4096,
                "top_p": 0.9,
                "presence_penalty": 0.0,
                "frequency_penalty": 0.0
            }
        )
        
        self.register_model(
            "mixtral-8x7b-instruct",
            "Mistral's Mixtral 8x7B - High-quality instruction following model",
            None,
            ModelType.LLM,
            default_params={
                "temperature": 0.7,
                "max_tokens": 4096,
                "top_p": 0.9
            }
        )
        
        self.register_model(
            "code-llama-70b-instruct",
            "Code Llama 70B - Specialized for code generation and understanding",
            None,
            ModelType.LLM,
            default_params={
                "temperature": 0.2,
                "max_tokens": 4096,
                "top_p": 0.9
            }
        )
        
        # ===== Multimodal Models =====
        self.register_model(
            "llava-1.5-7b",
            "LLaVA 1.5 7B - Multimodal model for image understanding and generation",
            None,
            ModelType.MULTIMODAL,
            default_params={
                "temperature": 0.2,
                "max_tokens": 1024,
                "image_size": 512
            }
        )
        
        self.register_model(
            "llava-1.5-13b",
            "LLaVA 1.5 13B - Larger multimodal model for complex tasks",
            None,
            ModelType.MULTIMODAL,
            default_params={
                "temperature": 0.2,
                "max_tokens": 1024,
                "image_size": 512
            }
        )
        
        # ===== Visual Models =====
        self.register_model(
            "flux.1-dev",
            "Flux 1.0 - High-quality image generation",
            None,
            ModelType.VISUAL,
            default_params={
                "width": 1024,
                "height": 1024,
                "num_images": 1,
                "guidance_scale": 7.5,
                "steps": 30
            }
        )
        
        self.register_model(
            "sdxl-turbo",
            "Stable Diffusion XL Turbo - Fast high-quality image generation",
            None,
            ModelType.VISUAL,
            default_params={
                "width": 1024,
                "height": 1024,
                "num_inference_steps": 4,
                "guidance_scale": 0.0
            }
        )
        
        self.register_model(
            "playground-v2.5",
            "Playground v2.5 - Advanced image generation with better details",
            None,
            ModelType.VISUAL,
            default_params={
                "width": 1024,
                "height": 1024,
                "num_inference_steps": 50,
                "guidance_scale": 7.5
            }
        )
        
        # ===== Embedding Models =====
        self.register_model(
            "nv-embed-v1",
            "NVIDIA Embeddings V1 - General-purpose text embeddings",
            None,
            ModelType.RETRIEVAL,
            default_params={
                "batch_size": 32,
                "embedding_dimension": 1024
            }
        )
        
        self.register_model(
            "bge-large-en-v1.5",
            "BAAI BGE Large v1.5 - High-quality text embeddings",
            None,
            ModelType.RETRIEVAL,
            default_params={
                "batch_size": 32,
                "embedding_dimension": 1024
            }
        )
        
        # ===== Specialized Models =====
        self.register_model(
            "nemotron-3-8b-8k-base",
            "NVIDIA Nemotron 3 8B - Specialized for code and reasoning",
            None,
            ModelType.LLM,
            default_params={
                "temperature": 0.2,
                "max_tokens": 8192,
                "top_p": 0.9
            },
            is_specialized=True
        )
        
        self.register_model(
            "snowflake-arctic-embed-l",
            "Snowflake Arctic Embed L - Specialized for retrieval and RAG",
            None,
            ModelType.RETRIEVAL,
            default_params={
                "batch_size": 32,
                "embedding_dimension": 1024
            },
            is_specialized=True
        )
        
        # ===== Experimental Models =====
        self.register_model(
            "llama-3-8b-instruct",
            "Meta's Llama 3 8B - Smaller, faster version of Llama 3",
            None,
            ModelType.LLM,
            default_params={
                "temperature": 0.7,
                "max_tokens": 8192,
                "top_p": 0.9
            },
            is_specialized=True
        )
        
        self.register_model(
            "llama-3-70b-instruct",
            "Meta's Llama 3 70B - Larger version of Llama 3",
            None,
            ModelType.LLM,
            default_params={
                "temperature": 0.7,
                "max_tokens": 8192,
                "top_p": 0.9
            },
            is_specialized=True
        )
        
        # Lazy load model classes when needed
        self._lazy_loaded = False
    
    def _ensure_lazy_loaded(self):
        """Lazily load model classes to avoid circular imports."""
        if self._lazy_loaded:
            return
            
        try:
            # Import all model base classes
            from .llm import BaseLLM, DBRXInstruct, MixtralInstruct, CodeLlamaInstruct, NemotronInstruct
            from .visual import BaseVisualModel, Flux1, SDXLTurbo, PlaygroundV25
            from .retrieval import BaseRetrievalModel, NVEmbedV1, BGEV1_5, SnowflakeArcticEmbed
            from .multimodal import LLaVABase, LLaVA13B
            
            # Map model names to their implementation classes
            model_class_map = {
                # === Language Models ===
                "llama-3.3-70b-instruct": DBRXInstruct,
                "llama-3-8b-instruct": DBRXInstruct,  # Using DBRX as fallback
                "llama-3-70b-instruct": DBRXInstruct,  # Using DBRX as fallback
                "mixtral-8x7b-instruct": MixtralInstruct,
                "code-llama-70b-instruct": CodeLlamaInstruct,
                "nemotron-3-8b-8k-base": NemotronInstruct,
                
                # === Visual Models ===
                "flux.1-dev": Flux1,
                "sdxl-turbo": SDXLTurbo,
                "playground-v2.5": PlaygroundV25,
                
                # === Retrieval Models ===
                "nv-embed-v1": NVEmbedV1,
                "bge-large-en-v1.5": BGEV1_5,
                "snowflake-arctic-embed-l": SnowflakeArcticEmbed,
                
                # === Multimodal Models ===
                "llava-1.5-7b": LLaVABase,
                "llava-1.5-13b": LLaVA13B
            }
            
            # Update model classes in the registry
            for model_name, model_class in model_class_map.items():
                if model_name in self._models:
                    self._models[model_name].model_class = model_class
            
            self._lazy_loaded = True
            
        except ImportError as e:
            logger.error(f"Failed to lazy load model classes: {e}", exc_info=True)
            raise RuntimeError("Failed to initialize model classes. Please check the logs for details.") from e
    
    def register_model(
        self,
        name: str,
        description: str,
        model_class: Type[Any],
        model_type: ModelType,
        is_specialized: bool = False,
        default_params: Optional[Dict[str, Any]] = None
    ) -> None:
        """Register a new model in the registry.
        
        Args:
            name: Unique identifier for the model
            description: Human-readable description of the model
            model_class: The model class (not instance)
            model_type: Type of the model
            is_specialized: Whether this is a specialized model
            default_params: Default parameters for the model
        """
        self._models[name.lower()] = ModelInfo(
            name=name,
            description=description,
            model_class=model_class,
            model_type=model_type,
            is_specialized=is_specialized,
            default_params=default_params or {}
        )
    
    def get_model_info(self, model_name: str) -> Optional[ModelInfo]:
        """Get information about a model by name.
        
        Args:
            model_name: Name of the model to look up
            
        Returns:
            ModelInfo if found, None otherwise
        """
        self._ensure_lazy_loaded()
        return self._models.get(model_name.lower())
    
    def create_model(
        self,
        model_name: str,
        api_key: str = None,
        **kwargs
    ) -> Any:
        """Create an instance of the specified model.
        
        Args:
            model_name: Name of the model to create
            api_key: Optional API key for the model
            **kwargs: Additional arguments to pass to the model constructor
            
        Returns:
            An instance of the requested model
            
        Raises:
            ValueError: If the model name is not recognized
        """
        model_info = self.get_model_info(model_name)
        if not model_info:
            available = ", ".join(self._models.keys())
            raise ValueError(
                f"Unknown model: {model_name}. Available models: {available}"
            )
        
        # Merge default params with provided kwargs (kwargs take precedence)
        params = {**model_info.default_params, **kwargs}
        # Ensure model_name is passed to the model constructor
        if 'model_name' not in params:
            params['model_name'] = model_info.name
        return model_info.model_class(api_key=api_key, **params)
    
    def list_models(
        self,
        model_type: Optional[ModelType] = None,
        specialized_only: bool = False
    ) -> List[ModelInfo]:
        """List all available models, optionally filtered by type.
        
        Args:
            model_type: If provided, only return models of this type
            specialized_only: If True, only return specialized models
            
        Returns:
            List of ModelInfo objects
        """
        self._ensure_lazy_loaded()
        models = list(self._models.values())
        
        if model_type is not None:
            models = [m for m in models if m.model_type == model_type]
            
        if specialized_only:
            models = [m for m in models if m.is_specialized]
            
        return sorted(models, key=lambda x: x.name)


# Create a singleton instance of the registry
registry = ModelRegistry()

# Convenience functions
def get_model(model_name: str, api_key: str = None, **kwargs) -> Any:
    """Get an instance of the specified model.
    
    Args:
        model_name: Name of the model to create
        api_key: Optional API key for the model
        **kwargs: Additional arguments to pass to the model constructor
        
    Returns:
        An instance of the requested model
    """
    return registry.create_model(model_name, api_key, **kwargs)


def list_models(
    model_type: Optional[ModelType] = None,
    specialized_only: bool = False
) -> List[ModelInfo]:
    """List all available models, optionally filtered by type.
    
    Args:
        model_type: If provided, only return models of this type
        specialized_only: If True, only return specialized models
        
    Returns:
        List of ModelInfo objects
    """
    return registry.list_models(model_type, specialized_only)
