"""
Retrieval models for embeddings and search.

This module provides implementations of retrieval models for creating embeddings
and performing similarity search.
"""

from typing import List, Dict, Any, Optional, Union
import aiohttp
import numpy as np
from dataclasses import dataclass
from enum import Enum
from .. import BaseModel

class RetrievalType(str, Enum):
    """Types of retrieval methods supported."""
    DENSE = "dense"
    SPARSE = "sparse"
    HYBRID = "hybrid"
    RERANK = "rerank"

@dataclass
class Document:
    """A document with text, optional metadata, and an optional embedding/score."""
    text: str
    metadata: Optional[Dict[str, Any]] = None
    embedding: Optional[List[float]] = None
    score: Optional[float] = None

class RetrievalModel(BaseModel):
    """Base class for retrieval models (embeddings, search, etc.)."""
    
    def __init__(self, model_name: str, api_key: str = None, **kwargs):
        """Initialize the retrieval model.
        
        Args:
            model_name: Name of the model as specified in the NIM API
            api_key: Optional API key. If not provided, uses NVIDIA_API_KEY from .env
            **kwargs: Optional config such as retrieval_type, chunk_size, chunk_overlap
        """
        super().__init__(model_name, api_key)
        self.embedding_endpoint = "embeddings"
        # Accept optional params for compatibility with specialized subclasses
        self.retrieval_type: Optional[RetrievalType] = kwargs.get("retrieval_type")
        self.chunk_size: Optional[int] = kwargs.get("chunk_size")
        self.chunk_overlap: Optional[int] = kwargs.get("chunk_overlap")
    
    async def get_embeddings(
        self,
        texts: Union[str, List[str]],
        **kwargs
    ) -> List[Document]:
        """Get embeddings for the input text(s) and return Document objects.
        
        Args:
            texts: Single text string or list of text strings to embed
            **kwargs: Additional parameters to pass to the API
            
        Returns:
            List of Document with the embedding vector attached
        """
        # Normalize to list of strings and parallel list of Document objects
        single_input = False
        if isinstance(texts, str):
            single_input = True
            texts = [texts]
        documents: List[Document] = [Document(text=t) for t in texts]
        
        url = self._build_api_url(self.embedding_endpoint)
        
        payload = {
            "input": [d.text for d in documents],
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
                
                # Handle different response formats and attach to documents
                embeddings: List[Optional[List[float]]] = [None] * len(documents)
                if isinstance(result, dict) and 'data' in result:
                    for item in result['data']:
                        if 'index' in item and 'embedding' in item:
                            embeddings[item['index']] = item['embedding']
                elif isinstance(result, list):
                    # Assume list is in order
                    for idx, emb in enumerate(result):
                        if idx < len(embeddings):
                            embeddings[idx] = emb
                else:
                    raise ValueError("Unexpected response format from embeddings API")
                
                for doc, emb in zip(documents, embeddings):
                    doc.embedding = emb
                
                return documents
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))

# Pre-configured model instances
class NVEmbedV1(RetrievalModel):
    """NVIDIA's general-purpose embedding model."""
    def __init__(self, api_key: str = None):
        super().__init__("nvidia/nv-embed-v1", api_key)

class NVEmbedCode7B(RetrievalModel):
    """NVIDIA's code-specific embedding model."""
    def __init__(self, api_key: str = None):
        super().__init__("nvidia/nv-embedcode-7b-v1", api_key)

class BGE3(RetrievalModel):
    """BAAI's BGE-M3 embedding model."""
    def __init__(self, api_key: str = None):
        super().__init__("baai/bge-m3", api_key)
        # BGE-M3 might have different endpoint or parameters
        self.embedding_endpoint = "infer"
