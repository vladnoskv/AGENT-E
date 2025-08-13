"""
LLM (Large Language Model) implementations.

This module provides implementations of various LLM models for text generation tasks.
"""

from typing import List, Dict, Any, Optional
import aiohttp
import json
from .. import BaseModel

class LLMModel(BaseModel):
    """Base class for LLM models."""
    
    def __init__(self, model_name: str, api_key: str = None):
        """Initialize the LLM model.
        
        Args:
            model_name: Name of the model as specified in the NIM API
            api_key: Optional API key. If not provided, uses NVIDIA_API_KEY from .env
        """
        super().__init__(model_name, api_key)
        self.chat_endpoint = "chat/completions"
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.7,
        top_p: float = 0.9,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate a chat completion.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 2.0)
            top_p: Nucleus sampling parameter (0.0 to 1.0)
            **kwargs: Additional parameters to pass to the API
            
        Returns:
            Dictionary containing the model's response
        """
        url = self._build_api_url(self.chat_endpoint)
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            **kwargs
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers=self.headers,
                json=payload
            ) as response:
                response.raise_for_status()
                return await response.json()

# Import specialized LLM models
from .bigcode_starcoder2 import BigCodeStarCoder2

# Pre-configured model instances
class DBRXInstruct(LLMModel):
    """Databricks DBRX Instruct model for general purpose chat."""
    def __init__(self, api_key: str = None):
        super().__init__("databricks/dbrx-instruct", api_key)

class CodeGemma7B(LLMModel):
    """Google's CodeGemma 7B model for code generation and understanding."""
    def __init__(self, api_key: str = None):
        super().__init__("google/codegemma-7b", api_key)

class Gemma27B(LLMModel):
    """Google's Gemma 2 7B model for general purpose chat."""
    def __init__(self, api_key: str = None):
        super().__init__("google/gemma-2-7b-it", api_key)
