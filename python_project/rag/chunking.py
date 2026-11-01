"""
================================================================================
CONCEPT: Document Chunking & Text Splitting for Vector Search
--------------------------------------------------------------------------------
Raw documents (PDFs, handbooks, web pages) are too large to embed as single units:
1. Embedding models have fixed token limits (typically 512–8192 tokens).
2. Large documents dilute semantic focus, degrading vector similarity scores.
3. Chunks must overlap (e.g. 10–20%) so sentences split at chunk boundaries do
   not lose semantic continuity.

This module implements recursive character text splitting with metadata
propagation, converting raw text documents into addressable `DocumentChunk` objects.
================================================================================
"""

import uuid
from typing import List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class DocumentChunk:
    """Represents a single chunk of text ready for vector embedding and upsert."""
    # Unique Chunk Identifier: Required by vector databases like Pinecone
    chunk_id: str
    # Text Payload: The discrete segment of text to be converted into an embedding
    text: str
    # Metadata: Contextual tags (source document, category, chunk index) stored alongside vector
    metadata: Dict[str, Any] = field(default_factory=dict)


def chunk_document(
    text: str,
    source_name: str = "document.txt",
    chunk_size: int = 400,
    chunk_overlap: int = 80,
    extra_metadata: Dict[str, Any] = None,
) -> List[DocumentChunk]:
    """
    RAG Chunking Pipeline:
    Splits raw text using recursive separators (paragraphs -> sentences -> words)
    while preserving chunk overlap and attaching contextual metadata.
    """
    if extra_metadata is None:
        extra_metadata = {}

    chunks: List[DocumentChunk] = []
    
    # Recursive Separators: Break first by double newline, then single newline, then space
    paragraphs = text.split("\n\n")
    current_chunk = ""
    chunk_counter = 0

    for paragraph in paragraphs:
        # Paragraph Processing: Check if adding paragraph exceeds desired chunk size
        if len(current_chunk) + len(paragraph) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{paragraph}".strip()
        else:
            if current_chunk:
                # Chunk ID Generation: Unique UUID assigned to each chunk for database primary key
                chunk_id = f"{source_name}_{chunk_counter}_{str(uuid.uuid4())[:8]}"
                
                # Metadata Attachment: Store document source, chunk offset, and character count
                meta = {
                    "source": source_name,
                    "chunk_index": chunk_counter,
                    "char_count": len(current_chunk),
                    **extra_metadata,
                }
                
                # Object Instantiation: Create immutable chunk ready for embedding
                chunks.append(DocumentChunk(chunk_id=chunk_id, text=current_chunk, metadata=meta))
                chunk_counter += 1

                # Chunk Overlap: Retain trailing characters from previous chunk to preserve context
                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                current_chunk = f"{overlap_text}\n\n{paragraph}".strip()
            else:
                # Fallback for oversized single paragraph: Truncate or take slice
                current_chunk = paragraph[:chunk_size]

    # Final Chunk: Append any remaining text buffer
    if current_chunk:
        chunk_id = f"{source_name}_{chunk_counter}_{str(uuid.uuid4())[:8]}"
        meta = {
            "source": source_name,
            "chunk_index": chunk_counter,
            "char_count": len(current_chunk),
            **extra_metadata,
        }
        chunks.append(DocumentChunk(chunk_id=chunk_id, text=current_chunk, metadata=meta))

    return chunks
