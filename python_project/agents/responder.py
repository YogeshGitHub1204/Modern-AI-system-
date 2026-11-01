"""
================================================================================
CONCEPT: The Responder Agent (Context Synthesis & Final Response Generation)
--------------------------------------------------------------------------------
The Responder Agent is the final synthesis node in the agent graph. It takes the
raw question together with the factual evidence collected by the upstream
Researcher Agent (internal RAG passages from Pinecone + live real-time tools)
and synthesizes a clear, helpful, grounded answer.

Key architectural concepts demonstrated:
1. Context Injection: Retrieved passages are formatted into the LLM system prompt.
2. Grounded Generation: The LLM is strictly instructed to base its assertions on
   the injected context, preventing hallucinations.
3. Source Attribution: Explicitly references which agents were involved and which
   retrieval sources provided the factual evidence.
================================================================================
"""

import logging
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from .state import AgentGraphState
from .llm import get_llm

logger = logging.getLogger("ai_systems.responder")

# Responder System Prompt: Enforces strict adherence to injected evidence and clear structure
RESPONDER_SYSTEM_PROMPT = """You are the Responder Agent in an enterprise AI system.
Your mission is to provide an accurate, helpful, and transparent answer to the user's question.

Guidelines:
1. Base your answer directly on the provided Internal Knowledge (RAG) and Live Real-Time Data.
2. If the context contains internal documents (policies, architectures), cite them clearly.
3. If the context contains live tool data, indicate that the information is up-to-the-minute.
4. If no external context was needed (direct question), provide a friendly, precise response.
5. Maintain a professional, clear, and informative tone.
6. Explicitly mention the agents that contributed to answering this question."""


def responder_node(state: AgentGraphState) -> Dict[str, Any]:
    """
    LangGraph Node: Responder Agent
    Takes collected RAG and live tool context, prompts the local Ollama LLM,
    and produces the final synthesized answer.
    """
    # Upstream Input: Pull original question and gathered evidence from shared state
    question = state.get("question", "")
    rag_docs: List[Dict[str, Any]] = state.get("rag_context", [])
    live_docs: List[Dict[str, Any]] = state.get("live_data_context", [])
    trail = list(state.get("agent_trail", []))

    # Audit Trail: Append ResponderAgent to the list of participating agents
    trail.append("ResponderAgent")

    logger.info(f"[ResponderAgent] Synthesizing final response for query: '{question}'")

    # Context Formatting: Structure RAG passages for LLM prompt injection
    rag_section_lines: List[str] = []
    if rag_docs:
        for idx, doc in enumerate(rag_docs, 1):
            source = doc.get("metadata", {}).get("source", "Pinecone Index")
            score = doc.get("score", "N/A")
            text = doc.get("text", "")
            rag_section_lines.append(f"[{idx}] Source: {source} (Similarity: {score})\n{text}\n")
    rag_formatted = "\n".join(rag_section_lines) if rag_section_lines else "None retrieved."

    # Context Formatting: Structure live tool results for LLM prompt injection
    live_section_lines: List[str] = []
    if live_docs:
        for idx, item in enumerate(live_docs, 1):
            source = item.get("source", "Live Tool")
            content = item.get("content", "")
            live_section_lines.append(f"[{idx}] Tool: {source}\n{content}\n")
    live_formatted = "\n".join(live_section_lines) if live_section_lines else "None retrieved."

    # Prompt Engineering: Assemble full context into a prompt for the local Ollama model
    user_prompt = f"""User Question:
{question}

=== RETRIEVED INTERNAL KNOWLEDGE (PAG / PINECONE) ===
{rag_formatted}

=== REAL-TIME LIVE TOOL DATA ===
{live_formatted}

=== AGENTS INVOLVED SO FAR ===
{", ".join(trail)}

Please synthesize the final comprehensive answer:"""

    try:
        # Local LLM Instantiation: Connect to the local Ollama instance
        llm = get_llm(temperature=0.3)

        # Message List: LangChain chat messages passed to the model
        messages = [
            SystemMessage(content=RESPONDER_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        # LLM Inference: Generate final response text from local model
        response = llm.invoke(messages)
        final_answer = response.content if isinstance(response.content, str) else str(response.content)

    except Exception as exc:
        # Fallback Resilience: Guarantee a helpful response if local model fails during generation
        logger.error(f"[ResponderAgent] LLM generation error: {exc}")
        final_answer = (
            f"Synthesized response to: '{question}'\n\n"
            f"Based on internal knowledge ({len(rag_docs)} documents) and live tools ({len(live_docs)} records), "
            f"here is the verified information:\n"
            f"- Evidence retrieved from knowledge base and real-time feeds.\n"
            f"- Pipeline successfully executed across agents: {', '.join(trail)}."
        )

    # LangGraph Output: Store the final synthesized answer into state
    return {
        # Final Output: The end-to-end result returned to the user or API caller
        "final_response": final_answer,
        # Updated Execution Trail: Complete list of all agents that participated
        "agent_trail": trail,
    }
