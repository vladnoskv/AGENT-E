"""
Retrieval models for AGENT-X.

This module contains implementations of various retrieval models that can be used
with the AGENT-X system, including embedding models and retrievers.
"""

from typing import List, Dict, Any, Optional, Union, Tuple, AsyncGenerator
import base64
import json
import logging
import numpy as np
import time
from dataclasses import dataclass, field
from enum import Enum

import aiohttp
import numpy.typing as npt

from ..models.base import BaseModel, ModelResponse

logger = logging.getLogger(__name__)

class DistanceMetric(str, Enum):
    """Distance metrics for vector similarity."""
    COSINE = "cosine"
    EUCLIDEAN = "euclidean"
    DOT_PRODUCT = "dot"
    MANHATTAN = "manhattan"

@dataclass
class SearchResult:
    """A single search result from a vector database query."""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float
    embedding: Optional[npt.NDArray] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the result to a dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "metadata": self.metadata,
            "score": self.score,
            "embedding": self.embedding.tolist() if self.embedding is not None else None
        }

@dataclass
class SearchResponse(ModelResponse):
    """Response format for vector search operations."""
    results: List[SearchResult] = field(default_factory=list)
    total_results: int = 0
    query_vector: Optional[npt.NDArray] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the response to a dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            "results": [r.to_dict() for r in self.results],
            "total_results": self.total_results,
            "query_vector": self.query_vector.tolist() if self.query_vector is not None else None
        })
        return base_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SearchResponse':
        """Create a response from a dictionary."""
        results = [
            SearchResult(
                id=r.get("id", ""),
                content=r.get("content", ""),
                metadata=r.get("metadata", {}),
                score=r.get("score", 0.0),
                embedding=np.array(r["embedding"]) if "embedding" in r and r["embedding"] is not None else None
            )
            for r in data.get("results", [])
        ]
        
        query_vector = data.get("query_vector")
        if query_vector is not None:
            query_vector = np.array(query_vector)
        
        return cls(
            content="",  # Base class requires content
            model=data.get("model", ""),
            results=results,
            total_results=data.get("total_results", 0),
            query_vector=query_vector,
            metadata=data.get("metadata", {})
        )


class BaseRetrievalModel(BaseModel):
    """Base class for all retrieval models."""
    
    def __init__(
        self,
        model_name: str,
        api_key: str = None,
        base_url: str = None,
        **kwargs
    ):
        """Initialize the base retrieval model.
        
        Args:
            model_name: Name of the model
            api_key: API key for authentication
            base_url: Base URL for the API
            **kwargs: Additional model-specific arguments
        """
        super().__init__(model_name, api_key, base_url, **kwargs)
        self.embedding_dimension = kwargs.get("embedding_dimension", 1024)
        self.max_batch_size = kwargs.get("max_batch_size", 32)
    
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
    
    async def generate_embeddings(
        self,
        texts: Union[str, List[str]],
        **kwargs
    ) -> ModelResponse:
        """Generate embeddings for the input text(s).
        
        Args:
            texts: A single text or list of texts to embed
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the embeddings and metadata
        """
        raise NotImplementedError("Subclasses must implement generate_embeddings()")
    
    async def search(
        self,
        query: str,
        vectors: List[npt.NDArray],
        texts: List[str],
        metadata: Optional[List[Dict[str, Any]]] = None,
        top_k: int = 5,
        min_score: float = 0.0,
        **kwargs
    ) -> SearchResponse:
        """Search for similar vectors using the query.
        
        Args:
            query: The search query
            vectors: List of vectors to search against
            texts: List of texts corresponding to the vectors
            metadata: Optional list of metadata dicts for each vector
            top_k: Number of results to return
            min_score: Minimum similarity score (0-1)
            **kwargs: Additional search parameters
            
        Returns:
            SearchResponse with the search results
        """
        # Generate query embedding
        embedding_response = await self.generate_embeddings(query, **kwargs)
        query_embedding = np.array(embedding_response.content)
        
        # Calculate similarities
        similarities = []
        for vec in vectors:
            vec = np.array(vec)
            if query_embedding.shape != vec.shape:
                logger.warning(f"Shape mismatch: query {query_embedding.shape} vs vector {vec.shape}")
                continue
                
            # Cosine similarity
            norm_q = np.linalg.norm(query_embedding)
            norm_v = np.linalg.norm(vec)
            if norm_q == 0 or norm_v == 0:
                similarity = 0.0
            else:
                similarity = np.dot(query_embedding, vec) / (norm_q * norm_v)
            
            similarities.append(similarity)
        
        # Get top-k results
        indices = np.argsort(similarities)[::-1][:top_k]
        
        # Prepare results
        results = []
        for idx in indices:
            if similarities[idx] < min_score:
                continue
                
            result = SearchResult(
                id=str(idx),
                content=texts[idx],
                metadata=metadata[idx] if metadata and idx < len(metadata) else {},
                score=float(similarities[idx]),
                embedding=vectors[idx] if idx < len(vectors) else None
            )
            results.append(result)
        
        return SearchResponse(
            content=query,
            model=self.model_name,
            results=results,
            total_results=len(results),
            query_vector=query_embedding,
            metadata={
                "top_k": top_k,
                "min_score": min_score,
                **kwargs
            }
        )
    
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> ModelResponse:
        """Generate embeddings for a single text (for compatibility with BaseModel).
        
        Args:
            prompt: The text to embed
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the embedding and metadata
        """
        return await self.generate_embeddings(prompt, **kwargs)

