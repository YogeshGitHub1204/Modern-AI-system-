"""
================================================================================
CONCEPT: Python Web Application Module (FastAPI REST API & Web Dashboard)
--------------------------------------------------------------------------------
This package provides the HTTP interface to the AI system, exposing REST
endpoints for user queries, vector database ingestion, and tool testing.
================================================================================
"""

from .app import app

__all__ = ["app"]
