"""
================================================================================
CONCEPT: Retrieval-Augmented Generation (RAG) Package
--------------------------------------------------------------------------------
This package implements the end-to-end RAG pipeline using Pinecone:
1. chunking.py: Splits long documents into discrete, overlapping text units.
2. embeddings.py: Generates high-dimensional vector representations of text.
3. ingestion.py: Initializes the Pinecone vector index and upserts vectors.
4. retrieval.py: Embeds runtime user queries and queries Pinecone for nearest neighbors.
================================================================================
"""

from .chunking import chunk_document, DocumentChunk
from .ingestion import ingest_knowledge_base, get_index_stats
from .retrieval import query_vector_index

__all__ = [
    "chunk_document",
    "DocumentChunk",
    "ingest_knowledge_base",
    "get_index_stats",
    "query_vector_index",
]