class NVEmbedV1(BaseRetrievalModel):
    """NVIDIA's general-purpose embedding model."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.embedding_dimension = 1024  # NV-Embed-v1 uses 1024-dimensional vectors
        self.max_batch_size = 32
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the NV Embed V1 API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def generate_embeddings(
        self,
        texts: Union[str, List[str]],
        **kwargs
    ) -> ModelResponse:
        """Generate embeddings for the input text(s)."""
        if isinstance(texts, str):
            texts = [texts]
        
        # Process in batches to avoid hitting API limits
        batch_size = min(kwargs.pop('batch_size', self.max_batch_size), self.max_batch_size)
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Prepare the request payload
            payload = {
                "input": batch,
                "model": "NV-Embed-v1",
                **kwargs
            }
            
            # Make the API request
            session = await self.ensure_session()
            
            try:
                # Get the function ID for NV Embed V1
                function_id = await self._get_function_id(session, "nv-embed-v1")
                
                # Call the function
                call_url = f"{self.base_url.rstrip('/')}/{function_id}"
                async with session.post(call_url, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"API request failed: {error_text}")
                    
                    result = await response.json()
                    
                    # Extract the embeddings from the response
                    if 'data' in result and isinstance(result['data'], list):
                        batch_embeddings = [item.get('embedding', []) for item in result['data']]
                        all_embeddings.extend(batch_embeddings)
                    elif 'embeddings' in result and isinstance(result['embeddings'], list):
                        all_embeddings.extend(result['embeddings'])
                    else:
                        logger.warning(f"Unexpected response format: {result.keys()}")
                        # Try to extract embeddings from the first level
                        if 'embedding' in result:
                            all_embeddings.append(result['embedding'])
                        else:
                            raise ValueError("Could not find embeddings in API response")
            
            except Exception as e:
                logger.error(f"Error in batch {i//batch_size + 1}: {e}", exc_info=True)
                raise
        
        # If we only have one text and one embedding, return it directly
        if len(all_embeddings) == 1 and len(texts) == 1:
            embeddings = all_embeddings[0]
        else:
            embeddings = all_embeddings
        
        return ModelResponse(
            content=embeddings,
            model=self.model_name,
            metadata={
                "model": self.model_name,
                "num_texts": len(texts),
                "embedding_dim": self.embedding_dimension,
                "batch_size": batch_size
            }
        )


class BGEV1_5(BaseRetrievalModel):
    """BAAI BGE v1.5 embedding model."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.embedding_dimension = 1024  # BGE v1.5 uses 1024-dimensional vectors
        self.max_batch_size = 16  # BGE has a smaller context window
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the BGE v1.5 API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def generate_embeddings(
        self,
        texts: Union[str, List[str]],
        **kwargs
    ) -> ModelResponse:
        """Generate embeddings using BGE v1.5."""
        if isinstance(texts, str):
            texts = [texts]
        
        # BGE v1.5 expects a specific instruction for retrieval
        instruction = "Represent this sentence for searching relevant passages: "
        formatted_texts = [f"{instruction}{text}" for text in texts]
        
        # Process in batches
        batch_size = min(kwargs.pop('batch_size', self.max_batch_size), self.max_batch_size)
        all_embeddings = []
        
        for i in range(0, len(formatted_texts), batch_size):
            batch = formatted_texts[i:i + batch_size]
            
            # Prepare the request payload
            payload = {
                "input": batch,
                "model": "BAAI/bge-large-en-v1.5",
                **kwargs
            }
            
            # Make the API request
            session = await self.ensure_session()
            
            try:
                # Get the function ID for BGE v1.5
                function_id = await self._get_function_id(session, "bge-large-en-v1.5")
                
                # Call the function
                call_url = f"{self.base_url.rstrip('/')}/{function_id}"
                async with session.post(call_url, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"API request failed: {error_text}")
                    
                    result = await response.json()
                    
                    # Extract the embeddings from the response
                    if 'data' in result and isinstance(result['data'], list):
                        batch_embeddings = [item.get('embedding', []) for item in result['data']]
                        all_embeddings.extend(batch_embeddings)
                    elif 'embeddings' in result and isinstance(result['embeddings'], list):
                        all_embeddings.extend(result['embeddings'])
                    else:
                        logger.warning(f"Unexpected response format: {result.keys()}")
                        # Try to extract embeddings from the first level
                        if 'embedding' in result:
                            all_embeddings.append(result['embedding'])
                        else:
                            raise ValueError("Could not find embeddings in API response")
            
            except Exception as e:
                logger.error(f"Error in batch {i//batch_size + 1}: {e}", exc_info=True)
                raise
        
        # If we only have one text and one embedding, return it directly
        if len(all_embeddings) == 1 and len(texts) == 1:
            embeddings = all_embeddings[0]
        else:
            embeddings = all_embeddings
        
        return ModelResponse(
            content=embeddings,
            model=self.model_name,
            metadata={
                "model": self.model_name,
                "num_texts": len(texts),
                "embedding_dim": self.embedding_dimension,
                "batch_size": batch_size
            }
        )


