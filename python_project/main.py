"""
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

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import config
from agents.graph import run_agent_workflow
from rag.ingestion import ingest_knowledge_base, get_index_stats


def handle_query(question: str) -> None:
    """Runs a single query through the multi-agent graph and prints results."""
    print("\n" + "=" * 70)
    print(f"Executing Multi-Agent Workflow for query:\n'{question}'")
    print("=" * 70)

    # LangGraph: Trigger state graph execution
    result = run_agent_workflow(question=question)

    print("\n--- EXECUTION SUMMARY ---")
    # State Inspection: Display the agents that processed this state
    agents = " -> ".join(result.get("agent_trail", []))
    print(f"Agents Involved: {agents}")
    print(f"Selected Route:  {result.get('route')}")
    print(f"Latency:         {result.get('metadata', {}).get('elapsed_ms', 0)} ms")

    print("\n--- SYNTHESIZED FINAL ANSWER ---")
    print(result.get("final_response"))

    rag_chunks = result.get("rag_context", [])
    if rag_chunks:
        print(f"\n--- PINECONE RAG EVIDENCE ({len(rag_chunks)} chunks) ---")
        for i, c in enumerate(rag_chunks, 1):
            print(f"[{i}] Score: {c.get('score')} | Source: {c.get('metadata', {}).get('source')}")
            print(f"    {c.get('text')[:120]}...\n")

    live_data = result.get("live_data_context", [])
    if live_data:
        print(f"\n--- REAL-TIME TOOLS CONTEXT ({len(live_data)} items) ---")
        for i, d in enumerate(live_data, 1):
            print(f"[{i}] Source: {d.get('source')}")
            print(f"    {str(d.get('content'))[:140]}...\n")

    print("=" * 70 + "\n")


def interactive_mode() -> None:
    """Runs a terminal loop accepting user prompts continuously."""
    print("\n=== Modern AI Systems Interactive Shell ===")
    print(f"Local LLM: {config.ollama_model} ({config.ollama_base_url})")
    print(f"Pinecone:  {'Active' if config.has_pinecone_key() else 'In-Memory Fallback'}")
    print("Type 'exit' or 'quit' to leave.\n")

    while True:
        try:
            q = input("\nEnter Question > ").strip()
            if not q:
                continue
            if q.lower() in ("exit", "quit", "q"):
                print("Exiting.")
                break
            handle_query(q)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break


def main() -> None:
    """CLI Argument Parser & Dispatcher."""
    parser = argparse.ArgumentParser(
        description="Modern AI Systems: LangGraph, Ollama, Pinecone RAG, Tools & MCP"
    )
    parser.add_argument("--query", "-q", type=str, help="Run a single question through the agent graph")
    parser.add_argument("--interactive", "-i", action="store_true", help="Launch interactive CLI shell")
    parser.add_argument("--ingest", action="store_true", help="Run Pinecone document chunking and ingestion")
    parser.add_argument("--web", action="store_true", help="Launch FastAPI web server")
    parser.add_argument("--mcp", action="store_true", help="Launch MCP (Model Context Protocol) server")
    parser.add_argument("--mcp-client", action="store_true", help="Run example MCP client test")
    parser.add_argument("--stats", action="store_true", help="Show Pinecone vector store stats")

    args = parser.parse_args()

    if args.ingest:
        print("[Ingestion] Ingesting internal knowledge documents into vector index...")
        res = ingest_knowledge_base()
        print(json.dumps(res, indent=2))
    elif args.stats:
        print("[Stats] Vector Index Metrics:")
        print(json.dumps(get_index_stats(), indent=2))
    elif args.web:
        print(f"[Web] Starting FastAPI server on http://{config.web_host}:{config.web_port} ...")
        from web.app import start_web_server
        start_web_server()
    elif args.mcp:
        print("[MCP] Launching Model Context Protocol server...")
        from mcp_server.server import start_mcp_server
        start_mcp_server()
    elif args.mcp_client:
        print("[MCP Client] Executing MCP client demonstration...")
        import asyncio
        from mcp_server.client_example import run_mcp_client_demonstration
        asyncio.run(run_mcp_client_demonstration())
    elif args.query:
        handle_query(args.query)
    elif args.interactive:
        interactive_mode()
    else:
        # Default behavior when run with no arguments: show help and run interactive mode
        parser.print_help()
        print("\nStarting interactive mode by default...")
        interactive_mode()


if __name__ == "__main__":
    main()
