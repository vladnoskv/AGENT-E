"""
Visual models for AGENT-X.

This module contains implementations of various visual models that can be used
with the AGENT-X system, including image generation and analysis models.
"""

from typing import Dict, Any, List, Optional, Union, BinaryIO, AsyncGenerator, Tuple
import base64
import io
import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

import aiohttp
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from ..models.base import BaseModel, ModelResponse

logger = logging.getLogger(__name__)

class ImageFormat(str, Enum):
    """Supported image formats for generation and processing."""
    PNG = "png"
    JPEG = "jpeg"
    WEBP = "webp"

@dataclass
class ImageSize:
    """Standard image size presets."""
    width: int
    height: int
    
    @classmethod
    def SD(cls):
        """Standard Definition (512x512)."""
        return cls(512, 512)
        
    @classmethod
    def HD(cls):
        """High Definition (1024x1024)."""
        return cls(1024, 1024)
        
    @classmethod
    def UHD(cls):
        """Ultra High Definition (1536x1536)."""
        return cls(1536, 1536)
        
    @classmethod
    def WIDESCREEN(cls):
        """Widescreen 16:9 aspect ratio (1280x720)."""
        return cls(1280, 720)
        
    @classmethod
    def PORTRAIT(cls):
        """Portrait 9:16 aspect ratio (720x1280)."""
        return cls(720, 1280)