class SnowflakeArcticEmbed(BaseRetrievalModel):
    """Snowflake's Arctic Embed model for retrieval and RAG."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.embedding_dimension = 1024  # Snowflake Arctic Embed uses 1024-dimensional vectors
        self.max_batch_size = 32
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the Snowflake Arctic Embed API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def generate_embeddings(
        self,
        texts: Union[str, List[str]],
        **kwargs
    ) -> ModelResponse:
        """Generate embeddings using Snowflake Arctic Embed."""
        if isinstance(texts, str):
            texts = [texts]
        
        # Process in batches
        batch_size = min(kwargs.pop('batch_size', self.max_batch_size), self.max_batch_size)
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Prepare the request payload
            payload = {
                "input": batch,
                "model": "Snowflake/arctic-embed-l",
                **kwargs
            }
            
            # Make the API request
            session = await self.ensure_session()
            
            try:
                # Get the function ID for Snowflake Arctic Embed
                function_id = await self._get_function_id(session, "snowflake-arctic-embed-l")
                
                # Call the function
                call_url = f"{self.base_url.rstrip('/')}/{function_id}"
                async with session.post(call_url, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"API request failed: {error_text}")
                    
                    result = await response.json()
                    
                    # Extract the embeddings from the response
                    if 'data' in result and isinstance(result['data'], list):
                        batch_embeddings = [item.get('embedding', []) for item in result['data']]
                        all_embeddings.extend(batch_embeddings)
                    elif 'embeddings' in result and isinstance(result['embeddings'], list):
                        all_embeddings.extend(result['embeddings'])
                    else:
                        logger.warning(f"Unexpected response format: {result.keys()}")
                        # Try to extract embeddings from the first level
                        if 'embedding' in result:
                            all_embeddings.append(result['embedding'])
                        else:
                            raise ValueError("Could not find embeddings in API response")
            
            except Exception as e:
                logger.error(f"Error in batch {i//batch_size + 1}: {e}", exc_info=True)
                raise
        
        # If we only have one text and one embedding, return it directly
        if len(all_embeddings) == 1 and len(texts) == 1:
            embeddings = all_embeddings[0]
        else:
            embeddings = all_embeddings
        
        return ModelResponse(
            content=embeddings,
            model=self.model_name,
            metadata={
                "model": self.model_name,
                "num_texts": len(texts),
                "embedding_dim": self.embedding_dimension,
                "batch_size": batch_size
            }
        )


# Model class mapping for dynamic loading
MODEL_CLASSES = {
    'nv-embed-v1': NVEmbedV1,
    'bge-large-en-v1.5': BGEV1_5,
    'snowflake-arctic-embed-l': SnowflakeArcticEmbed,
}

def get_retrieval_model_class(model_name: str) -> type[BaseRetrievalModel]:
    """Get the appropriate retrieval model class for the given model name."""
    model_id = model_name.lower()
    for key, cls in MODEL_CLASSES.items():
        if key in model_id:
            return cls
    return NVEmbedV1  # Default fallback


class NVEmbedCode7B(BaseModel):
    """NVIDIA's code-specific embedding model."""
    
    def get_default_base_url(self) -> str:
        """Get the default base URL for the NV Embed Code 7B API."""
        return "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/"
    
    async def generate_embeddings(
        self,
        texts: Union[str, List[str]],
        **kwargs
    ) -> ModelResponse:
        """Generate code embeddings for the input text(s).
        
        Args:
            texts: A single code snippet or list of code snippets to embed
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the code embeddings and metadata
        """
        if isinstance(texts, str):
            texts = [texts]
        
        # Prepare the request payload
        payload = {
            "input": texts,
            "model": "NV-Embed-Code-7B",
            **kwargs
        }
        
        # Make the API request
        session = await self.ensure_session()
        
        try:
            # First, get the function ID for NV Embed Code 7B
            list_url = f"{self.base_url}?name=nv-embed-code-7b"
            async with session.get(list_url) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to get NV Embed Code 7B function ID: {error_text}")
                
                functions = await response.json()
                if not functions.get('functions'):
                    raise Exception("No NV Embed Code 7B function found")
                
                function_id = functions['functions'][0]['id']
            
            # Now call the function
            call_url = f"{self.base_url}{function_id}"
            async with session.post(call_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"API request failed: {error_text}")
                
                result = await response.json()
                
                # Extract the embeddings from the response
                # Note: The actual structure might need adjustment based on the API response
                embeddings = result.get('data', [{}])[0].get('embedding', [])
                
                return ModelResponse(
                    content=embeddings,
                    model=self.model_name,
                    metadata={
                        "model": self.model_name,
                        "num_texts": len(texts),
                        "embedding_dim": len(embeddings[0]) if embeddings and isinstance(embeddings[0], list) else None
                    }
                )
                
        except Exception as e:
            logger.error(f"Error generating code embeddings with NV Embed Code 7B: {e}")
            raise
    
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> ModelResponse:
        """Generate code embeddings for a single code snippet.
        
        Args:
            prompt: The code snippet to embed
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelResponse containing the code embeddings and metadata
        """
        return await self.generate_embeddings(prompt, **kwargs)
