"""
================================================================================
CONCEPT: Centralized Configuration Management
--------------------------------------------------------------------------------
In modern distributed AI applications, configuration parameters—such as local
LLM model tags, vector database credentials, and service ports—must be cleanly
decoupled from business logic. This module loads environment variables from a
.env file into a strongly-typed settings object, ensuring configuration can be
swapped dynamically between development, testing, and production environments
without modifying any core agent code.
================================================================================
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Environment Loading: Read key-value pairs from a local .env file into os.environ
load_dotenv()


class AppConfig:
    """Strongly typed application configuration container."""

    def __init__(self) -> None:
        # Configurable LLM: Model identifier passed directly to the local Ollama runtime
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.2")

        # Local LLM Endpoint: Network address where the local Ollama daemon serves API requests
        self.ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

        # Embedding Model: Name of the vector embedding model used for RAG text transformation
        self.ollama_embed_model: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

        # Vector Store Authentication: Secret API key required to connect to the Pinecone service
        self.pinecone_api_key: Optional[str] = os.getenv("PINECONE_API_KEY", None)

        # Vector Index Namespace: Logical index name in Pinecone hosting the vectorized document chunks
        self.pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "ai-systems-knowledge-base")

        # Pinecone Cloud Region: Cloud deployment zone for the vector database index
        self.pinecone_environment: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")

        # Vector Dimensionality: The vector length produced by the chosen embedding model
        self.pinecone_dimension: int = int(os.getenv("PINECONE_DIMENSION", "768"))

        # Vector Metric: Mathematical distance metric used for similarity search (cosine similarity)
        self.pinecone_metric: str = os.getenv("PINECONE_METRIC", "cosine")

        # Web Server Binding: Host IP address and port for the FastAPI web application
        self.web_host: str = os.getenv("WEB_HOST", "0.0.0.0")
        self.web_port: int = int(os.getenv("WEB_PORT", "8000"))
        self.debug: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

        # MCP Configuration: Host, port, and transport protocol (stdio or sse) for the MCP server
        self.mcp_host: str = os.getenv("MCP_HOST", "127.0.0.1")
        self.mcp_port: int = int(os.getenv("MCP_PORT", "8080"))
        self.mcp_transport: str = os.getenv("MCP_TRANSPORT", "stdio")

    def has_pinecone_key(self) -> bool:
        """Helper to determine whether real Pinecone credentials are provided."""
        # Conditional Hardware Check: Validates non-empty API credentials before remote connection
        return bool(self.pinecone_api_key and self.pinecone_api_key.strip() and self.pinecone_api_key != "your_pinecone_api_key_here")


# Singleton Instance: Shared configuration object accessible across all agent and RAG modules
config = AppConfig()
