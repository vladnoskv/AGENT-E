"""
Model registry for managing all available models in the system.
"""

from typing import Dict, Type, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import importlib

# Import all model types
from .llm import DBRXInstruct, CodeGemma7B, Gemma27B, BigCodeStarCoder2
from .retrieval import NVEmbedV1, NVEmbedCode7B, BGE3
from .retrieval.specialized import NemoRetriever, NemoReranker, NemoEmbedQA, NemoRerankQA
from .visual import Flux1, Bria23, AIGeneratedImageDetector

class ModelType(str, Enum):
    """Types of models available in the system."""
    LLM = "llm"
    RETRIEVAL = "retrieval"
    VISUAL = "visual"
    MULTIMODAL = "multimodal"

@dataclass
class ModelInfo:
    """Metadata about a model."""
    name: str
    description: str
    model_class: Type[Any]
    model_type: ModelType
    is_specialized: bool = False
    default_params: Optional[Dict[str, Any]] = None

class ModelRegistry:
    """Registry for all available models in the system."""
    
    _instance = None
    _models: Dict[str, ModelInfo] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_registry()
        return cls._instance
    
    def _initialize_registry(self):
        """Initialize the registry with all available models."""
        # LLM Models
        self.register_model(
            "dbrx-instruct",
            "Databricks DBRX Instruct for general purpose chat",
            DBRXInstruct,
            ModelType.LLM
        )
        
        self.register_model(
            "codegemma-7b",
            "Google's CodeGemma 7B for code generation",
            CodeGemma7B,
            ModelType.LLM
        )
        
        # Retrieval Models
        self.register_model(
            "nv-embed-v1",
            "NVIDIA's general-purpose embedding model",
            NVEmbedV1,
            ModelType.RETRIEVAL
        )
        
        self.register_model(
            "nemo-retriever",
            "NVIDIA's NeMo Retriever for hybrid search",
            NemoRetriever,
            ModelType.RETRIEVAL,
            is_specialized=True
        )
        
        self.register_model(
            "nemo-reranker",
            "NVIDIA's NeMo Reranker for improving search results",
            NemoReranker,
            ModelType.RETRIEVAL,
            is_specialized=True
        )
        
        # Visual Models
        self.register_model(
            "flux-1",
            "Black Forest Labs' Flux 1.0 for image generation",
            Flux1,
            ModelType.VISUAL
        )
        
        self.register_model(
            "bria-2.3",
            "BRIA AI's 2.3 for high-quality image generation",
            Bria23,
            ModelType.VISUAL
        )
        
        # Code Generation Models
        self.register_model(
            "starcoder2-15b",
            "BigCode's StarCoder2 15B for code generation and completion",
            BigCodeStarCoder2,
            ModelType.LLM,
            is_specialized=True,
            default_params={
                "temperature": 0.2,
                "max_tokens": 2048,
                "top_p": 0.95
            }
        )
        
        self.register_model(
            "ai-detector",
            "Model for detecting AI-generated images",
            AIGeneratedImageDetector,
            ModelType.VISUAL,
            is_specialized=True
        )
    
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
        """Get information about a specific model.
        
        Args:
            model_name: Name of the model to look up
            
        Returns:
            ModelInfo if found, None otherwise
        """
        return self._models.get(model_name.lower())
    
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
        models = list(self._models.values())
        
        if model_type is not None:
            models = [m for m in models if m.model_type == model_type]
            
        if specialized_only:
            models = [m for m in models if m.is_specialized]
            
        return sorted(models, key=lambda x: x.name)
    
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
        return model_info.model_class(api_key=api_key, **params)

# Create a singleton instance of the registry
registry = ModelRegistry()

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
