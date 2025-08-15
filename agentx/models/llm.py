"""
Language Model implementations for AGENT-X.

This module contains implementations of various LLM models that can be used
with the AGENT-X system, including support for the NVIDIA NIM API.
"""

from typing import Dict, Any, Optional, List, Union, AsyncGenerator
import json
import logging
import re
from dataclasses import dataclass, field

from .base import BaseModel, ModelResponse

logger = logging.getLogger(__name__)

@dataclass
class GenerationConfig:
    """Configuration for text generation."""
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 0
    max_tokens: int = 4096
    stop: List[str] = field(default_factory=list)
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stream: bool = False

class BaseLLM(BaseModel):
    """Base class for all language model implementations."""
    
    def __init__(
        self,
        model_name: str,
        api_key: str = None,
        base_url: str = None,
        **kwargs
    ):
        """Initialize the base LLM.
        
        Args:
            model_name: Name of the model
            api_key: API key for authentication
            base_url: Base URL for the API
            **kwargs: Additional model-specific arguments
        """
        super().__init__(model_name, api_key, base_url, **kwargs)
        self.generation_config = GenerationConfig(**kwargs)
    
    async def generate(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate a response from the model.
        
        Args:
            prompt: The input prompt or message
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Nucleus sampling parameter
            **kwargs: Additional generation parameters
            
        Returns:
            ModelResponse containing the generated text and metadata
        """
        raise NotImplementedError("Subclasses must implement generate()")
    
    async def stream(
        self,
        prompt: str,
        **kwargs
    ) -> AsyncGenerator[ModelResponse, None]:
        """Stream responses from the model.
        
        Args:
            prompt: The input prompt or message
            **kwargs: Generation parameters
            
        Yields:
            ModelResponse chunks as they become available
        """
        raise NotImplementedError("Streaming not implemented for this model")
    
    def _prepare_messages(
        self,
        prompt: Union[str, List[Dict[str, str]]],
        system_prompt: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """Prepare messages for the API request.
        
        Args:
            prompt: Either a string prompt or a list of message dicts
            system_prompt: Optional system prompt to prepend
            
        Returns:
            List of message dicts in the format expected by the API
        """
        if isinstance(prompt, str):
            messages = [{"role": "user", "content": prompt}]
        else:
            messages = list(prompt)
            
        if system_prompt:
            messages.insert(0, {"role": "system", "content": system_prompt})
            
        return messages

class DBRXInstruct(BaseLLM):
    """Databricks DBRX Instruct model for general purpose chat."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the DBRX Instruct API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def _get_function_id(self, session: 'aiohttp.ClientSession', model_name: str) -> str:
        """Get the function ID for the specified model."""
        list_url = f"{self.base_url.rstrip('/')}?name={model_name}"
        async with session.get(list_url) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Failed to get function ID for {model_name}: {error_text}")
            
            functions = await response.json()
            if not functions.get('functions'):
                raise Exception(f"No function found for model: {model_name}")
            
            return functions['functions'][0]['id']
    
    async def generate(
        self,
        prompt: Union[str, List[Dict[str, str]]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate a response from the model.
        
        Args:
            prompt: The input prompt or list of messages
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Nucleus sampling parameter
            **kwargs: Additional generation parameters
            
        Returns:
            ModelResponse containing the generated text and metadata
        """
        # Prepare the request payload
        messages = self._prepare_messages(prompt, kwargs.pop('system_prompt', None))
        
        payload = {
            "messages": messages,
            "temperature": temperature if temperature is not None else self.generation_config.temperature,
            "top_p": top_p if top_p is not None else self.generation_config.top_p,
            "max_tokens": max_tokens if max_tokens is not None else self.generation_config.max_tokens,
            "stream": False,
            **kwargs
        }
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # Get the function ID for this model
            model_id = self.model_name.lower()
            function_id = await self._get_function_id(session, model_id)
            
            # Call the function
            call_url = f"{self.base_url.rstrip('/')}/{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                result = await response.json()
                
                # Extract the generated text from the response
                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                return ModelResponse(
                    content=content,
                    model=self.model_name,
                    metadata={
                        "model": self.model_name,
                        "tokens_used": result.get('usage', {}).get('total_tokens', 0),
                        "finish_reason": result.get('choices', [{}])[0].get('finish_reason', 'unknown'),
                        "raw_response": result
                    }
                )
                
        except Exception as e:
            logger.error(f"Error generating with {self.model_name}: {e}", exc_info=True)
            raise
    
    async def stream(
        self,
        prompt: Union[str, List[Dict[str, str]]],
        **kwargs
    ) -> AsyncGenerator[ModelResponse, None]:
        """Stream responses from the model.
        
        Args:
            prompt: The input prompt or list of messages
            **kwargs: Generation parameters
            
        Yields:
            ModelResponse chunks as they become available
        """
        # Prepare the request payload
        messages = self._prepare_messages(prompt, kwargs.pop('system_prompt', None))
        
        payload = {
            "messages": messages,
            "temperature": kwargs.get('temperature', self.generation_config.temperature),
            "top_p": kwargs.get('top_p', self.generation_config.top_p),
            "max_tokens": kwargs.get('max_tokens', self.generation_config.max_tokens),
            "stream": True,
            **kwargs
        }
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # Get the function ID for this model
            model_id = self.model_name.lower()
            function_id = await self._get_function_id(session, model_id)
            
            # Call the function with streaming
            call_url = f"{self.base_url.rstrip('/')}/{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                buffer = ""
                async for line in response.content:
                    if line.startswith(b'data: '):
                        chunk = line[6:].strip()
                        if chunk == b'[DONE]':
                            break
                            
                        try:
                            data = json.loads(chunk)
                            delta = data.get('choices', [{}])[0].get('delta', {})
                            content = delta.get('content', '')
                            
                            if content:
                                buffer += content
                                yield ModelResponse(
                                    content=content,
                                    model=self.model_name,
                                    metadata={
                                        "model": self.model_name,
                                        "chunk": True,
                                        "finish_reason": None
                                    }
                                )
                        except json.JSONDecodeError:
                            continue
                
                # Final response with complete content
                yield ModelResponse(
                    content=buffer,
                    model=self.model_name,
                    metadata={
                        "model": self.model_name,
                        "chunk": False,
                        "finish_reason": "stop"
                    }
                )
                
        except Exception as e:
            logger.error(f"Error streaming with {self.model_name}: {e}", exc_info=True)
            raise


class MixtralInstruct(BaseLLM):
    """Mistral's Mixtral 8x7B Instruct model for instruction following."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the Mixtral API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def _get_function_id(self, session: 'aiohttp.ClientSession', model_name: str) -> str:
        """Get the function ID for the specified model."""
        list_url = f"{self.base_url.rstrip('/')}?name={model_name}"
        async with session.get(list_url) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Failed to get function ID for {model_name}: {error_text}")
            
            functions = await response.json()
            if not functions.get('functions'):
                raise Exception(f"No function found for model: {model_name}")
            
            return functions['functions'][0]['id']
    
    async def generate(
        self,
        prompt: Union[str, List[Dict[str, str]]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate a response from the Mixtral model.
        
        Args:
            prompt: The input prompt or list of messages
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Nucleus sampling parameter
            **kwargs: Additional generation parameters
            
        Returns:
            ModelResponse containing the generated text and metadata
        """
        # Prepare the request payload
        messages = self._prepare_messages(prompt, kwargs.pop('system_prompt', None))
        
        payload = {
            "messages": messages,
            "temperature": temperature if temperature is not None else self.generation_config.temperature,
            "top_p": top_p if top_p is not None else self.generation_config.top_p,
            "max_tokens": max_tokens if max_tokens is not None else self.generation_config.max_tokens,
            "stream": False,
            **kwargs
        }
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # Get the function ID for this model
            model_id = self.model_name.lower()
            function_id = await self._get_function_id(session, model_id)
            
            # Call the function
            call_url = f"{self.base_url.rstrip('/')}/{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                result = await response.json()
                
                # Extract the generated text from the response
                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                return ModelResponse(
                    content=content,
                    model=self.model_name,
                    metadata={
                        "model": self.model_name,
                        "tokens_used": result.get('usage', {}).get('total_tokens', 0),
                        "finish_reason": result.get('choices', [{}])[0].get('finish_reason', 'unknown'),
                        "raw_response": result
                    }
                )
                
        except Exception as e:
            logger.error(f"Error generating with {self.model_name}: {e}", exc_info=True)
            raise


class CodeGemma7B(BaseModel):
    """Google's CodeGemma 7B model for code generation."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the CodeGemma API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def generate(
        self,
        prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        top_p: float = 0.9,
        **kwargs
    ) -> ModelResponse:
        """Generate code using CodeGemma 7B.
        
        Args:
            prompt: The code prompt or instruction
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Nucleus sampling parameter
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the generated code and metadata
        """
        # Prepare the request payload
        payload = {
            "prompt": prompt,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        # Add any additional parameters
        payload.update(kwargs)
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # First, get the function ID for CodeGemma 7B
            list_url = f"{self.base_url}?name=codegemma-7b"
            async with session.get(list_url) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to get CodeGemma function ID: {error_text}")
                
                functions = await response.json()
                if not functions.get('functions'):
                    raise Exception("No CodeGemma function found")
                
                function_id = functions['functions'][0]['id']
            
            # Now call the function
            call_url = f"{self.base_url}{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                result = await response.json()
                
                # Extract the generated code from the response
                # Note: The actual structure might need adjustment based on the API response
                content = result.get('text', '')
                
                return ModelResponse(
                    content=content,
                    model=self.model_name,
                    metadata={
                        "model": self.model_name,
                        "tokens_used": result.get('usage', {}).get('total_tokens', 0)
                    }
                )
                
        except Exception as e:
            logger.error(f"Error generating with CodeGemma 7B: {e}")
            raise
