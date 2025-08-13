"""
Visual models for image generation and analysis.

This module provides implementations of models for tasks like image generation,
image classification, and other computer vision tasks.
"""

from typing import Dict, Any, List, Optional, Union, BinaryIO
import base64
import io
import aiohttp
from PIL import Image
from .. import BaseModel

class VisualModel(BaseModel):
    """Base class for visual models (image generation, analysis, etc.)."""
    
    def __init__(self, model_name: str, api_key: str = None):
        """Initialize the visual model.
        
        Args:
            model_name: Name of the model as specified in the NIM API
            api_key: Optional API key. If not provided, uses NVIDIA_API_KEY from .env
        """
        super().__init__(model_name, api_key)
        self.inference_endpoint = "infer"
    
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs
    ) -> List[Image.Image]:
        """Generate images from a text prompt.
        
        Args:
            prompt: Text prompt for image generation
            negative_prompt: Text describing what should not be in the image
            width: Width of the generated image in pixels
            height: Height of the generated image in pixels
            num_images: Number of images to generate
            **kwargs: Additional parameters for the model
            
        Returns:
            List of generated PIL Image objects
        """
        url = self._build_api_url(self.inference_endpoint)
        
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "num_images": num_images,
            **kwargs
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers=self.headers,
                json=payload
            ) as response:
                response.raise_for_status()
                result = await response.json()
                
                images = []
                if 'images' in result and isinstance(result['images'], list):
                    for img_data in result['images']:
                        if isinstance(img_data, str):
                            # Handle base64 encoded image
                            img_bytes = base64.b64decode(img_data)
                            img = Image.open(io.BytesIO(img_bytes))
                            images.append(img)
                
                return images
    
    async def analyze_image(
        self,
        image: Union[str, BinaryIO, Image.Image],
        task: str = "caption",
        **kwargs
    ) -> Dict[str, Any]:
        """Analyze an image (captioning, object detection, etc.).
        
        Args:
            image: Image to analyze (can be file path, file-like object, or PIL Image)
            task: Type of analysis to perform (e.g., 'caption', 'detection')
            **kwargs: Additional parameters for the model
            
        Returns:
            Dictionary with analysis results
        """
        url = self._build_api_url(self.inference_endpoint)
        
        # Convert image to base64 if it's a PIL Image or file path
        if isinstance(image, Image.Image):
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            image_data = base64.b64encode(buffered.getvalue()).decode('utf-8')
        elif hasattr(image, 'read'):  # File-like object
            image_data = base64.b64encode(image.read()).decode('utf-8')
        else:  # Assume it's a file path
            with open(image, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
        
        payload = {
            "image": image_data,
            "task": task,
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

# Pre-configured model instances
class Flux1(VisualModel):
    """Black Forest Labs' Flux 1.0 model for image generation."""
    def __init__(self, api_key: str = None):
        super().__init__("black-forest-labs/flux.1-dev", api_key)

class Bria23(VisualModel):
    """BRIA AI's 2.3 model for high-quality image generation."""
    def __init__(self, api_key: str = None):
        super().__init__("briaai/bria-2.3", api_key)

class AIGeneratedImageDetector(VisualModel):
    """Model for detecting AI-generated images."""
    def __init__(self, api_key: str = None):
        super().__init__("hive/ai-generated-image-detection", api_key)
        
    async def is_ai_generated(
        self,
        image: Union[str, BinaryIO, Image.Image],
        threshold: float = 0.5
    ) -> Dict[str, Any]:
        """Check if an image was AI-generated.
        
        Args:
            image: Image to check (can be file path, file-like object, or PIL Image)
            threshold: Confidence threshold for AI detection (0.0 to 1.0)
            
        Returns:
            Dictionary with detection results including 'is_ai_generated' boolean
            and 'confidence' score
        """
        result = await self.analyze_image(image, task="detection")
        
        # Process the result to determine if AI-generated
        is_ai = result.get('score', 0) > threshold
        confidence = result.get('score', 0)
        
        return {
            'is_ai_generated': is_ai,
            'confidence': confidence,
            'raw_result': result
        }
