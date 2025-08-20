"""
NVIDIA model integration for AGENT-X.

This module provides integration with NVIDIA's AI models through their API.
"""

import os
from typing import Dict, List, Optional, Union, Any, AsyncGenerator
import aiohttp
import json
from openai import AsyncOpenAI
from .base import BaseModel, ModelResponse

class NVIDIAModel(BaseModel):
    """Base class for NVIDIA AI models."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for NVIDIA's API."""
        return "https://integrate.api.nvidia.com/v1"
    
    def _setup(self, **kwargs):
        """Set up the OpenAI client for NVIDIA's API."""
        self.client = AsyncOpenAI(
            base_url=self.base_url,
            api_key=self.api_key
        )
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        top_p: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False,
        **kwargs
    ) -> Union[ModelResponse, AsyncGenerator[ModelResponse, None]]:
        """Generate a response from the NVIDIA model.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            temperature: Controls randomness (0.0 to 1.0)
            top_p: Controls diversity via nucleus sampling
            max_tokens: Maximum number of tokens to generate
            stream: Whether to stream the response
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse or AsyncGenerator of ModelResponse for streaming
        """
        if not self.api_key:
            raise ValueError("NVIDIA API key is required. Set the NVIDIA_API_KEY environment variable.")
        
        completion_params = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": stream,
            **kwargs
        }
        
        if stream:
            return self._stream_response(completion_params)
        
        response = await self.client.chat.completions.create(**completion_params)
        
        return ModelResponse(
            content=response.choices[0].message.content,
            model=self.model_name,
            metadata={
                "id": response.id,
                "created": response.created,
                "usage": response.usage.dict() if hasattr(response, 'usage') else {}
            }
        )
    
    async def _stream_response(self, params: Dict[str, Any]) -> AsyncGenerator[ModelResponse, None]:
        """Handle streaming responses from the API."""
        response = await self.client.chat.completions.create(**params)
        
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield ModelResponse(
                    content=chunk.choices[0].delta.content,
                    model=self.model_name,
                    metadata={
                        "id": chunk.id,
                        "created": getattr(chunk, 'created', None),
                    }
                )
    
    async def generate_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        tool_choice: Optional[Union[str, Dict[str, Any]]] = "auto",
        **kwargs
    ) -> ModelResponse:
        """Generate a response with tool calling capabilities.
        
        Args:
            messages: List of message dictionaries
            tools: List of tool definitions
            tool_choice: Which tool to call ("auto", "none", or specific tool)
            **kwargs: Additional generation parameters
            
        Returns:
            ModelResponse with tool calls in metadata if any
        """
        completion_params = {
            "model": self.model_name,
            "messages": messages,
            "tools": tools,
            "tool_choice": tool_choice,
            **kwargs
        }
        
        response = await self.client.chat.completions.create(**completion_params)
        message = response.choices[0].message
        
        return ModelResponse(
            content=message.content or "",
            model=self.model_name,
            metadata={
                "id": response.id,
                "created": response.created,
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": call.type,
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments
                        }
                    }
                    for call in (message.tool_calls or [])
                ],
                "usage": response.usage.dict() if hasattr(response, 'usage') else {}
            }
        )

# Pre-configured model classes for convenience
class Qwen2_5Coder32B(NVIDIAModel):
    """Qwen 2.5 Coder 32B model from NVIDIA."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="qwen/qwen2.5-coder-32b-instruct",
            api_key=api_key,
            **kwargs
        )

class Llama3_1Nemotron70B(NVIDIAModel):
    """Llama 3.1 Nemotron 70B model from NVIDIA."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="meta/llama3.1-nemotron-70b-instruct",
            api_key=api_key,
            **kwargs
        )

class Llama3_3NemotronSuper49B(NVIDIAModel):
    """Llama 3.3 Nemotron Super 49B model from NVIDIA."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="meta/llama3.3-nemotron-super-49b-v1.5",
            api_key=api_key,
            **kwargs
        )
