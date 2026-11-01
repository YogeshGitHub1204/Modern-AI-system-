"""
================================================================================
CONCEPT: Model Context Protocol (MCP) Server & Client Module
--------------------------------------------------------------------------------
This package exposes the LangGraph multi-agent system, Pinecone RAG store,
and live tools over the open-standard Model Context Protocol (MCP).
================================================================================
"""

from .server import mcp, start_mcp_server

__all__ = ["mcp", "start_mcp_server"]
