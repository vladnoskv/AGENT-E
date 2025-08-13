"""
Models package for AGENTX.

This package contains implementations of various AI models for different tasks.
"""

from typing import Dict, Any, Optional, List, Union
from abc import ABC, abstractmethod
import os
import ssl
from pathlib import Path
import certifi
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the NVIDIA API key from environment variables
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise ValueError("NVIDIA_API_KEY not found in environment variables. Please set it in your .env file.")

# Base URLs for NVIDIA NIM API
NIM_API_BASE_URL = "https://integrate.api.nvidia.com/v1"
NEMO_AGENT_BASE_URL = "https://api.nvcf.nvidia.com/v2/nvcf/exec/status"

class BaseModel(ABC):
    """Base class for all AI models in the system."""
    
    def __init__(self, model_name: str, api_key: str = None, **kwargs):
        """Initialize the base model.
        
        Args:
            model_name: Name of the model as specified in the NIM API
            api_key: Optional API key. If not provided, uses NVIDIA_API_KEY from .env
            **kwargs: Additional parameters including:
                - base_url: Override the base API URL
                - verify_ssl: Whether to verify SSL certificates (default: True)
        """
        self.model_name = model_name
        self.api_key = api_key or NVIDIA_API_KEY
        self.base_url = kwargs.get('base_url', NIM_API_BASE_URL)
        self.verify_ssl = kwargs.get('verify_ssl', True)
        
        # Configure SSL context
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())
        if not self.verify_ssl:
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE
            
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    @abstractmethod
    async def generate(self, *args, **kwargs) -> Any:
        """Generate a response from the model."""
        pass
    
    def _build_api_url(self, endpoint: str = '') -> str:
        """Build the full API URL for a given endpoint.
        
        Args:
            endpoint: Optional endpoint path to append to base URL
            
        Returns:
            str: Full URL for the API endpoint
        """
        if not endpoint:
            return self.base_url
        return f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
    async def _make_request(self, method: str, url: str, **kwargs) -> Any:
        """Make an HTTP request with proper error handling and SSL configuration."""
        import aiohttp
        
        # Update headers with any provided headers
        headers = self.headers.copy()
        if 'headers' in kwargs:
            headers.update(kwargs.pop('headers'))
            
        # Configure SSL context
        ssl_context = None
        if self.verify_ssl:
            ssl_context = self.ssl_context
            
        async with aiohttp.ClientSession() as session:
            try:
                async with session.request(
                    method,
                    url,
                    headers=headers,
                    ssl=ssl_context,
                    **kwargs
                ) as response:
                    response.raise_for_status()
                    content_type = response.headers.get('Content-Type', '')
                    
                    if 'application/json' in content_type:
                        return await response.json()
                    return await response.text()
                    
            except aiohttp.ClientError as e:
                error_msg = f"API request failed: {str(e)}"
                if hasattr(e, 'response') and e.response:
                    error_msg += f" (Status: {e.response.status})"
                    try:
                        error_detail = await e.response.text()
                        error_msg += f" - {error_detail}"
                    except:
                        pass
                raise RuntimeError(error_msg) from e
