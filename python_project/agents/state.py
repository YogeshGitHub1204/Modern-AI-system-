"""
================================================================================
CONCEPT: LangGraph Shared State Schema (StateGraph State)
--------------------------------------------------------------------------------
In an agentic workflow, individual agents do not speak directly through ad-hoc
function calls. Instead, they share a single typed state object (represented
here as a TypedDict). As execution proceeds from node to node across the graph:
1. Each agent receives the current snapshot of the state.
2. The agent executes its specialized logic (planning, retrieval, reasoning).
3. The agent returns a dictionary containing only the fields it modified.
4. LangGraph merges these updates into the shared state and routes to the next node.
================================================================================
"""

from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict


class AgentGraphState(TypedDict):
    """
    LangGraph Shared State: Defines the contract of data flowing through the graph.
    Every agent node in the workflow reads from and writes to this structure.
    """

    # User Input: The raw natural language prompt or query submitted to the system
    question: str

    # Router Decision: The execution path determined by the Router agent ('rag', 'live_tool', 'both', 'direct')
    route: str

    # Agent Audit Trail: Ordered list of agent names that participated in solving this request
    agent_trail: List[str]

    # RAG Context: Internal knowledge-base passages retrieved from the Pinecone vector index
    rag_context: List[Dict[str, Any]]

    # Real-Time Context: Live data retrieved from external tools (e.g. web search, public APIs)
    live_data_context: List[Dict[str, Any]]

    # Tool Execution Notes: Human-readable rationale recorded by the researcher or router
    research_notes: str

    # Final Output: The synthesized response produced by the Responder agent for the end-user
    final_response: str

    # Diagnostic Metadata: Timestamps, latency numbers, and token count estimations
    metadata: Dict[str, Any]

    # Error Tracking: Captures any exceptions or fallback occurrences without crashing the workflow
    error: Optional[str]
