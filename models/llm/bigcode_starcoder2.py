"""
BigCode StarCoder2 model implementation for code generation tasks.
"""

from typing import List, Dict, Any, Optional, Union
import logging
import json
from .. import BaseModel, NIM_API_BASE_URL

logger = logging.getLogger(__name__)

class BigCodeStarCoder2(BaseModel):
    """BigCode StarCoder2 15B model for code generation and understanding."""
    
    def __init__(self, api_key: str = None, **kwargs):
        """Initialize the BigCode StarCoder2 model.
        
        Args:
            api_key: Optional API key. If not provided, uses NVIDIA_API_KEY from .env
            **kwargs: Additional parameters including:
                - base_url: Override the base API URL
                - verify_ssl: Whether to verify SSL certificates (default: True)
        """
        base_url = kwargs.pop('base_url', NIM_API_BASE_URL)
        super().__init__(
            model_name="bigcode/starcoder2-15b-infer",
            api_key=api_key,
            base_url=base_url,
            **kwargs
        )
        
        # Model-specific configuration
        self.chat_endpoint = "completions"
        self.max_tokens = 2048
        self.temperature = 0.2
        self.top_p = 0.95
        self.stop_sequences = ["<|endoftext|"]
        
    async def generate(
        self,
        messages: Union[str, List[Dict[str, str]]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        stop_sequences: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate code or text using the StarCoder2 model.
        
        Args:
            messages: Either a string (for single prompt) or list of message dicts
                     with 'role' and 'content' keys
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            top_p: Nucleus sampling parameter (0.0 to 1.0)
            stop_sequences: List of strings that will stop generation when encountered
            **kwargs: Additional parameters for the API request
            
        Returns:
            Dictionary containing the model's response
            
        Raises:
            ValueError: If input validation fails
            RuntimeError: If API request fails
        """
        # Handle string input by converting to a single user message
        if isinstance(messages, str):
            messages = [{"role": "user", "content": messages}]
            
        # Validate messages format
        if not isinstance(messages, list) or not all(
            isinstance(m, dict) and 'role' in m and 'content' in m 
            for m in messages
        ):
            raise ValueError(
                "Messages must be a list of dicts with 'role' and 'content' keys"
            )
            
        # Use instance defaults if not provided
        if max_tokens is None:
            max_tokens = self.max_tokens
        if temperature is None:
            temperature = self.temperature
        if top_p is None:
            top_p = self.top_p
        if stop_sequences is None:
            stop_sequences = self.stop_sequences
            
        # Build the prompt from messages
        prompt = ""
        for msg in messages:
            role = msg['role']
            content = msg['content']
            if role == 'system':
                prompt += f"{content}\n\n"
            elif role == 'user':
                prompt += f"User: {content}\n"
            elif role == 'assistant':
                prompt += f"Assistant: {content}\n"
        
        # Add assistant prefix if not present
        if not prompt.strip().endswith("Assistant:"):
            prompt += "Assistant:"
            
        # Build the request payload
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "max_tokens": min(max(1, max_tokens), 4096),  # Clamp to 1-4096
            "temperature": max(0.0, min(1.0, temperature)),  # Clamp to 0.0-1.0
            "top_p": max(0.0, min(1.0, top_p)),  # Clamp to 0.0-1.0
            "stop": stop_sequences,
            **{k: v for k, v in kwargs.items() if v is not None}
        }
        
        url = self._build_api_url(self.chat_endpoint)
        logger.debug(f"Sending request to {url} with payload: {json.dumps(payload, indent=2)}")
        
        try:
            response = await self._make_request(
                'POST',
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            # Format the response to match the chat completion format
            if isinstance(response, dict):
                if 'choices' in response:
                    return response
                elif 'text' in response:
                    return {
                        'choices': [{
                            'message': {
                                'role': 'assistant',
                                'content': response['text']
                            },
                            'finish_reason': 'stop'
                        }]
                    }
            
            # Fallback to raw response if format is unexpected
            return {
                'choices': [{
                    'message': {
                        'role': 'assistant',
                        'content': str(response)
                    },
                    'finish_reason': 'stop'
                }]
            }
            
        except Exception as e:
            logger.error(f"Error in generate: {str(e)}")
            raise RuntimeError(f"Failed to generate completion: {str(e)}") from e
