"""
================================================================================
CONCEPT: LangGraph StateGraph Architecture & Conditional Edge Routing
--------------------------------------------------------------------------------
LangGraph extends LangChain by representing multi-agent systems as a directed
state machine (StateGraph). Rather than chaining steps sequentially in a rigid
linear pipeline, a StateGraph enables:

1. Cyclic and Conditional Branching: Edges dynamically route execution based on
   the current contents of the state dictionary.
2. Shared State Synchronization: Every node is a Python function that takes
   the current state and returns state mutations.
3. Checkpointing & Human-in-the-Loop: Allows state pausing, replaying, and
   inspection at any boundary.

In this architecture:
- Entry Point: 'router' node processes the user question first.
- Conditional Edge: 'router' evaluates state['route']. If research is required
  ('rag', 'live_tool', 'both'), it routes to 'researcher'. If 'direct', it skips
  straight to 'responder'.
- Normal Edge: 'researcher' always forwards its retrieved evidence to 'responder'.
- Terminal Edge: 'responder' emits the final answer and exits at END.
================================================================================
"""

import time
import logging
from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END

from .state import AgentGraphState
from .router import router_node
from .researcher import researcher_node
from .responder import responder_node

logger = logging.getLogger("ai_systems.graph")


def route_decision_edge(state: AgentGraphState) -> Literal["researcher", "responder"]:
    """
    LangGraph Conditional Edge Function:
    Inspects state['route'] set by the Router Agent to determine which node to visit next.
    Demonstrates how an upstream agent's output decides the control flow of the entire system.
    """
    # LangGraph State Read: Inspect the decision produced by the Router Agent
    route = state.get("route", "both")

    # LangGraph Conditional Routing: Branch execution path based on state value
    if route == "direct":
        # Skip external research if the question is a direct query (e.g. greeting)
        logger.info("[GraphEdge] Routing directly from Router to Responder (no research needed).")
        return "responder"
    else:
        # Route through Researcher Agent for RAG, live tools, or both
        logger.info(f"[GraphEdge] Routing from Router to Researcher for '{route}' lookup.")
        return "researcher"


def create_agent_graph() -> StateGraph:
    """
    Constructs and compiles the multi-agent StateGraph.
    Declares nodes, entry points, conditional branches, and terminal transitions.
    """
    # StateGraph Initialization: Binds graph execution to the AgentGraphState schema
    workflow = StateGraph(AgentGraphState)

    # Node Registration: Register each agent as an executable vertex in the graph
    # LangGraph: Add the Router Agent node
    workflow.add_node("router", router_node)

    # LangGraph: Add the Researcher Agent node
    workflow.add_node("researcher", researcher_node)

    # LangGraph: Add the Responder Agent node
    workflow.add_node("responder", responder_node)

    # Entry Point: Define which node executes first when the graph receives input
    # LangGraph: this sets 'router' as the graph's entry point
    workflow.set_entry_point("router")

    # Conditional Edge: Dynamic branching out of the Router Agent
    # LangGraph: this conditional edge routes state from 'router' to either 'researcher' or 'responder'
    workflow.add_conditional_edges(
        source="router",
        path=route_decision_edge,
        path_map={
            "researcher": "researcher",
            "responder": "responder",
        },
    )

    # Static Edge: Researcher always delivers its findings to Responder
    # LangGraph: this fixed edge routes the state from 'researcher' to 'responder'
    workflow.add_edge("researcher", "responder")

    # Terminal Edge: Responder completes the task and terminates execution
    # LangGraph: this edge routes the state from 'responder' to the terminal END node
    workflow.add_edge("responder", END)

    # Graph Compilation: Validates topology and returns an executable CompiledGraph
    compiled_graph = workflow.compile()
    return compiled_graph


def run_agent_workflow(question: str) -> Dict[str, Any]:
    """
    High-level convenience runner for the agent graph.
    Accepts a natural language question and returns the complete final state dictionary.
    """
    start_time = time.time()

    # Initial State: Seed the graph with the incoming user question and blank fields
    initial_state: AgentGraphState = {
        "question": question,
        "route": "pending",
        "agent_trail": [],
        "rag_context": [],
        "live_data_context": [],
        "research_notes": "",
        "final_response": "",
        "metadata": {},
        "error": None,
    }

    # Graph Compilation: Build the state machine
    graph = create_agent_graph()

    logger.info(f"[Workflow] Initiating LangGraph execution for: '{question}'")

    try:
        # LangGraph Invocation: Execute state transitions synchronously through the graph
        final_state = graph.invoke(initial_state)

        # Execution Diagnostics: Record latency and timestamp metadata
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        final_state["metadata"] = {
            "elapsed_ms": elapsed_ms,
            "agents_count": len(final_state.get("agent_trail", [])),
            "rag_chunks_used": len(final_state.get("rag_context", [])),
            "live_records_used": len(final_state.get("live_data_context", [])),
        }
        return final_state

    except Exception as exc:
        # Graph Error Handling: Record failure in state rather than crashing unhandled
        logger.error(f"[Workflow] Graph execution failure: {exc}")
        initial_state["error"] = str(exc)
        initial_state["final_response"] = f"An error occurred during workflow execution: {exc}"
        initial_state["agent_trail"].append("ErrorHandler")
        return initial_state
