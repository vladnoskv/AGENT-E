"""
Base model class for all AGENT-X models.

This module defines the base interface that all models must implement.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
import aiohttp
import os
import json
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class ModelResponse:
    """Standard response format for model predictions."""
    content: str
    model: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the response to a dictionary."""
        return {
            "content": self.content,
            "model": self.model,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ModelResponse':
        """Create a response from a dictionary."""
        return cls(
            content=data["content"],
            model=data["model"],
            metadata=data.get("metadata", {})
        )


class BaseModel(ABC):
    """Base class for all AGENT-X models.
    
    This class defines the common interface and functionality that all models
    must implement. It handles API key management, HTTP requests, and provides
    a standard way to make predictions.
    """
    
    def __init__(
        self,
        model_name: str,
        api_key: str = None,
        base_url: str = None,
        **kwargs
    ):
        """Initialize the model.
        
        Args:
            model_name: Name of the model
            api_key: API key for the model service
            base_url: Base URL for the model API
            **kwargs: Additional model-specific arguments
        """
        self.model_name = model_name
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        self.base_url = base_url or self.get_default_base_url()
        self.session = None
        self._setup(**kwargs)
    
    def _setup(self, **kwargs):
        """Perform any model-specific setup.
        
        Subclasses should override this method to perform any initialization
        that needs to happen after __init__.
        """
        pass
    
    @abstractmethod
    def get_default_base_url(self) -> str:
        """Get the default base URL for this model's API.
        
        Returns:
            The default base URL as a string
        """
        pass
    
    async def ensure_session(self) -> aiohttp.ClientSession:
        """Ensure we have an active aiohttp session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                timeout=aiohttp.ClientTimeout(total=300)
            )
        return self.session
    
    async def close(self):
        """Close any resources used by the model."""
        if self.session and not self.session.closed:
            await self.session.close()
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> ModelResponse:
        """Generate a response from the model.
        
        Args:
            prompt: The input prompt or message
            **kwargs: Additional model-specific parameters
            
        Returns:
            A ModelResponse containing the generated content and metadata
        """
        pass
    
    async def __aenter__(self):
        """Support async context manager protocol."""
        await self.ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up resources when exiting context."""
        await self.close()
    
    def __del__(self):
        """Ensure resources are cleaned up when the object is garbage collected."""
        if hasattr(self, 'session') and self.session and not self.session.closed:
            import warnings
            import asyncio
            
            async def cleanup():
                await self.close()
            
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(cleanup())
                else:
                    loop.run_until_complete(cleanup())
            except Exception as e:
                warnings.warn(f"Error during cleanup: {e}")
