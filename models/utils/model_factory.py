"""
Model factory for creating and managing model instances.

This module provides a factory pattern for creating and managing different types of models.
"""

from typing import Dict, Type, Any, Optional
import importlib
from ..llm import LLMModel, DBRXInstruct, CodeGemma7B, Gemma27B
from ..retrieval import RetrievalModel, NVEmbedV1, NVEmbedCode7B, BGE3
from ..visual import VisualModel, Flux1, Bria23, AIGeneratedImageDetector

class ModelFactory:
    """Factory class for creating and managing model instances."""
    
    # Registry of available model classes
    _model_registry: Dict[str, Type[Any]] = {
        # LLM Models
        "dbrx-instruct": DBRXInstruct,
        "codegemma-7b": CodeGemma7B,
        "gemma-2-7b": Gemma27B,
        
        # Retrieval Models
        "nv-embed-v1": NVEmbedV1,
        "nv-embedcode-7b": NVEmbedCode7B,
        "bge-m3": BGE3,
        
        # Visual Models
        "flux-1": Flux1,
        "bria-2.3": Bria23,
        "ai-detector": AIGeneratedImageDetector,
    }
    
    @classmethod
    def register_model(cls, name: str, model_class: Type[Any]) -> None:
        """Register a new model class with the factory.
        
        Args:
            name: Short name/identifier for the model
            model_class: The model class to register
        """
        cls._model_registry[name.lower()] = model_class
    
    @classmethod
    def create_model(
        cls,
        model_name: str,
        api_key: str = None,
        **kwargs
    ) -> Any:
        """Create an instance of the specified model.
        
        Args:
            model_name: Name/identifier of the model to create
            api_key: Optional API key for the model
            **kwargs: Additional arguments to pass to the model constructor
            
        Returns:
            An instance of the requested model
            
        Raises:
            ValueError: If the model name is not recognized
        """
        model_name = model_name.lower()
        if model_name not in cls._model_registry:
            raise ValueError(f"Unknown model: {model_name}. Available models: {', '.join(cls._model_registry.keys())}")
        
        return cls._model_registry[model_name](api_key=api_key, **kwargs)
    
    @classmethod
    def list_models(cls) -> Dict[str, str]:
        """Get a list of all registered models and their types.
        
        Returns:
            Dictionary mapping model names to their types
        """
        return {
            name: model_class.__name__
            for name, model_class in cls._model_registry.items()
        }

# Convenience functions
def get_model(model_name: str, api_key: str = None, **kwargs) -> Any:
    """Get an instance of the specified model.
    
    Args:
        model_name: Name/identifier of the model to create
        api_key: Optional API key for the model
        **kwargs: Additional arguments to pass to the model constructor
        
    Returns:
        An instance of the requested model
    """
    return ModelFactory.create_model(model_name, api_key, **kwargs)

def list_models() -> Dict[str, str]:
    """List all available models.
    
    Returns:
        Dictionary mapping model names to their types
    """
    return ModelFactory.list_models()
