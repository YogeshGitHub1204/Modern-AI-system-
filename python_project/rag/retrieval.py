"""
================================================================================
CONCEPT: Vector Retrieval & Nearest-Neighbor Search (Runtime RAG)
--------------------------------------------------------------------------------
During runtime inference, when an agent requires factual grounding:
1. The user query is passed to the embedding model to produce a query vector $\vec{q}$.
2. The query vector is transmitted to the Pinecone index.
3. Pinecone conducts an Approximate Nearest Neighbor (ANN) search across all
   stored document chunk vectors, computing cosine similarity:
   $$\text{sim}(\vec{q}, \vec{d}_i) = \frac{\vec{q} \cdot \vec{d}_i}{\|\vec{q}\| \|\vec{d}_i\|}$$
4. The top $K$ most similar chunks (e.g. $K=3$) are returned with their text
   payloads and similarity scores.
5. These passages are injected directly into the LLM prompt, grounding the
   answer in proprietary truth and eliminating hallucinations.
================================================================================
"""

import math
import logging
from typing import List, Dict, Any

from config import config
from .embeddings import get_embedding
from .ingestion import get_pinecone_client, ensure_pinecone_index, _IN_MEMORY_VECTOR_STORE, ingest_knowledge_base

logger = logging.getLogger("ai_systems.retrieval")


def query_vector_index(query: str, top_k: int = 3, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
    """
    RAG Retrieval Pipeline:
    Embeds the user query, performs vector search against Pinecone, and returns ranked passages.
    """
    logger.info(f"[Retrieval] Embedding runtime query: '{query}'")

    # Step 1: Query Vector Generation
    # RAG: this embeds the user query for vector similarity search
    query_vector = get_embedding(query)

    # Step 2: Attempt Search on Remote Pinecone Index
    pc = get_pinecone_client()
    if pc is not None:
        try:
            # Index Connection: Connect to the remote Pinecone serverless index
            index = ensure_pinecone_index(pc)

            # Vector Search: Query index for nearest neighbors by cosine similarity
            search_response = index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
            )

            results: List[Dict[str, Any]] = []
            for match in search_response.get("matches", []):
                score = match.get("score", 0.0)
                if score >= score_threshold:
                    meta = match.get("metadata", {})
                    # Metadata Extraction: Retrieve original text payload stored with vector
                    results.append({
                        "id": match.get("id"),
                        "score": round(float(score), 4),
                        "text": meta.get("text", ""),
                        "metadata": {k: v for k, v in meta.items() if k != "text"},
                    })

            if results:
                logger.info(f"[Pinecone] Retrieved {len(results)} chunks for query.")
                return results

        except Exception as exc:
            logger.warning(f"[Pinecone] Remote query failed ({exc}). Falling back to local store.")

    # Step 3: In-Memory Cosine Similarity Fallback
    # Auto-seed in-memory store if empty so out-of-the-box runs always succeed
    if not _IN_MEMORY_VECTOR_STORE:
        logger.info("[InMemoryRAG] Index empty. Seeding sample enterprise knowledge base...")
        ingest_knowledge_base()

    # Exact Cosine Similarity Calculation across local vectors
    scored_items: List[tuple[float, Dict[str, Any]]] = []
    for item_id, doc in _IN_MEMORY_VECTOR_STORE.items():
        doc_vec = doc["values"]
        # Dot Product calculation: sum(q_i * d_i)
        dot_product = sum(q * d for q, d in zip(query_vector, doc_vec))
        # Norms calculation
        norm_q = math.sqrt(sum(q * q for q in query_vector))
        norm_d = math.sqrt(sum(d * d for d in doc_vec))
        
        # Cosine Similarity Formula
        similarity = dot_product / (norm_q * norm_d) if (norm_q * norm_d) > 0 else 0.0

        if similarity >= score_threshold:
            scored_items.append((similarity, doc))

    # Ranking: Sort candidate documents by descending similarity score
    scored_items.sort(key=lambda x: x[0], reverse=True)

    # Top-K Slicing: Return the top K closest passages
    top_items = scored_items[:top_k]

    results = []
    for score, doc in top_items:
        results.append({
            "id": doc["id"],
            "score": round(float(score), 4),
            "text": doc["text"],
            "metadata": doc["metadata"],
        })

    logger.info(f"[InMemoryRAG] Retrieved {len(results)} nearest neighbor chunks.")
    return results
