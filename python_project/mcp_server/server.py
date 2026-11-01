"""
================================================================================
CONCEPT: Model Context Protocol (MCP) Server
--------------------------------------------------------------------------------
The Model Context Protocol (MCP) is an open standard that enables AI models and
client applications (such as Claude Desktop, Cursor IDE, Zed, and external
orchestrators) to securely access:

1. Tools: Functions the remote model can execute (e.g. running our LangGraph
   agent system, querying Pinecone vector store, or checking live weather).
2. Resources: Read-only data endpoints (e.g. documentation, system architecture
   manifests, index health metrics) formatted like URLs (e.g., agent://system/architecture).
3. Prompts: Standardized prompt templates parameterized for end users.

By exposing our multi-agent workflow over MCP, other teams and IDEs can consume
our agent without needing to clone our codebase or understand its internal
LangGraph mechanics.
================================================================================
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import config
from agents.graph import run_agent_workflow
from rag.retrieval import query_vector_index
from rag.ingestion import get_index_stats
from tools.live_data import fetch_live_weather_report

logger = logging.getLogger("ai_systems.mcp_server")

# MCP Server Initialization: Use FastMCP from the official Model Context Protocol SDK
try:
    from mcp.server.fastmcp import FastMCP

    # Server Instance: Creates a named MCP server entity
    mcp = FastMCP(
        "Modern-AI-Systems-Hub",
        dependencies=["langgraph", "langchain-ollama", "pinecone-client"],
    )
    MCP_AVAILABLE = True
except ImportError:
    # Educational Fallback Container when the mcp package is not yet installed
    class DummyMCP:
        def tool(self):
            def decorator(fn):
                return fn
            return decorator

        def resource(self, uri: str):
            def decorator(fn):
                return fn
            return decorator

        def prompt(self):
            def decorator(fn):
                return fn
            return decorator

        def run(self, transport="stdio"):
            print(f"[MCP-Fallback] Running emulated MCP server on transport: {transport}")

    mcp = DummyMCP()
    MCP_AVAILABLE = False


# ==============================================================================
# MCP EXPOSED TOOLS (Callable Remote Functions)
# ==============================================================================

@mcp.tool()
def query_agent_system(question: str) -> str:
    """
    MCP Tool: Runs the full LangGraph multi-agent pipeline (Router -> Researcher -> Responder).
    Accepts a natural language question and returns the synthesized answer along with the audit trail.
    """
    # LangGraph Invocation: Trigger end-to-end multi-agent StateGraph
    result = run_agent_workflow(question=question)

    response_payload = {
        "question": question,
        "answer": result.get("final_response"),
        "route_selected": result.get("route"),
        "agents_involved": result.get("agent_trail"),
        "rag_sources_count": len(result.get("rag_context", [])),
        "live_tools_count": len(result.get("live_data_context", [])),
        "execution_metadata": result.get("metadata"),
    }
    # MCP Protocol Return: Formats result as a structured JSON string
    return json.dumps(response_payload, indent=2)


@mcp.tool()
def search_vector_knowledge_base(query: str, top_k: int = 3) -> str:
    """
    MCP Tool: Performs vector similarity search directly on the Pinecone RAG index.
    Useful for external clients that only need factual retrieval without agent synthesis.
    """
    # Pinecone Query: Retrieve nearest neighbor chunks for the query
    matches = query_vector_index(query=query, top_k=top_k)
    return json.dumps(matches, indent=2)


@mcp.tool()
def get_live_weather(location: str = "San Francisco") -> str:
    """
    MCP Tool: Fetches live real-time weather telemetry from Open-Meteo public API.
    Demonstrates runtime tool invocation over MCP.
    """
    # Tool Execution: Direct call to the live weather fetcher
    return fetch_live_weather_report(location=location)


# ==============================================================================
# MCP EXPOSED RESOURCES (Read-Only Data Endpoints)
# ==============================================================================

@mcp.resource("agent://system/architecture")
def get_system_architecture() -> str:
    """
    MCP Resource: Exposes the system architecture and routing specification.
    External clients can read this resource (URI: agent://system/architecture) to inspect system capabilities.
    """
    # Static Resource Return: Markdown specification document
    return (
        "# Modern AI Systems Architecture Specification\n\n"
        "## Components:\n"
        "- **LangGraph Workflow**: RouterAgent -> ResearcherAgent -> ResponderAgent\n"
        "- **Local LLM**: Ollama running open-source weights (e.g. Llama 3.2, Mistral)\n"
        "- **Vector Database**: Pinecone serverless vector index with cosine similarity search\n"
        "- **Real-time Tools**: Live web search & Open-Meteo REST API\n"
        "- **Protocol Layer**: Model Context Protocol (MCP) server\n"
    )


@mcp.resource("rag://pinecone/stats")
def get_vector_store_stats() -> str:
    """
    MCP Resource: Exposes current Pinecone vector index statistics and record counts.
    URI: rag://pinecone/stats
    """
    # Dynamic Resource Return: Fetches real-time vector database metrics
    stats = get_index_stats()
    return json.dumps(stats, indent=2)


def start_mcp_server() -> None:
    """Entry point to start the MCP server using the configured transport."""
    transport = config.mcp_transport
    logger.info(f"[MCPServer] Launching MCP server using '{transport}' transport...")
    if MCP_AVAILABLE:
        # MCP Run: Starts the JSON-RPC stdio or SSE server event loop
        mcp.run(transport=transport)
    else:
        print("[MCPServer] The 'mcp' Python package is required. Install via: pip install mcp")


if __name__ == "__main__":
    start_mcp_server()
