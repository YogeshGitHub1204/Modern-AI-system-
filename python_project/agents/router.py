"""
================================================================================
CONCEPT: The Router Agent (Intent Classification & Execution Branching)
--------------------------------------------------------------------------------
In modern multi-agent systems, asking a single monolithic prompt to handle every
task leads to hallucinations and wasteful tool executions. A Router Agent acts
as the entry-point triage officer. It evaluates the user's inquiry and classifies
it into one of several distinct operational paths:

1. 'rag': Requires static or proprietary historical documents (e.g. corporate
   policies, API documentation, research papers indexed in a vector database).
2. 'live_tool': Requires up-to-the-minute real-world data (e.g. current weather,
   breaking news, live stock tickers, recent public API data).
3. 'both': Requires combining internal knowledge with external live context.
4. 'direct': General conversational greetings or math that require no lookup.

In LangGraph, the Router Agent updates `state['route']`, which governs the
subsequent `add_conditional_edges` transition.
================================================================================
"""

import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage

from .state import AgentGraphState
from .llm import get_llm

logger = logging.getLogger("ai_systems.router")

# Router System Prompt: Instructs the local LLM to return strict structured categorization
ROUTER_SYSTEM_PROMPT = """You are the Router Agent in an enterprise AI system.
Your sole job is to classify the user's question to decide how to answer it:

Classification Categories:
- 'rag': The user asks about internal company documentation, policies, architecture, specs, or archived knowledge.
- 'live_tool': The user asks about current real-time events, current weather, latest headlines, public search, or dynamic information.
- 'both': The question requires cross-referencing internal company knowledge with real-time external data.
- 'direct': Simple greetings, general reasoning, or logic puzzles needing no factual lookup.

Output exactly one word from: rag, live_tool, both, direct. Do not add explanation or punctuation."""


def router_node(state: AgentGraphState) -> Dict[str, Any]:
    """
    LangGraph Node: Router Agent
    Receives current state, analyzes the user question, and decides the next graph route.
    """
    # Shared State Access: Extract the original user question from the graph state
    question = state.get("question", "").strip()

    # Agent Audit Trail: Initialize or extend the list of agents that have processed this task
    trail = list(state.get("agent_trail", []))
    # State Mutation: Mark that the Router Agent has executed
    trail.append("RouterAgent")

    logger.info(f"[RouterAgent] Evaluating query: '{question}'")

    try:
        # Local LLM Invocation: Fetch the configured local Ollama model
        llm = get_llm(temperature=0.0)

        # Prompt Assembly: Provide routing guidelines and user query to the LLM
        messages = [
            SystemMessage(content=ROUTER_SYSTEM_PROMPT),
            HumanMessage(content=f"ROUTE_DECISION Question: {question}\nClassify:"),
        ]

        # LLM Inference: Run local model generation to classify query intent
        response = llm.invoke(messages)
        raw_decision = response.content if isinstance(response.content, str) else str(response.content)
        cleaned_decision = raw_decision.strip().lower()

        # Decision Normalization: Ensure the classification maps to a valid graph route
        if "rag" in cleaned_decision and "live" in cleaned_decision:
            route = "both"
        elif "live" in cleaned_decision or "tool" in cleaned_decision or "weather" in cleaned_decision:
            route = "live_tool"
        elif "rag" in cleaned_decision or "internal" in cleaned_decision or "policy" in cleaned_decision:
            route = "rag"
        elif "direct" in cleaned_decision:
            route = "direct"
        else:
            # Heuristic Safety Check: Keyword analysis if LLM gave verbose output
            q_lower = question.lower()
            if any(k in q_lower for k in ["weather", "today", "current", "now", "latest", "news", "price"]):
                route = "live_tool"
            elif any(k in q_lower for k in ["policy", "refund", "architecture", "handbook", "rag", "vector", "spec"]):
                route = "rag"
            else:
                route = "both"

    except Exception as exc:
        # Error Resilience: Fall back to 'both' to guarantee no data is missed if routing fails
        logger.error(f"[RouterAgent] Routing failed: {exc}. Defaulting to 'both'.")
        route = "both"

    logger.info(f"[RouterAgent] Route selected: '{route}'")

    # LangGraph Output Contract: Return dictionary of modified state keys
    return {
        # Conditional Edge Target: Value read by LangGraph to select the branch
        "route": route,
        # Updated Execution Trail: Preserves history for debugging and frontend visualization
        "agent_trail": trail,
        # Research Rationale: Explanation of why this branch was chosen
        "research_notes": f"Router selected '{route}' execution path based on query intent analysis.",
    }
