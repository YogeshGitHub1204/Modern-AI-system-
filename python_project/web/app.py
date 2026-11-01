"""
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

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

from config import config
from agents.graph import run_agent_workflow
from rag.ingestion import ingest_knowledge_base, get_index_stats
from rag.retrieval import query_vector_index
from tools.live_data import fetch_live_weather_report, search_live_information

logger = logging.getLogger("ai_systems.web")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# FastAPI App Initialization: Create the REST API service instance
app = FastAPI(
    title="Modern AI Systems API",
    description="REST interface for LangGraph multi-agent workflows, Pinecone RAG, and live tools.",
    version="1.0.0",
)

# CORS Middleware: Enable cross-origin requests from web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# PYDANTIC REQUEST & RESPONSE SCHEMAS
# ==============================================================================

class QueryRequest(BaseModel):
    """Pydantic: Validates user query input to the multi-agent graph."""
    question: str = Field(..., min_length=2, description="Natural language question to submit to the agent system")


class QueryResponse(BaseModel):
    """Pydantic: Standard response contract returned by the /api/query endpoint."""
    question: str
    answer: str
    agents_involved: List[str]
    route_selected: str
    rag_sources: List[Dict[str, Any]]
    live_sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    error: Optional[str] = None


class IngestDocument(BaseModel):
    """Pydantic: Document format for RAG vector ingestion."""
    title: str
    content: str
    source: Optional[str] = "api_upload.md"
    category: Optional[str] = "Custom"


class IngestRequest(BaseModel):
    """Pydantic: Batch ingestion request payload."""
    documents: List[IngestDocument]


# ==============================================================================
# REST API ENDPOINTS
# ==============================================================================

@app.post("/api/query", response_model=QueryResponse)
async def query_agent_endpoint(request: QueryRequest) -> QueryResponse:
    """
    Core API Endpoint:
    Accepts user question, passes it into the LangGraph multi-agent StateGraph,
    and returns the synthesized answer and the list of participating agents.
    """
    logger.info(f"[API] Received query: '{request.question}'")

    try:
        # LangGraph Workflow: Run the multi-agent graph synchronously
        graph_state = run_agent_workflow(question=request.question)

        # Response Construction: Map graph output into strongly-typed response
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
        logger.error(f"[API] Query handling failure: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/rag/ingest")
async def ingest_documents_endpoint(payload: IngestRequest) -> Dict[str, Any]:
    """
    RAG Ingestion Endpoint:
    Chunks documents, creates embeddings, and upserts them into the Pinecone index.
    """
    docs_dicts = [d.model_dump() for d in payload.documents]
    # RAG: Trigger chunking, vector embedding, and Pinecone upsert
    result = ingest_knowledge_base(documents=docs_dicts)
    return result


@app.get("/api/rag/stats")
async def rag_stats_endpoint() -> Dict[str, Any]:
    """Returns vector database status, index metrics, and record counts."""
    # RAG: Inspect Pinecone index statistics
    return get_index_stats()


@app.get("/api/tools/weather")
async def live_weather_endpoint(location: str = "San Francisco") -> Dict[str, Any]:
    """Direct testing endpoint for the live meteorological tool."""
    # Real-Time Tool: Fetch live weather report
    report = fetch_live_weather_report(location=location)
    return {"location": location, "report": report}


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint validating system configuration."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "ollama_model": config.ollama_model,
        "ollama_base_url": config.ollama_base_url,
        "pinecone_configured": config.has_pinecone_key(),
        "pinecone_index": config.pinecone_index_name,
    }


# ==============================================================================
# EMBEDDED WEB DASHBOARD (HTML / TAILWIND PLAYGROUND)
# ==============================================================================

@app.get("/", response_class=HTMLResponse)
async def web_dashboard() -> str:
    """Serves a clean HTML test workbench for immediate browser testing."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Modern AI Systems Workbench</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-8 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="border-b border-slate-800 pb-4">
      <h1 class="text-2xl font-bold text-white">Modern AI Systems Architecture</h1>
      <p class="text-slate-400 text-sm mt-1">LangGraph · Ollama · Pinecone RAG · Live Tools · MCP</p>
    </div>

    <!-- Query Input Card -->
    <div class="bg-slate-800/60 p-6 rounded-xl border border-slate-700/60 space-y-4">
      <label class="block text-sm font-medium text-slate-200">Submit Query to Agent Workflow</label>
      <div class="flex gap-2">
        <input id="queryInput" type="text" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. What is our corporate refund SLA policy?" value="What is our corporate refund SLA policy?" />
        <button onclick="submitQuery()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition">Execute Graph</button>
      </div>
      <div class="flex gap-2 text-xs text-slate-400">
        <span>Suggested:</span>
        <button onclick="setQuery('What is our corporate refund SLA policy?')" class="hover:text-indigo-400 underline">Refund Policy (RAG)</button>
        <span>·</span>
        <button onclick="setQuery('What is the current weather in San Francisco?')" class="hover:text-indigo-400 underline">Live Weather (Tool)</button>
        <span>·</span>
        <button onclick="setQuery('Compare our refund policy with current market terms')" class="hover:text-indigo-400 underline">Hybrid (Both)</button>
      </div>
    </div>

    <!-- Results Area -->
    <div id="resultsCard" class="hidden bg-slate-800/60 p-6 rounded-xl border border-slate-700/60 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-700 pb-3">
        <span class="text-sm font-semibold text-white">Agent Execution Trace</span>
        <span id="agentsBadge" class="text-xs text-indigo-400 font-mono"></span>
      </div>
      <div>
        <label class="text-xs uppercase font-mono text-slate-400">Synthesized Answer</label>
        <div id="answerText" class="mt-1 p-4 bg-slate-950 rounded-lg text-sm leading-relaxed whitespace-pre-wrap text-slate-200 border border-slate-800"></div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-xs font-mono">
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div class="text-slate-400 mb-1">RAG Context (Pinecone)</div>
          <div id="ragCount" class="text-slate-300">0 chunks</div>
        </div>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div class="text-slate-400 mb-1">Live Tools Context</div>
          <div id="toolCount" class="text-slate-300">0 records</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function setQuery(text) {
      document.getElementById('queryInput').value = text;
    }
    async function submitQuery() {
      const q = document.getElementById('queryInput').value;
      const card = document.getElementById('resultsCard');
      card.classList.remove('hidden');
      document.getElementById('answerText').innerText = 'Running multi-agent StateGraph...';
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({question: q})
        });
        const data = await res.json();
        document.getElementById('answerText').innerText = data.answer || 'No answer returned.';
        document.getElementById('agentsBadge').innerText = 'Agents: ' + (data.agents_involved || []).join(' → ');
        document.getElementById('ragCount').innerText = (data.rag_sources || []).length + ' chunks retrieved';
        document.getElementById('toolCount').innerText = (data.live_sources || []).length + ' live records fetched';
      } catch (err) {
        document.getElementById('answerText').innerText = 'Error: ' + err.message;
      }
    }
  </script>
</body>
</html>"""


def start_web_server() -> None:
    """Starts the FastAPI web server using uvicorn."""
    import uvicorn
    uvicorn.run(
        "web.app:app",
        host=config.web_host,
        port=config.web_port,
        reload=config.debug,
    )


if __name__ == "__main__":
    start_web_server()
