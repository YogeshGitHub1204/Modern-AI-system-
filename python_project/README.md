# Modern AI Systems Reference Architecture

A modular, production-ready Python reference architecture demonstrating the five core pillars of modern enterprise AI systems:

1. **Agentic Workflows with LangGraph & LangChain** (Multi-agent state machines, conditional edges, shared state).
2. **Local Open-Source LLMs via Ollama** (Configurable local model deployment, zero data egress).
3. **Retrieval-Augmented Generation (RAG) with Pinecone** (Recursive chunking, vector embeddings, similarity search).
4. **Real-Time Data Access Tools** (Live web search, public REST APIs, RAG vs. Tool architectural trade-offs).
5. **Model Context Protocol (MCP) Server** (Standardized JSON-RPC protocol exposing tools and resources to external clients like Claude Desktop and Cursor).
6. **FastAPI Web Application** (REST endpoints returning grounded answers with agent audit trails).

Every single file opens with a concept explanation block and includes line-by-line concept comments (e.g. `# LangGraph: this edge routes the state to the next node` or `# RAG: this embeds the user query for vector similarity search`).

---

## 🏛 System Architecture & Topology

```
                  ┌────────────────────────────────────────┐
                  │              User Question             │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │       RouterAgent         │
                        │ (Intent & Path Classifier)│
                        └─────────────┬─────────────┘
                                      │
            ┌─────────────────────────┴────────────────────────┐
            │ [route == 'rag' | 'live_tool' | 'both']          │ [route == 'direct']
            ▼                                                  ▼
┌───────────────────────────┐                                  │
│      ResearcherAgent      │                                  │
│ ┌───────────────────────┐ │                                  │
│ │   Pinecone RAG Index  │ │                                  │
│ │   (Internal Knowledge)│ │                                  │
│ └───────────────────────┘ │                                  │
│ ┌───────────────────────┐ │                                  │
│ │   Live Data Tools     │ │                                  │
│ │   (Weather / Search)  │ │                                  │
│ └───────────────────────┘ │                                  │
└─────────────┬─────────────┘                                  │
              │                                                │
              └───────────────────────┬────────────────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      ResponderAgent       │
                        │ (Context Injection + LLM) │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Final Synthesized Answer + Trail    │
                  └────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
python_project/
├── .env.example              # Template listing all environment variables
├── requirements.txt          # Pinned Python package dependencies
├── config.py                 # Centralized configuration with typed settings
├── main.py                   # Unified CLI entry point (query, web, mcp, ingest)
├── README.md                 # Complete documentation & real-world mapping
│
├── agents/                   # Agentic Workflow Package
│   ├── __init__.py           # Package exports
│   ├── state.py              # AgentGraphState schema (LangGraph shared state)
│   ├── llm.py                # Local Ollama LLM integration & offline fallback
│   ├── router.py             # Router Agent node (intent classification)
│   ├── researcher.py         # Researcher Agent node (RAG + tools execution)
│   ├── responder.py          # Responder Agent node (grounded synthesis)
│   └── graph.py              # LangGraph StateGraph assembly & conditional edges
│
├── rag/                      # Retrieval-Augmented Generation Package
│   ├── __init__.py           # Package exports
│   ├── chunking.py           # Recursive text splitting & metadata preservation
│   ├── embeddings.py         # Dense vector generation & cosine normalization
│   ├── ingestion.py          # Pinecone index management & batch upsert pipeline
│   └── retrieval.py          # Runtime query embedding & nearest-neighbor search
│
├── tools/                    # Real-Time Data Access Package
│   ├── __init__.py           # Package exports
│   └── live_data.py          # Live web search & Open-Meteo REST API tools
│
├── mcp_server/               # Model Context Protocol Package
│   ├── __init__.py           # Package exports
│   ├── server.py             # MCP server exposing agent tools and system resources
│   └── client_example.py     # Runnable client script invoking remote MCP tools
│
└── web/                      # Web Application Package
    ├── __init__.py           # Package exports
    └── app.py                # FastAPI REST API & embedded browser dashboard
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- Python 3.10, 3.11, or 3.12
- [Ollama](https://ollama.com/) installed locally (optional for offline testing, as an educational fallback is built-in)
- A free [Pinecone](https://www.pinecone.io/) account (optional, as an in-memory fallback is included)

### 2. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-username/modern-ai-systems.git
cd modern-ai-systems

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

Edit `.env` to configure your settings:
```ini
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-systems-knowledge-base
PINECONE_ENVIRONMENT=us-east-1
```

---

## 🦙 1. Running with Local Ollama

1. Start the Ollama desktop application or daemon:
   ```bash
   ollama serve
   ```
2. Pull your desired open-source model:
   ```bash
   ollama pull llama3.2
   ```
3. *(Optional)* Pull an embedding model:
   ```bash
   ollama pull nomic-embed-text
   ```

To test swapping models without editing any code, simply change `OLLAMA_MODEL=mistral` or `OLLAMA_MODEL=qwen2.5` in your `.env` file!

---

## 🌲 2. Pinecone Vector Ingestion (RAG)

Run the ingestion script to chunk the internal corporate knowledge base, compute vector embeddings, and upsert them into Pinecone:

```bash
python main.py --ingest
```

Inspect index statistics:
```bash
python main.py --stats
```

*Note: If no Pinecone API key is provided, the system automatically uses the included in-memory vector store with mathematical cosine similarity.*

---

## 🌐 3. Running the FastAPI Web Application

Launch the REST server:
```bash
python main.py --web
# Or directly via uvicorn:
uvicorn web.app:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive Web Workbench**: Visit `http://localhost:8000/` in your browser.
- **Interactive Swagger Docs**: Visit `http://localhost:8000/docs`.
- **Query Endpoint**:
  ```bash
  curl -X POST http://localhost:8000/api/query \
    -H "Content-Type: application/json" \
    -d '{"question": "What is our company refund SLA policy?"}'
  ```

