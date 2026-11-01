"""
================================================================================
CONCEPT: The Researcher Agent (Information Gathering & Context Synthesis)
--------------------------------------------------------------------------------
The Researcher Agent is responsible for factual grounding. Unlike general LLMs
that rely on frozen training weights (which hallucinate when asked about
private company data or recent events), the Researcher queries external systems:

1. Vector Database (Pinecone RAG): Searches for semantically relevant chunks of
   proprietary documents, policies, or technical specifications.
2. Real-Time Tools: Calls live APIs or web search to capture dynamic,
   ephemeral real-world state (e.g. current weather, live market feeds).

In LangGraph, the Researcher demonstrates how an upstream agent's output
(state['route'] produced by RouterAgent) determines downstream execution logic.
================================================================================
"""

import logging
from typing import Dict, Any, List

from .state import AgentGraphState
from rag.retrieval import query_vector_index
from tools.live_data import search_live_information, fetch_live_weather_report

logger = logging.getLogger("ai_systems.researcher")


def researcher_node(state: AgentGraphState) -> Dict[str, Any]:
    """
    LangGraph Node: Researcher Agent
    Executes RAG retrieval and/or real-time tool calls according to state['route'].
    """
    # Upstream Input: Retrieve state emitted by the Router Agent
    question = state.get("question", "")
    route = state.get("route", "both")

    # State Continuation: Append ResearcherAgent to the audit trail
    trail = list(state.get("agent_trail", []))
    trail.append("ResearcherAgent")

    logger.info(f"[ResearcherAgent] Executing research for route: '{route}'")

    rag_results: List[Dict[str, Any]] = []
    live_results: List[Dict[str, Any]] = []
    notes_list: List[str] = []

    # Conditional Branching: Execute Pinecone RAG if route is 'rag' or 'both'
    if route in ("rag", "both"):
        # RAG Retrieval: Perform vector similarity search against Pinecone
        logger.info(f"[ResearcherAgent] Querying Pinecone vector database for: '{question}'")
        retrieved_docs = query_vector_index(query=question, top_k=3)
        rag_results.extend(retrieved_docs)
        notes_list.append(f"Retrieved {len(retrieved_docs)} document chunks from Pinecone vector index.")

    # Conditional Branching: Execute Real-Time Tools if route is 'live_tool' or 'both'
    if route in ("live_tool", "both"):
        # Real-Time Tool Execution: Query dynamic web tools for current facts
        logger.info(f"[ResearcherAgent] Querying live data tools for: '{question}'")
        
        # Tool Dispatch: Route query to weather tool or general live web search tool
        if "weather" in question.lower():
            # Tool Invocation: Call live Open-Meteo public API
            weather_data = fetch_live_weather_report(location="San Francisco")
            live_results.append({
                "source": "Open-Meteo Live API",
                "tool": "fetch_live_weather_report",
                "content": weather_data,
            })
            notes_list.append("Fetched live atmospheric telemetry from Open-Meteo API.")
        else:
            # Tool Invocation: Call live web search tool
            live_search = search_live_information(query=question, max_results=3)
            live_results.extend(live_search)
            notes_list.append(f"Fetched {len(live_search)} live search results via live web tool.")

    # LangGraph State Update: Emit gathered context to the shared state dictionary
    return {
        # RAG Knowledge: Grounding passages supplied to the downstream Responder Agent
        "rag_context": rag_results,
        # Live Grounding: Real-time external facts supplied to the downstream Responder Agent
        "live_data_context": live_results,
        # Audit Trail: Updated trail reflecting ResearcherAgent completion
        "agent_trail": trail,
        # Research Summary: Log of external calls executed during this step
        "research_notes": " | ".join(notes_list) if notes_list else "No external lookup required.",
    }
