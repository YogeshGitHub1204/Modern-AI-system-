"""
================================================================================
CONCEPT: Vector Ingestion Pipeline with Pinecone
--------------------------------------------------------------------------------
The ingestion pipeline is the offline phase of Retrieval-Augmented Generation.
In this stage:
1. Raw internal documents (policies, manuals, knowledge bases) are loaded.
2. Documents are divided into discrete chunks by the chunker.
3. Each chunk is passed to an embedding model to compute its vector representation.
4. The vectors, along with unique IDs and metadata payloads (source, text, tags),
   are upserted into a Pinecone vector index.

This equips the system with company-specific knowledge that did not exist
during the local LLM's pre-training phase, eliminating hallucinations without
requiring expensive model fine-tuning.
================================================================================
"""

import logging
from typing import List, Dict, Any, Optional
from config import config
from .chunking import chunk_document, DocumentChunk
from .embeddings import get_embeddings_batch

logger = logging.getLogger("ai_systems.ingestion")

# Sample Enterprise Knowledge Base: Internal documents beyond the model's training data
SAMPLE_KNOWLEDGE_DOCUMENTS = [
    {
        "title": "Corporate Refund & Customer SLA Policy (2026 Edition)",
        "content": (
            "Apex Systems provides a 30-day no-questions-asked refund policy on all enterprise software licenses. "
            "To qualify for a tier-1 expedited refund, customers must submit ticket category 'BILLING-REFUND-EXP' "
            "via the customer portal. Refunds are credited back to the original payment method within 3 to 5 business days. "
            "For enterprise annual agreements exceeding $50,000, refunds are pro-rated to the calendar month of termination, "
            "and require sign-off from the dedicated Technical Account Manager (TAM). "
            "Software license keys will be revoked 24 hours after refund authorization."
        ),
        "source": "knowledge_base/policies/refund_sla_2026.md",
        "category": "Customer Support",
    },
    {
        "title": "Multi-Agent System Architecture Specification (v3.4)",
        "content": (
            "The Apex AI System architecture is divided into three primary layers: "
            "1. The Routing Layer (RouterAgent): Evaluates incoming query intent and selects execution branch. "
            "2. The Factual Grounding Layer (ResearcherAgent): Connects to the Pinecone vector index for internal "
            "RAG retrieval and live real-time tools for dynamic web data. "
            "3. The Synthesis Layer (ResponderAgent): Formulates the final grounded answer using the local Ollama LLM. "
            "State is coordinated through LangGraph's StateGraph to ensure deterministic state transitions and full audit trails."
        ),
        "source": "knowledge_base/engineering/multi_agent_spec_v3.4.md",
        "category": "Engineering",
    },
    {
        "title": "Enterprise Cloud Security & Model Isolation Guidelines",
        "content": (
            "All model weights must execute in zero-egress hardware enclaves using Ollama. "
            "Sensitive corporate data must never be transmitted to public cloud LLM endpoints. "
            "Vector databases (Pinecone) must be configured with TLS 1.3 encryption in transit and AES-256 at rest. "
            "API keys must be injected strictly via environment variables (PINECONE_API_KEY) and never checked into source control. "
            "All model inferences and retrieval traces are logged to the internal compliance audit database."
        ),
        "source": "knowledge_base/security/cloud_isolation_sop.md",
        "category": "Compliance",
    },
]

# In-Memory Fallback Vector Store: Ensures offline study works without an active Pinecone subscription
_IN_MEMORY_VECTOR_STORE: Dict[str, Dict[str, Any]] = {}


def get_pinecone_client() -> Optional[Any]:
    """
    Pinecone Client Authentication:
    Initializes the remote Pinecone client using the API key loaded from environment variables.
    """
    # Environment Check: Verifies that PINECONE_API_KEY is present
    if not config.has_pinecone_key():
        logger.info("[Pinecone] No PINECONE_API_KEY configured. Utilizing in-memory vector store.")
        return None

    try:
        # Pinecone SDK: Import the modern pinecone client
        from pinecone import Pinecone

        # Authentication: Instantiate client using environment credentials
        pc = Pinecone(api_key=config.pinecone_api_key)
        return pc
    except Exception as exc:
        logger.warning(f"[Pinecone] Initialization error ({exc}). Falling back to in-memory store.")
        return None