---

## 🔌 4. Running the MCP Server (Model Context Protocol)

Expose the agent pipeline over MCP:

```bash
# Start the MCP server
python main.py --mcp
```

Test the client example:
```bash
python main.py --mcp-client
```

### Connecting to Claude Desktop
Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "modern-ai-systems": {
      "command": "python",
      "args": ["/absolute/path/to/modern-ai-systems/mcp_server/server.py"]
    }
  }
}
```

---

## 🎯 Real-World Use Cases Mapping

Here is how each component in this architecture maps to real-world production systems:

| Architecture Component | Production Real-World Use Case | Why It Is Built This Way |
| :--- | :--- | :--- |
| **LangGraph StateGraph** | **Customer Support Automation** | Support queries must transition cleanly: an incoming message is triaged by a Router, verified against billing records by a Researcher, escalated if unhappy, or resolved by a Responder. StateGraph provides cyclic looping, human-in-the-loop review, and audit traces. |
| **Local Ollama LLMs** | **Healthcare & Legal Intelligence** | Patient records (HIPAA) or attorney-client privileged case files cannot legally or ethically be sent to public commercial cloud APIs. Running Llama 3 or Mistral on local GPU clusters ensures 100% data sovereignty. |
| **Pinecone Vector RAG** | **Enterprise Knowledge Base Search** | When an employee asks "What is our paternity leave policy?" or "How do I rotate our AWS database keys?", standard LLMs hallucinate. Pinecone indexes hundreds of thousands of internal confluence pages, retrieving the exact 3 paragraphs to ground the response. |
| **Real-Time Data Tools** | **Financial & Logistics Dispatch** | An airline or stock trading assistant cannot rely on pre-indexed static embeddings to know if Flight 402 is delayed or what NVIDIA is trading at right now. Live Tools make on-demand HTTP REST requests at runtime for ephemeral truths. |
| **Model Context Protocol (MCP)** | **Universal Developer IDE & Assistant Integration** | Rather than writing separate custom plugins for Cursor, VS Code, Zed, and Claude Desktop, an engineering team writes one MCP server. Any AI client can discover the tools and query the knowledge base through an open JSON-RPC protocol. |
