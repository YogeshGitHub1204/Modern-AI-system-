import React from 'react';
import { BookOpen, GitBranch, Shield, Zap, Search, Server } from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const useCases = [
    {
      title: "1. Customer Support Automation (Fintech & SaaS)",
      icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
      component: "LangGraph StateGraph & RouterAgent",
      productionContext: (
        "In production customer support, inquiries must be triaged deterministically: " +
        "a simple greeting needs no backend lookup, a refund status requires internal billing records, " +
        "and a complex dispute needs human escalation. LangGraph provides the cyclic state machine needed to " +
        "transition states, maintain audit trails, and support human-in-the-loop approvals before executing irreversible transactions."
      ),
      exampleFlow: "User says 'Where is my refund?' → RouterAgent classifies as 'rag' → ResearcherAgent checks Pinecone billing docs → ResponderAgent outputs clear SLA timeline."
    },
    {
      title: "2. Healthcare & Legal Research (Zero-Egress Local Models)",
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      component: "Local Open-Source LLMs via Ollama",
      productionContext: (
        "Hospitals (HIPAA) and law firms cannot send patient electronic health records or confidential litigation " +
        "briefs to third-party public cloud APIs. Running Llama 3.2, Mistral, or DeepSeek locally through Ollama ensures " +
        "that all prompt context, embeddings, and reasoning remain locked within local on-premise hardware with zero data leakage."
      ),
      exampleFlow: "Configurable model tag via OLLAMA_MODEL allows instant benchmarking of 8B vs 70B parameter models without changing code."
    },
    {
      title: "3. Internal Enterprise Knowledge-Base Search",
      icon: <Search className="w-5 h-5 text-sky-400" />,
      component: "Pinecone Vector RAG (Ingestion & Retrieval)",
      productionContext: (
        "Enterprise Confluence, Google Docs, and Jira tickets span tens of thousands of pages. General LLMs have no access " +
        "to this private data and will hallucinate company policies. Pinecone splits documents into overlapping 400-char chunks, " +
        "computes dense 768-dim embeddings, and retrieves the top 3 semantically relevant paragraphs in under 30ms to ground the agent."
      ),
      exampleFlow: "User asks 'What is our parental leave policy?' → Nearest neighbor search scores relevant HR policy chunk at 0.92 → LLM synthesizes answer with zero hallucination."
    },
    {
      title: "4. Autonomous Incident Response & Real-Time Logistics",
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      component: "Real-Time Data Tools vs. Vector RAG",
      productionContext: (
        "Static vector databases cannot store dynamic ephemeral state (e.g. 'Is the Kubernetes pod crashing right now?' or " +
        "'What is the current flight arrival time?'). Real-time tools make dynamic runtime HTTP requests against monitoring APIs " +
        "or live web search engines, providing situational awareness alongside deep historical RAG memory."
      ),
      exampleFlow: "User asks 'Why is server CPU spiking and what is the current weather at the datacenter?' → Agent queries both internal SOP docs (RAG) and live API telemetry (Tool)."
    },
    {
      title: "5. Cross-IDE Developer Assistants & Extensibility",
      icon: <Server className="w-5 h-5 text-violet-400" />,
      component: "Model Context Protocol (MCP) Server",
      productionContext: (
        "Before MCP, companies had to write custom plugins for Cursor, VS Code, Zed, and Claude Desktop. " +
        "By exposing the multi-agent system over an MCP server, any modern AI IDE or client application can discover tools, " +
        "read resources (e.g. system architecture manifests), and execute workflows over a standard JSON-RPC 2.0 protocol."
      ),
      exampleFlow: "A developer in Claude Desktop invokes 'query_agent_system' to query company documentation directly from their editor sidebar."
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Modern AI Systems Architecture & Real-World Use Cases</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          A pedagogical mapping of how each component in this codebase translates into production architectures across healthcare, finance, developer tooling, and enterprise SaaS.
        </p>
      </div>

      {/* Production Case Studies Grid */}
      <div className="space-y-4">
        {useCases.map((uc, idx) => (
          <div key={idx} className="p-6 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                {uc.icon}
                <h3 className="text-sm font-semibold text-white">{uc.title}</h3>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                {uc.component}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {uc.productionContext}
            </p>

            <div className="pt-2 flex items-start gap-2 text-xs font-mono text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/60">
              <span className="text-emerald-400 shrink-0 font-semibold">Workflow Trace:</span>
              <span className="text-slate-300">{uc.exampleFlow}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Commenting Standard Reference */}
      <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Project Commenting Standard & Study Guide</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every file in the repository follows a strict educational commenting convention designed for lifelong reference:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="text-indigo-300 font-semibold uppercase">1. File-Level Concept Header</div>
            <pre className="text-[11px] text-slate-400 leading-normal whitespace-pre-wrap">
{`"""
================================================
CONCEPT: LangGraph StateGraph Architecture
------------------------------------------------
Explains why state machines are used, how
shared state dictionaries avoid spaghetti code,
and how conditional edges route execution.
================================================
"""`}
            </pre>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="text-emerald-300 font-semibold uppercase">2. Line-by-Line Concept Badges</div>
            <pre className="text-[11px] text-slate-400 leading-normal whitespace-pre-wrap">
{`# LangGraph: this edge routes state to next node
workflow.add_edge("researcher", "responder")

# RAG: this embeds user query for vector search
query_vector = get_embedding(query)

# Ollama: configurable local model identifier
model = config.ollama_model`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
