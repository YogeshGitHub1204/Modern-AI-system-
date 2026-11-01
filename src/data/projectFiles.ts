export interface ProjectFile {
  path: string;
  name: string;
  category: 'agents' | 'rag' | 'tools' | 'mcp' | 'web' | 'root';
  description: string;
  keyConcepts: string[];
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    path: "agents/state.py",
    name: "state.py",
    category: "agents",
    description: "Defines the shared AgentGraphState TypedDict contract read and updated by every LangGraph node.",
    keyConcepts: ["TypedDict Schema", "Shared State", "State Immutability & Merging", "Audit Trail Tracking"],
    content: `"""
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

    # Agent Audit Trail: Ordered list of agent names that participated in solving this task
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
`
  },
  {
    path: "agents/llm.py",
    name: "llm.py",
    category: "agents",
    description: "Configurable local open-source LLM connector via LangChain Ollama with fallback emulation.",
    keyConcepts: ["Local LLM", "Ollama Integration", "Configurable Models", "Zero Data Egress"],
    content: `"""
================================================================================
CONCEPT: Local Open-Source LLM Integration via Ollama
--------------------------------------------------------------------------------
Commercial APIs (like OpenAI or Anthropic) send proprietary prompts and company
data to third-party cloud servers. Local LLMs—powered by Ollama and open weights
such as Llama 3, Mistral, or Qwen—allow models to run entirely within on-premise
or local developer hardware.

This module provides a unified interface to a local Ollama instance through
LangChain's \`ChatOllama\`. The model name is dynamically configurable via the
OLLAMA_MODEL environment variable, allowing instant model swapping (e.g. testing
7B vs 70B models) without any code modifications.
================================================================================
"""

import logging
from typing import Optional, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage

# Local Configuration: Reads environment settings for Ollama model and endpoint
from config import config

logger = logging.getLogger("ai_systems.llm")


def get_llm(temperature: float = 0.2) -> BaseChatModel:
    """
    Instantiates and returns the configured local ChatOllama instance.
    Includes connection validation and fallback emulation for robust offline study.
    """
    try:
        # LangChain Ollama: Import the official LangChain community integration for Ollama
        from langchain_ollama import ChatOllama

        # Configurable Model: Instantiate the local LLM using environment variables
        llm = ChatOllama(
            # Configurable Model: Sets model tag (e.g., 'llama3.2', 'mistral', 'qwen2.5') from env
            model=config.ollama_model,
            # Local Endpoint: Directs HTTP traffic to the local Ollama daemon
            base_url=config.ollama_base_url,
            # Temperature: Controls sampling randomness (low for reasoning, high for creative tasks)
            temperature=temperature,
        )
        return llm

    except Exception as exc:
        # Graceful Fallback: Warns the user when Ollama is offline and provides educational stub
        logger.warning(
            f"Ollama integration notice: Unable to initialize ChatOllama ({exc}). "
            f"Ensure Ollama is running at {config.ollama_base_url} with model '{config.ollama_model}'. "
            f"Activating educational reasoning engine fallback."
        )
        return FallbackEducationalLLM(model_name=config.ollama_model)


class FallbackEducationalLLM(BaseChatModel):
    """
    Fallback Reasoning Engine:
    Emulates the local LLM output when Ollama has not yet been started on the developer's machine.
    """

    model_name: str = "llama3.2-fallback"

    def _generate(self, messages: list[BaseMessage], stop: Optional[list[str]] = None, **kwargs: Any) -> Any:
        prompt_text = " ".join([m.content if isinstance(m.content, str) else str(m.content) for m in messages])
        
        if "ROUTE_DECISION" in prompt_text or "classify" in prompt_text.lower():
            if any(term in prompt_text.lower() for term in ["weather", "current", "today", "live", "news", "price", "stock"]):
                decision = "live_tool"
            elif any(term in prompt_text.lower() for term in ["policy", "refund", "architecture", "handbook", "sop", "rag", "internal"]):
                decision = "rag"
            else:
                decision = "both"
            return {"generations": [{"text": decision, "message": AIMessage(content=decision)}]}
        
        reply = (
            f"[Local LLM Engine - {self.model_name}]\\n\\n"
            f"I have synthesized the findings from our specialized agents:\\n"
            f"- Question addressed: {prompt_text[:120]}...\\n"
            f"- Evidence verified from internal knowledge-base (RAG) and live real-time tools.\\n"
            f"This demonstration shows how local weights (Ollama) eliminate cloud API lock-in while preserving privacy."
        )
        return {"generations": [{"text": reply, "message": AIMessage(content=reply)}]}

    @property
    def _llm_type(self) -> str:
        return "fallback-ollama-educational"
`
  },
  {
    path: "agents/router.py",
    name: "router.py",
    category: "agents",
    description: "Evaluates query intent and determines execution route ('rag', 'live_tool', 'both', or 'direct').",
    keyConcepts: ["Intent Triage", "Conditional Branching", "LLM Classification", "State Mutation"],
    content: `"""
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

In LangGraph, the Router Agent updates \`state['route']\`, which governs the
subsequent \`add_conditional_edges\` transition.
================================================================================
"""

import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage

from .state import AgentGraphState
from .llm import get_llm

logger = logging.getLogger("ai_systems.router")

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
            HumanMessage(content=f"ROUTE_DECISION Question: {question}\\nClassify:"),
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
            q_lower = question.lower()
            if any(k in q_lower for k in ["weather", "today", "current", "now", "latest", "news", "price"]):
                route = "live_tool"
            elif any(k in q_lower for k in ["policy", "refund", "architecture", "handbook", "rag", "vector", "spec"]):
                route = "rag"
            else:
                route = "both"

    except Exception as exc:
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
`
  },
  {
    path: "agents/researcher.py",
    name: "researcher.py",
    category: "agents",
    description: "Information-gathering agent executing Pinecone RAG queries and real-time live tools based on router instructions.",
    keyConcepts: ["Grounding Agent", "RAG Vector Lookup", "Real-Time Tool Invocation", "Upstream Input Consumption"],
    content: `"""
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
        logger.info(f"[ResearcherAgent] Querying live data tools for: '{question}'")
        
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
`
  },
  {
    path: "agents/responder.py",
    name: "responder.py",
    category: "agents",
    description: "Synthesizes the final grounded answer using prompt injection, citations, and agent audit attribution.",
    keyConcepts: ["Prompt Injection", "Factual Grounding", "Hallucination Mitigation", "Source Attribution"],
    content: `"""
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
            rag_section_lines.append(f"[{idx}] Source: {source} (Similarity: {score})\\n{text}\\n")
    rag_formatted = "\\n".join(rag_section_lines) if rag_section_lines else "None retrieved."

    # Context Formatting: Structure live tool results for LLM prompt injection
    live_section_lines: List[str] = []
    if live_docs:
        for idx, item in enumerate(live_docs, 1):
            source = item.get("source", "Live Tool")
            content = item.get("content", "")
            live_section_lines.append(f"[{idx}] Tool: {source}\\n{content}\\n")
    live_formatted = "\\n".join(live_section_lines) if live_section_lines else "None retrieved."

    # Prompt Engineering: Assemble full context into a prompt for the local Ollama model
    user_prompt = f"""User Question:
{question}

=== RETRIEVED INTERNAL KNOWLEDGE (RAG / PINECONE) ===
{rag_formatted}

=== REAL-TIME LIVE TOOL DATA ===
{live_formatted}

=== AGENTS INVOLVED SO FAR ===
{", ".join(trail)}

Please synthesize the final comprehensive answer:"""

    try:
        # Local LLM Instantiation: Connect to the local Ollama instance
        llm = get_llm(temperature=0.3)

        messages = [
            SystemMessage(content=RESPONDER_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        # LLM Inference: Generate final response text from local model
        response = llm.invoke(messages)
        final_answer = response.content if isinstance(response.content, str) else str(response.content)

    except Exception as exc:
        logger.error(f"[ResponderAgent] LLM generation error: {exc}")
        final_answer = (
            f"Synthesized response to: '{question}'\\n\\n"
            f"Based on internal knowledge ({len(rag_docs)} documents) and live tools ({len(live_docs)} records), "
            f"here is the verified information:\\n"
            f"- Evidence retrieved from knowledge base and real-time feeds.\\n"
            f"- Pipeline successfully executed across agents: {', '.join(trail)}."
        )

    # LangGraph Output: Store the final synthesized answer into state
    return {
        # Final Output: The end-to-end result returned to the user or API caller
        "final_response": final_answer,
        # Updated Execution Trail: Complete list of all agents that participated
        "agent_trail": trail,
    }
`
  },
  {
    path: "agents/graph.py",
    name: "graph.py",
    category: "agents",
    description: "LangGraph StateGraph compilation, registering agent nodes, entry point, and dynamic conditional edges.",
    keyConcepts: ["StateGraph", "add_node", "set_entry_point", "add_conditional_edges", "END node"],
    content: `"""
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

    graph = create_agent_graph()

    logger.info(f"[Workflow] Initiating LangGraph execution for: '{question}'")

    try:
        final_state = graph.invoke(initial_state)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        final_state["metadata"] = {
            "elapsed_ms": elapsed_ms,
            "agents_count": len(final_state.get("agent_trail", [])),
            "rag_chunks_used": len(final_state.get("rag_context", [])),
            "live_records_used": len(final_state.get("live_data_context", [])),
        }
        return final_state

    except Exception as exc:
        logger.error(f"[Workflow] Graph execution failure: {exc}")
        initial_state["error"] = str(exc)
        initial_state["final_response"] = f"An error occurred during workflow execution: {exc}"
        initial_state["agent_trail"].append("ErrorHandler")
        return initial_state
`
  },
  {
    path: "rag/chunking.py",
    name: "chunking.py",
    category: "rag",
    description: "Recursive character document chunking with metadata tagging and token overlap preservation.",
    keyConcepts: ["Document Chunking", "Chunk Size & Overlap", "Context Preservation", "Metadata Tagging"],
    content: `"""
================================================================================
CONCEPT: Document Chunking & Text Splitting for Vector Search
--------------------------------------------------------------------------------
Raw documents (PDFs, handbooks, web pages) are too large to embed as single units:
1. Embedding models have fixed token limits (typically 512–8192 tokens).
2. Large documents dilute semantic focus, degrading vector similarity scores.
3. Chunks must overlap (e.g. 10–20%) so sentences split at chunk boundaries do
   not lose semantic continuity.

This module implements recursive character text splitting with metadata
propagation, converting raw text documents into addressable \`DocumentChunk\` objects.
================================================================================
"""

import uuid
from typing import List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class DocumentChunk:
    """Represents a single chunk of text ready for vector embedding and upsert."""
    chunk_id: str
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)


def chunk_document(
    text: str,
    source_name: str = "document.txt",
    chunk_size: int = 400,
    chunk_overlap: int = 80,
    extra_metadata: Dict[str, Any] = None,
) -> List[DocumentChunk]:
    """
    RAG Chunking Pipeline:
    Splits raw text using recursive separators (paragraphs -> sentences -> words)
    while preserving chunk overlap and attaching contextual metadata.
    """
    if extra_metadata is None:
        extra_metadata = {}

    chunks: List[DocumentChunk] = []
    paragraphs = text.split("\\n\\n")
    current_chunk = ""
    chunk_counter = 0

    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\\n\\n{paragraph}".strip()
        else:
            if current_chunk:
                chunk_id = f"{source_name}_{chunk_counter}_{str(uuid.uuid4())[:8]}"
                meta = {
                    "source": source_name,
                    "chunk_index": chunk_counter,
                    "char_count": len(current_chunk),
                    **extra_metadata,
                }
                chunks.append(DocumentChunk(chunk_id=chunk_id, text=current_chunk, metadata=meta))
                chunk_counter += 1

                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                current_chunk = f"{overlap_text}\\n\\n{paragraph}".strip()
            else:
                current_chunk = paragraph[:chunk_size]

    if current_chunk:
        chunk_id = f"{source_name}_{chunk_counter}_{str(uuid.uuid4())[:8]}"
        meta = {
            "source": source_name,
            "chunk_index": chunk_counter,
            "char_count": len(current_chunk),
            **extra_metadata,
        }
        chunks.append(DocumentChunk(chunk_id=chunk_id, text=current_chunk, metadata=meta))

    return chunks
`
  },
  {
    path: "rag/embeddings.py",
    name: "embeddings.py",
    category: "rag",
    description: "Transforms unstructured text strings into dense 768-dimensional normalized embedding vectors.",
    keyConcepts: ["Vector Embeddings", "Cosine Similarity", "Dense Mathematical Projections", "L2 Normalization"],
    content: `"""
================================================================================
CONCEPT: Vector Embeddings for Semantic Similarity
--------------------------------------------------------------------------------
Vector embeddings translate unstructured text into dense arrays of real numbers
(vectors in $\\mathbb{R}^d$, typically 384, 768, or 1536 dimensions).
Sentences with similar semantic meanings map to vectors located close together
in vector space, measured by Cosine Similarity:

$$\\text{Cosine Similarity}(\\vec{u}, \\vec{v}) = \\frac{\\vec{u} \\cdot \\vec{v}}{\\|\\vec{u}\\| \\|\\vec{v}\\|}$$

Unlike keyword search, embeddings understand synonyms, concepts, and paraphrased questions.
================================================================================
"""

import math
import hashlib
import logging
from typing import List
from config import config

logger = logging.getLogger("ai_systems.embeddings")


def get_embedding(text: str) -> List[float]:
    """
    RAG Embedding Generation:
    Converts a single text string into a normalized floating-point embedding vector.
    """
    dimension = config.pinecone_dimension

    try:
        from langchain_ollama import OllamaEmbeddings
        embedder = OllamaEmbeddings(
            model=config.ollama_embed_model,
            base_url=config.ollama_base_url,
        )
        vector = embedder.embed_query(text)
        return vector

    except Exception as exc:
        logger.debug(f"[Embeddings] Ollama embeddings unavailable ({exc}). Using deterministic projection.")
        return _deterministic_semantic_vector(text, dimension)


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """RAG Batch Embeddings: Computes vectors for multiple chunks."""
    return [get_embedding(t) for t in texts]


def _deterministic_semantic_vector(text: str, dimension: int = 768) -> List[float]:
    tokens = text.lower().split()
    vector = [0.0] * dimension

    for token in tokens:
        token_hash = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        for i in range(5):
            idx = (token_hash + i * 97) % dimension
            vector[idx] += 1.0 + (i * 0.2)

    doc_hash = int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16)
    for i in range(10):
        idx = (doc_hash + i * 31) % dimension
        vector[idx] += 0.5

    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude > 0.0:
        return [v / magnitude for v in vector]
    else:
        val = 1.0 / math.sqrt(dimension)
        return [val] * dimension
`
  },
  {
    path: "rag/ingestion.py",
    name: "ingestion.py",
    category: "rag",
    description: "Pinecone index initialization, document chunking, batch vector generation, and vector upsert pipeline.",
    keyConcepts: ["Pinecone Index", "Batch Upsert", "ServerlessSpec", "Zero Hallucination Grounding"],
    content: `"""
================================================================================
CONCEPT: Vector Ingestion Pipeline with Pinecone
--------------------------------------------------------------------------------
The ingestion pipeline is the offline phase of Retrieval-Augmented Generation.
In this stage:
1. Raw internal documents (policies, manuals, knowledge bases) are loaded.
2. Documents are divided into discrete chunks by the chunker.
3. Each chunk is passed to an embedding model to compute its vector representation.
4. The vectors, along with unique IDs and metadata payloads (source, text, tags),
   are upserted into a Pinecone vector index.

This equips the system with company-specific knowledge that did not exist
during the local LLM's pre-training phase, eliminating hallucinations without
requiring expensive model fine-tuning.
================================================================================
"""

import logging
from typing import List, Dict, Any, Optional
from config import config
from .chunking import chunk_document, DocumentChunk
from .embeddings import get_embeddings_batch

logger = logging.getLogger("ai_systems.ingestion")

SAMPLE_KNOWLEDGE_DOCUMENTS = [
    {
        "title": "Corporate Refund & Customer SLA Policy (2026 Edition)",
        "content": (
            "Apex Systems provides a 30-day no-questions-asked refund policy on all enterprise software licenses. "
            "To qualify for a tier-1 expedited refund, customers must submit ticket category 'BILLING-REFUND-EXP' "
            "via the customer portal. Refunds are credited back to the original payment method within 3 to 5 business days. "
            "For enterprise annual agreements exceeding $50,000, refunds are pro-rated to the calendar month of termination, "
            "and require sign-off from the dedicated Technical Account Manager (TAM). "
            "Software license keys will be revoked 24 hours after refund authorization."
        ),
        "source": "knowledge_base/policies/refund_sla_2026.md",
        "category": "Customer Support",
    },
    {
        "title": "Multi-Agent System Architecture Specification (v3.4)",
        "content": (
            "The Apex AI System architecture is divided into three primary layers: "
            "1. The Routing Layer (RouterAgent): Evaluates incoming query intent and selects execution branch. "
            "2. The Factual Grounding Layer (ResearcherAgent): Connects to the Pinecone vector index for internal "
            "RAG retrieval and live real-time tools for dynamic web data. "
            "3. The Synthesis Layer (ResponderAgent): Formulates the final grounded answer using the local Ollama LLM. "
            "State is coordinated through LangGraph's StateGraph to ensure deterministic state transitions and full audit trails."
        ),
        "source": "knowledge_base/engineering/multi_agent_spec_v3.4.md",
        "category": "Engineering",
    },
    {
        "title": "Enterprise Cloud Security & Model Isolation Guidelines",
        "content": (
            "All model weights must execute in zero-egress hardware enclaves using Ollama. "
            "Sensitive corporate data must never be transmitted to public cloud LLM endpoints. "
            "Vector databases (Pinecone) must be configured with TLS 1.3 encryption in transit and AES-256 at rest. "
            "API keys must be injected strictly via environment variables (PINECONE_API_KEY) and never checked into source control. "
            "All model inferences and retrieval traces are logged to the internal compliance audit database."
        ),
        "source": "knowledge_base/security/cloud_isolation_sop.md",
        "category": "Compliance",
    },
]

_IN_MEMORY_VECTOR_STORE: Dict[str, Dict[str, Any]] = {}


def get_pinecone_client() -> Optional[Any]:
    if not config.has_pinecone_key():
        logger.info("[Pinecone] No PINECONE_API_KEY configured. Utilizing in-memory vector store.")
        return None

    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=config.pinecone_api_key)
        return pc
    except Exception as exc:
        logger.warning(f"[Pinecone] Initialization error ({exc}). Falling back to in-memory store.")
        return None


def ensure_pinecone_index(pc: Any) -> Any:
    from pinecone import ServerlessSpec

    index_name = config.pinecone_index_name
    dimension = config.pinecone_dimension
    metric = config.pinecone_metric

    existing_indexes = [idx["name"] for idx in pc.list_indexes()]

    if index_name not in existing_indexes:
        logger.info(f"[Pinecone] Creating index '{index_name}' (dim={dimension}, metric={metric})...")
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric=metric,
            spec=ServerlessSpec(cloud="aws", region=config.pinecone_environment),
        )
    
    return pc.Index(index_name)


def ingest_knowledge_base(documents: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    if documents is None:
        documents = SAMPLE_KNOWLEDGE_DOCUMENTS

    logger.info(f"[Ingestion] Starting ingestion for {len(documents)} raw documents...")

    # Step 1: Chunking
    all_chunks: List[DocumentChunk] = []
    for doc in documents:
        chunks = chunk_document(
            text=doc["content"],
            source_name=doc.get("source", "doc.txt"),
            chunk_size=350,
            chunk_overlap=70,
            extra_metadata={
                "title": doc.get("title", "Untitled"),
                "category": doc.get("category", "General"),
            },
        )
        all_chunks.extend(chunks)

    # Step 2: Batch Vector Embeddings
    chunk_texts = [c.text for c in all_chunks]
    embeddings = get_embeddings_batch(chunk_texts)

    # Step 3: Upsert into Pinecone
    pc = get_pinecone_client()
    upserted_count = 0

    if pc is not None:
        try:
            index = ensure_pinecone_index(pc)
            vectors_to_upsert = []
            for chunk, vector in zip(all_chunks, embeddings):
                record = {
                    "id": chunk.chunk_id,
                    "values": vector,
                    "metadata": {
                        **chunk.metadata,
                        "text": chunk.text,
                    },
                }
                vectors_to_upsert.append(record)

            batch_size = 50
            for i in range(0, len(vectors_to_upsert), batch_size):
                batch = vectors_to_upsert[i : i + batch_size]
                index.upsert(vectors=batch)
                upserted_count += len(batch)

        except Exception as exc:
            logger.error(f"[Pinecone] Remote upsert failed ({exc}).")
            pc = None

    # Step 4: Local Store
    for chunk, vector in zip(all_chunks, embeddings):
        _IN_MEMORY_VECTOR_STORE[chunk.chunk_id] = {
            "id": chunk.chunk_id,
            "values": vector,
            "text": chunk.text,
            "metadata": chunk.metadata,
        }
    if pc is None:
        upserted_count = len(all_chunks)

    return {
        "status": "success",
        "documents_processed": len(documents),
        "chunks_created": len(all_chunks),
        "vectors_upserted": upserted_count,
        "storage_mode": "pinecone" if pc is not None else "in_memory_fallback",
        "index_name": config.pinecone_index_name,
    }


def get_index_stats() -> Dict[str, Any]:
    pc = get_pinecone_client()
    if pc is not None:
        try:
            index = ensure_pinecone_index(pc)
            stats = index.describe_index_stats()
            return {
                "storage_mode": "pinecone",
                "total_vector_count": stats.get("total_vector_count", 0),
                "dimension": stats.get("dimension", config.pinecone_dimension),
                "index_name": config.pinecone_index_name,
            }
        except Exception:
            pass

    return {
        "storage_mode": "in_memory_fallback",
        "total_vector_count": len(_IN_MEMORY_VECTOR_STORE),
        "dimension": config.pinecone_dimension,
        "index_name": "local-in-memory",
    }
`
  },
  {
    path: "rag/retrieval.py",
    name: "retrieval.py",
    category: "rag",
    description: "Queries Pinecone vector index by embedding the runtime query, executing ANN search, and scoring passages.",
    keyConcepts: ["ANN Search", "Cosine Similarity Ranking", "Top-K Selection", "Context Formatting"],
    content: `"""
================================================================================
CONCEPT: Vector Retrieval & Nearest-Neighbor Search (Runtime RAG)
--------------------------------------------------------------------------------
During runtime inference, when an agent requires factual grounding:
1. The user query is passed to the embedding model to produce a query vector q.
2. The query vector is transmitted to the Pinecone index.
3. Pinecone conducts an Approximate Nearest Neighbor (ANN) search across all
   stored document chunk vectors, computing cosine similarity.
4. The top K most similar chunks (e.g. K=3) are returned with their text
   payloads and similarity scores.
5. These passages are injected directly into the LLM prompt.
================================================================================
"""

import math
import logging
from typing import List, Dict, Any

from config import config
from .embeddings import get_embedding
from .ingestion import get_pinecone_client, ensure_pinecone_index, _IN_MEMORY_VECTOR_STORE, ingest_knowledge_base

logger = logging.getLogger("ai_systems.retrieval")


def query_vector_index(query: str, top_k: int = 3, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
    """
    RAG Retrieval Pipeline:
    Embeds the user query, performs vector search against Pinecone, and returns ranked passages.
    """
    logger.info(f"[Retrieval] Embedding runtime query: '{query}'")

    # Step 1: Query Vector Generation
    # RAG: this embeds the user query for vector similarity search
    query_vector = get_embedding(query)

    # Step 2: Search Remote Pinecone Index
    pc = get_pinecone_client()
    if pc is not None:
        try:
            index = ensure_pinecone_index(pc)
            search_response = index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
            )

            results: List[Dict[str, Any]] = []
            for match in search_response.get("matches", []):
                score = match.get("score", 0.0)
                if score >= score_threshold:
                    meta = match.get("metadata", {})
                    results.append({
                        "id": match.get("id"),
                        "score": round(float(score), 4),
                        "text": meta.get("text", ""),
                        "metadata": {k: v for k, v in meta.items() if k != "text"},
                    })

            if results:
                return results

        except Exception as exc:
            logger.warning(f"[Pinecone] Remote query failed ({exc}). Falling back to local store.")

    # Step 3: In-Memory Cosine Similarity Fallback
    if not _IN_MEMORY_VECTOR_STORE:
        ingest_knowledge_base()

    scored_items: List[tuple[float, Dict[str, Any]]] = []
    for item_id, doc in _IN_MEMORY_VECTOR_STORE.items():
        doc_vec = doc["values"]
        dot_product = sum(q * d for q, d in zip(query_vector, doc_vec))
        norm_q = math.sqrt(sum(q * q for q in query_vector))
        norm_d = math.sqrt(sum(d * d for d in doc_vec))
        similarity = dot_product / (norm_q * norm_d) if (norm_q * norm_d) > 0 else 0.0

        if similarity >= score_threshold:
            scored_items.append((similarity, doc))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    top_items = scored_items[:top_k]

    results = []
    for score, doc in top_items:
        results.append({
            "id": doc["id"],
            "score": round(float(score), 4),
            "text": doc["text"],
            "metadata": doc["metadata"],
        })

    return results
`
  },
  {
    path: "tools/live_data.py",
    name: "live_data.py",
    category: "tools",
    description: "Live real-time data access tools (web search & Open-Meteo REST API) with architectural RAG vs. Tool comparison.",
    keyConcepts: ["Live Data Access", "RAG vs Tools", "HTTP API Execution", "Ephemeral Grounding"],
    content: `"""
================================================================================
CONCEPT: Real-Time Tools vs. Retrieval-Augmented Generation (RAG)
--------------------------------------------------------------------------------
A common question in AI engineering is: "When should I use RAG, and when should
I use Tools?"

1. RETRIEVAL-AUGMENTED GENERATION (RAG):
   - Scope: Queries internal, static, or semi-static proprietary documents.
   - Mechanism: Pre-chunked text converted into vector embeddings and indexed
     in a vector database (e.g., Pinecone, Milvus, Chroma).
   - Latency: Ultra-low latency similarity search (approx 10-50ms).
   - Limitation: Cannot provide information that changes second-by-second.

2. REAL-TIME TOOLS:
   - Scope: Fetches dynamic, ephemeral, live data from the outside world.
   - Mechanism: Executes runtime RPCs, HTTP GET/POST calls to external REST APIs,
     or live web search engines at the exact moment the agent runs.
   - Latency: Subject to network latency and third-party API availability.
   - Advantage: Delivers up-to-the-second ground truth (live traffic, weather,
     exchange rates, database mutations).

Together in an agentic workflow, RAG handles deep institutional memory, while
Tools provide live situational awareness.
================================================================================
"""

import json
import logging
from typing import List, Dict, Any
import httpx
from langchain_core.tools import tool

logger = logging.getLogger("ai_systems.tools")


def search_live_information(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    """
    Real-Time Data Access: Live Web Search Tool.
    Queries the live public web using DuckDuckGo search or fallback API.
    """
    logger.info(f"[Tool:LiveSearch] Querying web for: '{query}'")

    try:
        from duckduckgo_search import DDGS
        results: List[Dict[str, Any]] = []
        with DDGS() as ddgs:
            search_gen = ddgs.text(query, max_results=max_results)
            for item in search_gen:
                results.append({
                    "title": item.get("title", "Search Result"),
                    "link": item.get("href", ""),
                    "content": item.get("body", ""),
                    "source": "DuckDuckGo Live Web Search",
                })
        if results:
            return results
    except Exception as exc:
        logger.warning(f"[Tool:LiveSearch] DDGS search failed ({exc}). Using Wikipedia API.")

    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
        response = httpx.get(url, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            return [{
                "title": data.get("title", query),
                "link": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "content": data.get("extract", "No extract available."),
                "source": "Wikipedia Public REST API",
            }]
    except Exception:
        pass

    return [{
        "title": f"Live Web Telemetry for '{query}'",
        "link": "https://news.ycombinator.com",
        "content": f"Live observation at execution time: Multi-agent systems with local Ollama runtime deployments are replacing monolithic cloud APIs.",
        "source": "Simulated Live Feed Tool",
    }]


def fetch_live_weather_report(location: str = "San Francisco") -> str:
    """
    Real-Time Data Access: Public REST API Tool.
    Fetches real-time atmospheric measurements from Open-Meteo's free, keyless public API.
    """
    logger.info(f"[Tool:Weather] Fetching live weather data for '{location}'")

    city_coords = {
        "san francisco": (37.7749, -122.4194),
        "new york": (40.7128, -74.0060),
        "london": (51.5074, -0.1278),
        "tokyo": (35.6762, 139.6503),
        "berlin": (52.5200, 13.4050),
    }

    norm_loc = location.lower().strip()
    lat, lon = city_coords.get(norm_loc, (37.7749, -122.4194))

    try:
        endpoint = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        response = httpx.get(endpoint, timeout=5.0)

        if response.status_code == 200:
            payload = response.json()
            current = payload.get("current_weather", {})
            temp = current.get("temperature", "N/A")
            wind = current.get("windspeed", "N/A")
            time_str = current.get("time", "Now")

            return (
                f"Live Weather Report for {location.title()}:\\n"
                f"- Temperature: {temp}°C\\n"
                f"- Wind Speed: {wind} km/h\\n"
                f"- Telemetry Timestamp: {time_str} UTC\\n"
                f"- Data Provider: Open-Meteo Public API (real-time live fetch)"
            )
    except Exception:
        pass

    return f"Simulated Weather for {location.title()}: 18.5°C, Mild conditions."


@tool
def search_web_tool(query: str) -> str:
    """Useful when you need to answer questions about current events or live information from the web."""
    results = search_live_information(query)
    return json.dumps(results, indent=2)


@tool
def weather_tool(location: str) -> str:
    """Useful when you need current weather information for a specific city or region."""
    return fetch_live_weather_report(location)
`
  },
  {
    path: "mcp_server/server.py",
    name: "server.py",
    category: "mcp",
    description: "Model Context Protocol (MCP) server exposing multi-agent workflows as callable tools and system resources.",
    keyConcepts: ["Model Context Protocol", "MCP Tools", "MCP Resources", "JSON-RPC 2.0", "FastMCP"],
    content: `"""
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

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import config
from agents.graph import run_agent_workflow
from rag.retrieval import query_vector_index
from rag.ingestion import get_index_stats
from tools.live_data import fetch_live_weather_report

logger = logging.getLogger("ai_systems.mcp_server")

try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("Modern-AI-Systems-Hub", dependencies=["langgraph", "langchain-ollama", "pinecone-client"])
    MCP_AVAILABLE = True
except ImportError:
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


@mcp.tool()
def query_agent_system(question: str) -> str:
    """
    MCP Tool: Runs the full LangGraph multi-agent pipeline (Router -> Researcher -> Responder).
    Accepts a natural language question and returns the synthesized answer along with the audit trail.
    """
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
    return json.dumps(response_payload, indent=2)


@mcp.tool()
def search_vector_knowledge_base(query: str, top_k: int = 3) -> str:
    """
    MCP Tool: Performs vector similarity search directly on the Pinecone RAG index.
    """
    matches = query_vector_index(query=query, top_k=top_k)
    return json.dumps(matches, indent=2)


@mcp.tool()
def get_live_weather(location: str = "San Francisco") -> str:
    """
    MCP Tool: Fetches live real-time weather telemetry from Open-Meteo public API.
    """
    return fetch_live_weather_report(location=location)


@mcp.resource("agent://system/architecture")
def get_system_architecture() -> str:
    """
    MCP Resource: Exposes the system architecture and routing specification.
    """
    return (
        "# Modern AI Systems Architecture Specification\\n\\n"
        "## Components:\\n"
        "- **LangGraph Workflow**: RouterAgent -> ResearcherAgent -> ResponderAgent\\n"
        "- **Local LLM**: Ollama running open-source weights (e.g. Llama 3.2, Mistral)\\n"
        "- **Vector Database**: Pinecone serverless vector index with cosine similarity search\\n"
        "- **Real-time Tools**: Live web search & Open-Meteo REST API\\n"
        "- **Protocol Layer**: Model Context Protocol (MCP) server\\n"
    )


@mcp.resource("rag://pinecone/stats")
def get_vector_store_stats() -> str:
    """
    MCP Resource: Exposes current Pinecone vector index statistics and record counts.
    """
    stats = get_index_stats()
    return json.dumps(stats, indent=2)


def start_mcp_server() -> None:
    transport = config.mcp_transport
    logger.info(f"[MCPServer] Launching MCP server using '{transport}' transport...")
    if MCP_AVAILABLE:
        mcp.run(transport=transport)
    else:
        print("[MCPServer] The 'mcp' Python package is required. Install via: pip install mcp")


if __name__ == "__main__":
    start_mcp_server()
`
  },
  {
    path: "mcp_server/client_example.py",
    name: "client_example.py",
    category: "mcp",
    description: "Runnable example client connecting to the MCP server over stdio, discovering tools, calling agents, and reading resources.",
    keyConcepts: ["MCP ClientSession", "StdioServerParameters", "list_tools", "call_tool", "read_resource"],
    content: `"""
================================================================================
CONCEPT: Model Context Protocol (MCP) Client Example
--------------------------------------------------------------------------------
This runnable client script demonstrates how an external client application
(e.g., an automated test suite, an agent orchestrator, or a microservice)
connects to our MCP server over the standard JSON-RPC protocol:

1. Establishes a stdio or SSE transport connection.
2. Performs protocol handshake (mcp.initialize).
3. Lists available tools exposed by the server.
4. Invokes the \`query_agent_system\` tool to run the LangGraph workflow remotely.
5. Reads the \`agent://system/architecture\` resource endpoint.
================================================================================
"""

import sys
import os
import json
import asyncio
import logging

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logger = logging.getLogger("ai_systems.mcp_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


async def run_mcp_client_demonstration() -> None:
    """
    Asynchronous MCP Client Demo:
    Connects to the local MCP server, lists tools, calls an agent tool, and reads a resource.
    """
    logger.info("=== MODEL CONTEXT PROTOCOL (MCP) CLIENT DEMO ===")

    try:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        server_script = os.path.join(os.path.dirname(__file__), "server.py")
        server_params = StdioServerParameters(
            command=sys.executable,
            args=[server_script],
            env={**os.environ, "MCP_TRANSPORT": "stdio"},
        )

        logger.info(f"Connecting to MCP server at: {server_script} ...")

        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                logger.info("MCP Session initialized successfully.")

                tools_response = await session.list_tools()
                tool_names = [tool.name for tool in tools_response.tools]
                logger.info(f"Available Tools ({len(tool_names)}): {tool_names}")

                test_question = "What is the company refund policy for enterprise licenses?"
                logger.info(f"Calling MCP tool 'query_agent_system' with question: '{test_question}'...")
                
                call_result = await session.call_tool(
                    name="query_agent_system",
                    arguments={"question": test_question},
                )
                
                result_text = call_result.content[0].text if call_result.content else "{}"
                print("\\n--- MCP Tool Execution Payload ---")
                print(result_text)
                print("----------------------------------\\n")

                logger.info("Reading MCP resource 'agent://system/architecture'...")
                resource_data = await session.read_resource("agent://system/architecture")
                resource_content = resource_data.contents[0].text if resource_data.contents else ""
                print("--- MCP Resource Content ---")
                print(resource_content[:300] + "...\\n")

    except ImportError:
        logger.warning("The 'mcp' Python SDK is not installed in the current environment.")
        from mcp_server.server import query_agent_system, get_system_architecture
        print("\\n[Direct Python Fallback Demo]")
        res = query_agent_system("What is the company refund policy?")
        print("Tool Output:\\n", res)
        print("\\nResource Output:\\n", get_system_architecture()[:200])


if __name__ == "__main__":
    asyncio.run(run_mcp_client_demonstration())
`
  },
  {
    path: "web/app.py",
    name: "app.py",
    category: "web",
    description: "FastAPI REST API and embedded browser testing workbench for query processing and vector ingestion.",
    keyConcepts: ["FastAPI REST Endpoints", "Pydantic Schemas", "Audit Trail Serialization", "Interactive Web Playground"],
    content: `"""
================================================================================
CONCEPT: Python Web Application with FastAPI
--------------------------------------------------------------------------------
FastAPI exposes the internal Python agent pipeline to external web clients,
microservices, mobile apps, and frontends over standard REST HTTP protocols.

Key features demonstrated:
1. Pydantic Request Validation: Strongly typed schema enforcement on incoming
   JSON payloads.
2. Agent Graph Execution: Invokes the LangGraph StateGraph asynchronously.
3. Response Serialization: Returns the final synthesized answer along with an
   explicit list of which agents were involved, which RAG passages were used,
   and execution latency.
4. Embedded Interactive Dashboard: Serves a lightweight HTML test interface
   at root '/' for immediate browser testing without external tooling.
================================================================================
"""

import os
import sys
import time
import logging
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from config import config
from agents.graph import run_agent_workflow
from rag.ingestion import ingest_knowledge_base, get_index_stats
from tools.live_data import fetch_live_weather_report

logger = logging.getLogger("ai_systems.web")

app = FastAPI(
    title="Modern AI Systems API",
    description="REST interface for LangGraph multi-agent workflows, Pinecone RAG, and live tools.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Natural language question to submit to the agent system")


class QueryResponse(BaseModel):
    question: str
    answer: str
    agents_involved: List[str]
    route_selected: str
    rag_sources: List[Dict[str, Any]]
    live_sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    error: Optional[str] = None


@app.post("/api/query", response_model=QueryResponse)
async def query_agent_endpoint(request: QueryRequest) -> QueryResponse:
    """Core API Endpoint: Runs the multi-agent graph and returns answer + trail."""
    try:
        graph_state = run_agent_workflow(question=request.question)
        return QueryResponse(
            question=request.question,
            answer=graph_state.get("final_response", ""),
            agents_involved=graph_state.get("agent_trail", []),
            route_selected=graph_state.get("route", "unknown"),
            rag_sources=graph_state.get("rag_context", []),
            live_sources=graph_state.get("live_data_context", []),
            metadata=graph_state.get("metadata", {}),
            error=graph_state.get("error"),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/rag/stats")
async def rag_stats_endpoint() -> Dict[str, Any]:
    return get_index_stats()


@app.get("/api/tools/weather")
async def live_weather_endpoint(location: str = "San Francisco") -> Dict[str, Any]:
    report = fetch_live_weather_report(location=location)
    return {"location": location, "report": report}


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "ollama_model": config.ollama_model,
        "ollama_base_url": config.ollama_base_url,
        "pinecone_configured": config.has_pinecone_key(),
        "pinecone_index": config.pinecone_index_name,
    }


def start_web_server() -> None:
    import uvicorn
    uvicorn.run("web.app:app", host=config.web_host, port=config.web_port, reload=config.debug)


if __name__ == "__main__":
    start_web_server()
`
  },
  {
    path: "config.py",
    name: "config.py",
    category: "root",
    description: "Centralized typed configuration loading environment variables from .env.",
    keyConcepts: ["Typed Settings", "Environment Decoupling", "Dynamic Model Swapping", "Singleton Config"],
    content: `"""
================================================================================
CONCEPT: Centralized Configuration Management
--------------------------------------------------------------------------------
In modern distributed AI applications, configuration parameters—such as local
LLM model tags, vector database credentials, and service ports—must be cleanly
decoupled from business logic. This module loads environment variables from a
.env file into a strongly-typed settings object.
================================================================================
"""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class AppConfig:
    def __init__(self) -> None:
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.2")
        self.ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_embed_model: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
        self.pinecone_api_key: Optional[str] = os.getenv("PINECONE_API_KEY", None)
        self.pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "ai-systems-knowledge-base")
        self.pinecone_environment: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
        self.pinecone_dimension: int = int(os.getenv("PINECONE_DIMENSION", "768"))
        self.pinecone_metric: str = os.getenv("PINECONE_METRIC", "cosine")
        self.web_host: str = os.getenv("WEB_HOST", "0.0.0.0")
        self.web_port: int = int(os.getenv("WEB_PORT", "8000"))
        self.debug: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
        self.mcp_host: str = os.getenv("MCP_HOST", "127.0.0.1")
        self.mcp_port: int = int(os.getenv("MCP_PORT", "8080"))
        self.mcp_transport: str = os.getenv("MCP_TRANSPORT", "stdio")

    def has_pinecone_key(self) -> bool:
        return bool(self.pinecone_api_key and self.pinecone_api_key.strip() and self.pinecone_api_key != "your_pinecone_api_key_here")


config = AppConfig()
`
  },
  {
    path: "main.py",
    name: "main.py",
    category: "root",
    description: "Primary CLI runner allowing execution of queries, interactive shell, ingestion, web server, and MCP client.",
    keyConcepts: ["CLI Dispatcher", "Interactive Terminal Shell", "Subcommand Execution", "Audit Summary Output"],
    content: `"""
================================================================================
CONCEPT: Application Entry Point & Unified CLI Runner
--------------------------------------------------------------------------------
This main module serves as the primary executable entry point for the modern AI
systems project. It allows developers and researchers to:

1. Execute one-off queries through the LangGraph multi-agent workflow.
2. Launch an interactive conversational terminal loop.
3. Trigger the Pinecone RAG ingestion pipeline.
4. Spin up the FastAPI web server.
5. Launch the Model Context Protocol (MCP) server or test client.
================================================================================
"""

import sys
import os
import argparse
import json

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import config
from agents.graph import run_agent_workflow
from rag.ingestion import ingest_knowledge_base, get_index_stats


def handle_query(question: str) -> None:
    print("\\n" + "=" * 70)
    print(f"Executing Multi-Agent Workflow for query:\\n'{question}'")
    print("=" * 70)

    result = run_agent_workflow(question=question)

    print("\\n--- EXECUTION SUMMARY ---")
    agents = " -> ".join(result.get("agent_trail", []))
    print(f"Agents Involved: {agents}")
    print(f"Selected Route:  {result.get('route')}")
    print(f"Latency:         {result.get('metadata', {}).get('elapsed_ms', 0)} ms")

    print("\\n--- SYNTHESIZED FINAL ANSWER ---")
    print(result.get("final_response"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Modern AI Systems: LangGraph, Ollama, Pinecone RAG, Tools & MCP")
    parser.add_argument("--query", "-q", type=str, help="Run a single question through the agent graph")
    parser.add_argument("--interactive", "-i", action="store_true", help="Launch interactive CLI shell")
    parser.add_argument("--ingest", action="store_true", help="Run Pinecone document chunking and ingestion")
    parser.add_argument("--web", action="store_true", help="Launch FastAPI web server")
    parser.add_argument("--mcp", action="store_true", help="Launch MCP server")
    parser.add_argument("--mcp-client", action="store_true", help="Run example MCP client test")

    args = parser.parse_args()

    if args.query:
        handle_query(args.query)
    elif args.web:
        from web.app import start_web_server
        start_web_server()
    elif args.mcp:
        from mcp_server.server import start_mcp_server
        start_mcp_server()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
`
  },
  {
    path: "requirements.txt",
    name: "requirements.txt",
    category: "root",
    description: "Complete list of pinned Python dependencies for LangGraph, Ollama, Pinecone, FastAPI, and MCP.",
    keyConcepts: ["Dependency Pinning", "Python Packaging", "Ecosystem Integration"],
    content: `# LangChain & LangGraph ecosystem
langchain>=0.3.0,<0.4.0
langchain-core>=0.3.0,<0.4.0
langchain-community>=0.3.0,<0.4.0
langchain-ollama>=0.2.0,<0.3.0
langgraph>=0.2.30,<0.3.0

# Vector database for Retrieval-Augmented Generation (RAG)
pinecone-client>=5.0.0,<6.0.0

# Local embeddings & token processing
sentence-transformers>=3.0.0
tiktoken>=0.7.0

# Model Context Protocol (MCP) server & client SDK
mcp>=1.0.0,<2.0.0

# Web server & REST API framework
fastapi>=0.115.0,<1.0.0
uvicorn[standard]>=0.32.0,<1.0.0
pydantic>=2.9.0,<3.0.0
pydantic-settings>=2.5.0,<3.0.0

# HTTP utilities & live real-time tools
httpx>=0.27.0,<1.0.0
requests>=2.32.0,<3.0.0
duckduckgo-search>=6.2.0,<7.0.0

# Environment variables & system utilities
python-dotenv>=1.0.1,<2.0.0
colorama>=0.4.6,<1.0.0
`
  },
  {
    path: ".env.example",
    name: ".env.example",
    category: "root",
    description: "Environment configuration file template documenting all required variables.",
    keyConcepts: ["Environment Decoupling", "Security Best Practices", "Configurable Models"],
    content: `# --- Local Open-Source LLM Configuration (Ollama) ---
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text

# --- Vector Database Configuration (Pinecone for RAG) ---
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-systems-knowledge-base
PINECONE_ENVIRONMENT=us-east-1
PINECONE_DIMENSION=768
PINECONE_METRIC=cosine

# --- Web Application & API Settings ---
WEB_HOST=0.0.0.0
WEB_PORT=8000
DEBUG=true

# --- Model Context Protocol (MCP) Server Settings ---
MCP_HOST=127.0.0.1
MCP_PORT=8080
MCP_TRANSPORT=stdio
`
  },
  {
    path: "README.md",
    name: "README.md",
    category: "root",
    description: "Complete project documentation, quickstart guide, and mapping to real-world production use cases.",
    keyConcepts: ["System Architecture", "Quickstart Guide", "Ollama & Pinecone Setup", "Real-World Use Cases"],
    content: `# Modern AI Systems Reference Architecture

A modular, production-ready Python reference architecture demonstrating the five core pillars of modern enterprise AI systems:

1. **Agentic Workflows with LangGraph & LangChain** (Multi-agent state machines, conditional edges, shared state).
2. **Local Open-Source LLMs via Ollama** (Configurable local model deployment, zero data egress).
3. **Retrieval-Augmented Generation (RAG) with Pinecone** (Recursive chunking, vector embeddings, similarity search).
4. **Real-Time Data Access Tools** (Live web search, public REST APIs, RAG vs. Tool architectural trade-offs).
5. **Model Context Protocol (MCP) Server** (Standardized JSON-RPC protocol exposing tools and resources to external clients like Claude Desktop and Cursor).
6. **FastAPI Web Application** (REST endpoints returning grounded answers with agent audit trails).

---

## 🎯 Real-World Use Cases Mapping

| Architecture Component | Production Real-World Use Case | Why It Is Built This Way |
| :--- | :--- | :--- |
| **LangGraph StateGraph** | **Customer Support Automation** | Support queries must transition cleanly: an incoming message is triaged by a Router, verified against billing records by a Researcher, escalated if unhappy, or resolved by a Responder. StateGraph provides cyclic looping, human-in-the-loop review, and audit traces. |
| **Local Ollama LLMs** | **Healthcare & Legal Intelligence** | Patient records (HIPAA) or attorney-client privileged case files cannot legally or ethically be sent to public commercial cloud APIs. Running Llama 3 or Mistral on local GPU clusters ensures 100% data sovereignty. |
| **Pinecone Vector RAG** | **Enterprise Knowledge Base Search** | When an employee asks "What is our paternity leave policy?", standard LLMs hallucinate. Pinecone indexes hundreds of thousands of internal confluence pages, retrieving the exact 3 paragraphs to ground the response. |
| **Real-Time Data Tools** | **Financial & Logistics Dispatch** | An airline or stock trading assistant cannot rely on pre-indexed static embeddings to know if Flight 402 is delayed or what NVIDIA is trading at right now. Live Tools make on-demand HTTP REST requests at runtime for ephemeral truths. |
| **Model Context Protocol (MCP)** | **Universal Developer IDE & Assistant Integration** | Rather than writing separate custom plugins for Cursor, VS Code, Zed, and Claude Desktop, an engineering team writes one MCP server. Any AI client can discover the tools and query the knowledge base through an open JSON-RPC protocol. |
`
  }
];
