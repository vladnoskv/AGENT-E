"""
Specialized retrieval models from NVIDIA's latest offerings.
"""

from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import numpy as np
import aiohttp
from . import RetrievalModel, Document, RetrievalType

class SpecializedRetrievalModel(RetrievalModel):
    """Base class for specialized retrieval models with advanced capabilities."""
    
    def __init__(
        self,
        model_name: str,
        api_key: str = None,
        retrieval_type: RetrievalType = RetrievalType.DENSE,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        **kwargs
    ):
        super().__init__(
            model_name,
            api_key,
            retrieval_type=retrieval_type,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            **kwargs,
        )
        self.model_config = kwargs

class NemoRetriever(SpecializedRetrievalModel):
    """NVIDIA's NeMo Retriever for hybrid search."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="nvidia/nemo-retriever-1.5b",
            api_key=api_key,
            retrieval_type=RetrievalType.HYBRID,
            **kwargs
        )
        self.dense_endpoint = "dense"
        self.sparse_endpoint = "sparse"
        self.rerank_endpoint = "rerank"

class NemoReranker(SpecializedRetrievalModel):
    """NVIDIA's NeMo Reranker for improving search results."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="nvidia/nemo-reranker-3b",
            api_key=api_key,
            retrieval_type=RetrievalType.RERANK,
            **kwargs
        )

class NemoEmbedQA(SpecializedRetrievalModel):
    """NVIDIA's specialized QA embedding model."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="nvidia/nv-embedqa-1b-v2",
            api_key=api_key,
            retrieval_type=RetrievalType.DENSE,
            **kwargs
        )
        self.embedding_endpoint = "infer"

class NemoRerankQA(SpecializedRetrievalModel):
    """NVIDIA's specialized QA reranker."""
    def __init__(self, api_key: str = None, **kwargs):
        super().__init__(
            model_name="nvidia/nv-rerankqa-1b-v2",
            api_key=api_key,
            retrieval_type=RetrievalType.RERANK,
            **kwargs
        )
        self.rerank_endpoint = "infer"