@dataclass
class ImageGenerationResponse(ModelResponse):
    """Response format for image generation models."""
    images: List[bytes] = field(default_factory=list)  # Raw image bytes
    image_format: ImageFormat = ImageFormat.PNG
    size: Tuple[int, int] = (1024, 1024)
    seed: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the response to a dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            "images": [base64.b64encode(img).decode('utf-8') for img in self.images],
            "image_format": self.image_format.value,
            "size": {"width": self.size[0], "height": self.size[1]},
            "seed": self.seed
        })
        return base_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ImageGenerationResponse':
        """Create a response from a dictionary."""
        images = [base64.b64decode(img) for img in data.get("images", [])]
        size_data = data.get("size", {})
        size = (size_data.get("width", 1024), size_data.get("height", 1024))
        
        return cls(
            content="",  # Base class requires content
            model=data.get("model", ""),
            images=images,
            image_format=ImageFormat(data.get("image_format", "png")),
            size=size,
            seed=data.get("seed"),
            metadata=data.get("metadata", {})
        )
    
    def save_images(self, output_dir: Union[str, Path], prefix: str = "image") -> List[Path]:
        """Save generated images to disk.
        
        Args:
            output_dir: Directory to save images
            prefix: Filename prefix for saved images
            
        Returns:
            List of paths to saved images
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        saved_paths = []
        for i, img_data in enumerate(self.images):
            timestamp = int(time.time())
            filename = f"{prefix}_{i+1}_{self.model.replace('/', '_')}_{timestamp}.{self.image_format}"
            filepath = output_dir / filename
            
            with open(filepath, "wb") as f:
                f.write(img_data)
            saved_paths.append(filepath)
            
        return saved_paths


class BaseVisualModel(BaseModel):
    """Base class for all visual models."""
    
    def __init__(
        self,
        model_name: str,
        api_key: str = None,
        base_url: str = None,
        **kwargs
    ):
        """Initialize the base visual model.
        
        Args:
            model_name: Name of the model
            api_key: API key for authentication
            base_url: Base URL for the API
            **kwargs: Additional model-specific arguments
        """
        super().__init__(model_name, api_key, base_url, **kwargs)
        self.supported_sizes = self._get_supported_sizes()
        self.default_size = (1024, 1024)
    
    def _get_supported_sizes(self) -> List[Tuple[int, int]]:
        """Get list of supported image sizes for this model."""
        # Default supported sizes, can be overridden by subclasses
        return [
            (512, 512), (768, 768), (1024, 1024), 
            (1152, 896), (896, 1152), (1216, 832), 
            (1344, 768), (768, 1344), (1536, 640), 
            (640, 1536)
        ]
    
    def validate_size(self, width: int, height: int) -> Tuple[int, int]:
        """Validate and adjust image dimensions to nearest supported size."""
        if not self.supported_sizes:
            return width, height
            
        # Find closest supported size
        def distance(size):
            w, h = size
            return (w - width) ** 2 + (h - height) ** 2
            
        closest = min(self.supported_sizes, key=distance)
        return closest
    
    async def _get_function_id(self, session: aiohttp.ClientSession, model_name: str) -> str:
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
    
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = None,
        height: int = None,
        num_images: int = 1,
        guidance_scale: float = 7.5,
        steps: int = 30,
        seed: Optional[int] = None,
        **kwargs
    ) -> ImageGenerationResponse:
        """Generate an image from a text prompt.
        
        Args:
            prompt: Text prompt describing the desired image
            negative_prompt: Text describing what should not be in the image
            width: Width of the generated image (pixels)
            height: Height of the generated image (pixels)
            num_images: Number of images to generate (1-4)
            guidance_scale: How closely to follow the prompt (higher = more strict)
            steps: Number of diffusion steps (affects quality and speed)
            seed: Random seed for reproducibility
            **kwargs: Additional model-specific parameters
            
        Returns:
            ImageGenerationResponse containing the generated images and metadata
        """
        raise NotImplementedError("Subclasses must implement generate_image()")
    
    async def upscale_image(
        self,
        image: Union[bytes, str, Image.Image],
        scale_factor: float = 2.0,
        **kwargs
    ) -> ImageGenerationResponse:
        """Upscale an image while preserving quality.
        
        Args:
            image: Input image as bytes, file path, or PIL Image
            scale_factor: How much to scale the image (e.g., 2.0 = 2x)
            **kwargs: Additional model-specific parameters
            
        Returns:
            ImageGenerationResponse with the upscaled image
        """
        raise NotImplementedError("This model does not support upscaling")
    
    async def edit_image(
        self,
        image: Union[bytes, str, Image.Image],
        prompt: str,
        mask: Optional[Union[bytes, str, Image.Image]] = None,
        **kwargs
    ) -> ImageGenerationResponse:
        """Edit an image based on a text prompt.
        
        Args:
            image: Input image as bytes, file path, or PIL Image
            prompt: Text prompt describing the desired changes
            mask: Optional mask image for inpainting (white=edit, black=keep)
            **kwargs: Additional model-specific parameters
            
        Returns:
            ImageGenerationResponse with the edited image
        """
        raise NotImplementedError("This model does not support image editing")


class Flux1(BaseVisualModel):
    """Stability AI's Flux 1.0 for high-quality image generation."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the Flux 1.0 API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    def _get_supported_sizes(self) -> List[Tuple[int, int]]:
        """Get list of supported image sizes for Flux 1.0."""
        return [
            (1024, 1024), (1152, 896), (896, 1152), 
            (1216, 832), (1344, 768), (768, 1344), 
            (1536, 640), (640, 1536)
        ]
    
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = None,
        height: int = None,
        num_images: int = 1,
        guidance_scale: float = 7.5,
        steps: int = 30,
        seed: Optional[int] = None,
        **kwargs
    ) -> ImageGenerationResponse:
        """Generate an image using Flux 1.0."""
        # Set default size if not specified
        width = width or self.default_size[0]
        height = height or self.default_size[1]
        
        # Validate and adjust dimensions
        width, height = self.validate_size(width, height)
        
        # Prepare the request payload
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "num_inference_steps": steps,
            "guidance_scale": guidance_scale,
            "num_images_per_prompt": min(max(1, num_images), 4),  # Clamp to 1-4
            "seed": seed or int(time.time() * 1000) % 2**32,
            **kwargs
        }
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # Get the function ID for this model
            function_id = await self._get_function_id(session, "flux-1")
            
            # Call the function
            call_url = f"{self.base_url.rstrip('/')}/{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                result = await response.json()
                
                # Process the response to extract images
                images = []
                
                # Handle different response formats
                if 'images' in result and isinstance(result['images'], list):
                    # Direct array of base64 images
                    for img_str in result['images']:
                        if isinstance(img_str, str) and img_str.startswith('data:image/'):
                            # Handle data URL format
                            img_str = img_str.split(',', 1)[1]
                        images.append(base64.b64decode(img_str))
                elif 'data' in result and isinstance(result['data'], list):
                    # Array of image objects with base64 data
                    for img_obj in result['data']:
                        if 'b64_json' in img_obj:
                            images.append(base64.b64decode(img_obj['b64_json']))
                else:
                    # Try to find base64 data in the response
                    import re
                    img_matches = re.findall(r'data:image/\w+;base64,([a-zA-Z0-9+/=]+)', str(result))
                    if img_matches:
                        images = [base64.b64decode(match) for match in img_matches]
                    else:
                        raise ValueError("Could not find image data in API response")
                
                if not images:
                    raise ValueError("No images were generated")
                
                return ImageGenerationResponse(
                    content="",  # No text content for image generation
                    model=self.model_name,
                    images=images,
                    size=(width, height),
                    seed=seed,
                    metadata={
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "width": width,
                        "height": height,
                        "seed": seed,
                        "num_images": len(images),
                        "model": self.model_name,
                        "raw_response": result
                    }
                )
                
        except Exception as e:
            logger.error(f"Error generating image with {self.model_name}: {e}", exc_info=True)
            raise
    
    async def upscale_image(
        self,
        image: Union[bytes, str, Image.Image],
        scale_factor: float = 2.0,
        **kwargs
    ) -> ImageGenerationResponse:
        """Upscale an image using Flux 1.0's upscaling capabilities."""
        # Convert input to PIL Image if needed
        if isinstance(image, (str, Path)):
            image = Image.open(image)
        elif isinstance(image, bytes):
            image = Image.open(io.BytesIO(image))
        """Generate an image from a text prompt (for compatibility with BaseModel).
        
        Args:
            prompt: Text prompt describing the desired image
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the generated image and metadata
        """
        response = await self.generate_image(prompt, **kwargs)
        
        # Convert the first image to base64 for the response
        image_base64 = base64.b64encode(response.images[0]).decode('utf-8') if response.images else ""
        
        return ModelResponse(
            content=image_base64,
            model=self.model_name,
            metadata={
                "model": self.model_name,
                "prompt": prompt,
                "num_images": len(response.images),
                "content_type": "image/png"
            }
        )


