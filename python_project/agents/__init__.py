"""
================================================================================
CONCEPT: Agentic Workflow Module
--------------------------------------------------------------------------------
This package defines the multi-agent system built on LangGraph and LangChain.
Agents operate collaboratively around a shared state object, passing data
through discrete functional nodes and conditional routing edges.
================================================================================
"""

from .state import AgentGraphState
from .graph import create_agent_graph, run_agent_workflow

__all__ = ["AgentGraphState", "create_agent_graph", "run_agent_workflow"]