def ensure_pinecone_index(pc: Any) -> Any:
    """
    Index Lifecycle Management:
    Checks if the target index exists in Pinecone; if not, provisions a new serverless index.
    """
    from pinecone import ServerlessSpec

    index_name = config.pinecone_index_name
    dimension = config.pinecone_dimension
    metric = config.pinecone_metric

    # Introspection: List currently provisioned indexes in Pinecone account
    existing_indexes = [idx["name"] for idx in pc.list_indexes()]

    if index_name not in existing_indexes:
        logger.info(f"[Pinecone] Creating index '{index_name}' (dim={dimension}, metric={metric})...")
        # Index Provisioning: Create serverless index on AWS with desired distance metric
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric=metric,
            spec=ServerlessSpec(cloud="aws", region=config.pinecone_environment),
        )
    
    # Connection: Return handle to the target index
    return pc.Index(index_name)


def ingest_knowledge_base(documents: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    RAG Ingestion Pipeline:
    Chunks raw documents, generates vector embeddings, and upserts vectors into Pinecone.
    """
    if documents is None:
        documents = SAMPLE_KNOWLEDGE_DOCUMENTS

    logger.info(f"[Ingestion] Starting ingestion for {len(documents)} raw documents...")

    # Step 1: Document Chunking
    all_chunks: List[DocumentChunk] = []
    for doc in documents:
        # Text Splitting: Decompose document into overlapping units with metadata
        chunks = chunk_document(
            text=doc["content"],
            source_name=doc.get("source", "doc.txt"),
            chunk_size=350,
            chunk_overlap=70,
            extra_metadata={
                "title": doc.get("title", "Untitled"),
                "category": doc.get("category", "General"),
            },
        )
        all_chunks.extend(chunks)

    logger.info(f"[Ingestion] Created {len(all_chunks)} chunks from source documents.")

    # Step 2: Batch Vector Embedding Computation
    # Vector Inference: Convert text strings into dense mathematical arrays
    chunk_texts = [c.text for c in all_chunks]
    embeddings = get_embeddings_batch(chunk_texts)

    # Step 3: Upsert into Pinecone Vector Store
    pc = get_pinecone_client()
    upserted_count = 0

    if pc is not None:
        try:
            # Index Handle: Connect to or provision the Pinecone index
            index = ensure_pinecone_index(pc)

            # Pinecone Vector Records: Format tuples of (id, vector, metadata)
            vectors_to_upsert = []
            for chunk, vector in zip(all_chunks, embeddings):
                record = {
                    "id": chunk.chunk_id,
                    "values": vector,
                    "metadata": {
                        **chunk.metadata,
                        "text": chunk.text,
                    },
                }
                vectors_to_upsert.append(record)

            # Batch Upsert: Push vectors to Pinecone in batches of 50
            batch_size = 50
            for i in range(0, len(vectors_to_upsert), batch_size):
                batch = vectors_to_upsert[i : i + batch_size]
                index.upsert(vectors=batch)
                upserted_count += len(batch)

            logger.info(f"[Pinecone] Successfully upserted {upserted_count} vectors to index '{config.pinecone_index_name}'.")

        except Exception as exc:
            logger.error(f"[Pinecone] Remote upsert failed ({exc}). Saving to in-memory store.")
            pc = None

    # Step 4: In-Memory Fallback Update (always maintained for offline resilience)
    for chunk, vector in zip(all_chunks, embeddings):
        _IN_MEMORY_VECTOR_STORE[chunk.chunk_id] = {
            "id": chunk.chunk_id,
            "values": vector,
            "text": chunk.text,
            "metadata": chunk.metadata,
        }
    if pc is None:
        upserted_count = len(all_chunks)
        logger.info(f"[InMemoryRAG] Cached {upserted_count} vectors in memory store.")

    return {
        "status": "success",
        "documents_processed": len(documents),
        "chunks_created": len(all_chunks),
        "vectors_upserted": upserted_count,
        "storage_mode": "pinecone" if pc is not None else "in_memory_fallback",
        "index_name": config.pinecone_index_name,
    }


def get_index_stats() -> Dict[str, Any]:
    """Inspects the vector store and returns record counts and configuration."""
    pc = get_pinecone_client()
    if pc is not None:
        try:
            index = ensure_pinecone_index(pc)
            stats = index.describe_index_stats()
            return {
                "storage_mode": "pinecone",
                "total_vector_count": stats.get("total_vector_count", 0),
                "dimension": stats.get("dimension", config.pinecone_dimension),
                "index_name": config.pinecone_index_name,
            }
        except Exception as exc:
            logger.warning(f"[Pinecone] Stats retrieval failed: {exc}")

    return {
        "storage_mode": "in_memory_fallback",
        "total_vector_count": len(_IN_MEMORY_VECTOR_STORE),
        "dimension": config.pinecone_dimension,
        "index_name": "local-in-memory",
    }