class Bria23(BaseModel):
    """BRIA 2.3 for high-quality image generation and editing."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the BRIA 2.3 API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs
    ) -> ImageGenerationResponse:
        """Generate an image using BRIA 2.3.
        
        Args:
            prompt: Text prompt describing the desired image
            negative_prompt: Text describing what should not be in the image
            width: Width of the generated image (pixels)
            height: Height of the generated image (pixels)
            num_images: Number of images to generate
            **kwargs: Additional model-specific parameters
            
        Returns:
            ImageGenerationResponse containing the generated images and metadata
        """
        # Prepare the request payload
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "num_images": num_images,
            **kwargs
        }
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # First, get the function ID for BRIA 2.3
            list_url = f"{self.base_url}?name=bria-2.3"
            async with session.get(list_url) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to get BRIA 2.3 function ID: {error_text}")
                
                functions = await response.json()
                if not functions.get('functions'):
                    raise Exception("No BRIA 2.3 function found")
                
                function_id = functions['functions'][0]['id']
            
            # Now call the function
            call_url = f"{self.base_url}{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                result = await response.json()
                
                # Extract the base64-encoded images from the response
                images_data = result.get('images', [])
                images = []
                
                for img_data in images_data:
                    if isinstance(img_data, str):
                        # Handle base64-encoded image
                        img_bytes = base64.b64decode(img_data)
                        images.append(img_bytes)
                
                return ImageGenerationResponse(
                    images=images,
                    model=self.model_name,
                    metadata={
                        "model": self.model_name,
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "dimensions": f"{width}x{height}",
                        "num_images": len(images)
                    }
                )
                
        except Exception as e:
            logger.error(f"Error generating image with BRIA 2.3: {e}")
            raise
    
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> ModelResponse:
        """Generate an image from a text prompt.
        
        Args:
            prompt: Text prompt describing the desired image
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the generated image and metadata
        """
        response = await self.generate_image(prompt, **kwargs)
        
        # Convert the first image to base64 for the response
        image_base64 = base64.b64encode(response.images[0]).decode('utf-8') if response.images else ""
        
        return ModelResponse(
            content=image_base64,
            model=self.model_name,
            metadata={
                "model": self.model_name,
                "prompt": prompt,
                "num_images": len(response.images),
                "content_type": "image/png"
            }
        )
