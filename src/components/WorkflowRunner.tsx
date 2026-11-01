import React, { useState } from 'react';
import { Play, ArrowRight, Database, Globe, Bot, Cpu, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import { simulateAgentWorkflow, SimulatedGraphState } from '../utils/agentSimulator';

const SAMPLE_PRESETS = [
  {
    label: "Refund Policy (RAG Test)",
    query: "What is our corporate refund SLA policy for enterprise software licenses?",
    expectedRoute: "rag",
    description: "Routes to RouterAgent → ResearcherAgent (Pinecone vector search) → ResponderAgent"
  },
  {
    label: "Live Weather (Real-Time Tool)",
    query: "What is the current live weather telemetry in San Francisco?",
    expectedRoute: "live_tool",
    description: "Routes to RouterAgent → ResearcherAgent (Open-Meteo REST API) → ResponderAgent"
  },
  {
    label: "Hybrid Inquiry (RAG + Live Tool)",
    query: "Compare our internal refund policy with current market terms.",
    expectedRoute: "both",
    description: "Routes to RouterAgent → ResearcherAgent (queries both Pinecone & Web search) → ResponderAgent"
  },
  {
    label: "Direct Greeting (No Research)",
    query: "Hello! Can you summarize what this multi-agent system does?",
    expectedRoute: "direct",
    description: "Router detects no lookup needed → routes straight to ResponderAgent"
  }
];

export const WorkflowRunner: React.FC = () => {
  const [query, setQuery] = useState(SAMPLE_PRESETS[0].query);
  const [isRunning, setIsRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<SimulatedGraphState | null>(null);
  const [showStateJson, setShowStateJson] = useState(false);

  const handleExecute = async () => {
    if (!query.trim() || isRunning) return;

    setIsRunning(true);
    setActiveNode('router');

    try {
      const result = await simulateAgentWorkflow(query, (agent, stateSnapshot) => {
        if (agent === 'RouterAgent') {
          setActiveNode('router');
        } else if (agent === 'ResearcherAgent') {
          setActiveNode('researcher');
        } else if (agent === 'ResponderAgent') {
          setActiveNode('responder');
        }
        setCurrentState(prev => ({
          ...(prev || {}),
          ...stateSnapshot
        } as SimulatedGraphState));
      });

      setCurrentState(result);
      setActiveNode('completed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Intro */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">LangGraph Multi-Agent Workflow Runner</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Observe how the <span className="text-slate-200 font-medium">RouterAgent</span>, <span className="text-slate-200 font-medium">ResearcherAgent</span>, and <span className="text-slate-200 font-medium">ResponderAgent</span> pass shared state across a LangGraph <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded text-xs">StateGraph</code> with conditional edges and local Ollama inference.
        </p>
      </div>

      {/* Preset Test Scenarios */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Select Test Scenario
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(preset.query);
              }}
              className={`p-3.5 rounded-xl text-left border transition flex flex-col justify-between ${
                query === preset.query
                  ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm shadow-indigo-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{preset.label}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {preset.expectedRoute}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{preset.query}</p>
              </div>
              <span className="text-[11px] text-indigo-400/80 mt-3 block">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 shadow-sm space-y-3">
        <label htmlFor="query-input" className="block text-xs font-medium text-slate-300">
          User Input Question (Initial State Payload)
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="query-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
            placeholder="Type your question or choose a scenario above..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            onClick={handleExecute}
            disabled={isRunning || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 whitespace-nowrap shadow-sm shadow-indigo-600/30"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Executing Graph...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Run Agent Graph</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Visual Graph Topology */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">LangGraph StateGraph Dynamic Visualizer</h3>
          </div>
          <span className="text-xs text-slate-400">
            {isRunning ? 'Execution in progress...' : currentState ? 'Graph execution finished' : 'Ready'}
          </span>
        </div>

        {/* Node Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          {/* Node 1: Entry Point & RouterAgent */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeNode === 'router'
              ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
              : currentState?.agent_trail?.includes('RouterAgent')
              ? 'bg-slate-900 border-slate-700/90'
              : 'bg-slate-950/60 border-slate-800/60 opacity-70'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase text-indigo-400">Node: router</span>
              <Bot className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="font-semibold text-sm text-white">RouterAgent</div>
            <p className="text-xs text-slate-400 mt-1">Intent classification via local Ollama LLM</p>
            {currentState?.route && (
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Route Chosen:</span>
                <span className="font-mono text-indigo-300 font-semibold uppercase">{currentState.route}</span>
              </div>
            )}
          </div>

          {/* Conditional Branch Arrow */}
          <div className="hidden md:flex flex-col items-center justify-center text-xs text-slate-400 gap-1">
            <span className="text-[11px] font-mono text-slate-400">conditional edge</span>
            <div className="flex items-center gap-1 text-indigo-400">
              <span className="text-[10px] font-mono">path_map</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Node 2: ResearcherAgent */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeNode === 'researcher'
              ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
              : currentState?.agent_trail?.includes('ResearcherAgent')
              ? 'bg-slate-900 border-slate-700/90'
              : currentState?.route === 'direct'
              ? 'bg-slate-950/30 border-slate-800/30 opacity-40 line-through'
              : 'bg-slate-950/60 border-slate-800/60 opacity-70'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase text-emerald-400">Node: researcher</span>
              <div className="flex gap-1">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <Globe className="w-3.5 h-3.5 text-sky-400" />
              </div>
            </div>
            <div className="font-semibold text-sm text-white">ResearcherAgent</div>
            <p className="text-xs text-slate-400 mt-1">Pinecone vector search & live tool retrieval</p>
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>RAG: {currentState?.rag_context?.length || 0} chunks</span>
              <span>Tools: {currentState?.live_data_context?.length || 0} feeds</span>
            </div>
          </div>

          {/* Node 3: ResponderAgent */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeNode === 'responder'
              ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
              : currentState?.agent_trail?.includes('ResponderAgent')
              ? 'bg-slate-900 border-slate-700/90'
              : 'bg-slate-950/60 border-slate-800/60 opacity-70'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase text-violet-400">Node: responder</span>
              <CheckCircle2 className="w-4 h-4 text-violet-300" />
            </div>
            <div className="font-semibold text-sm text-white">ResponderAgent</div>
            <p className="text-xs text-slate-400 mt-1">Prompt context injection & grounded answer</p>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
              <span>Local Model:</span>
              <span className="font-mono text-slate-300">llama3.2</span>
            </div>
          </div>

        </div>
      </div>

      {/* Execution Results View */}
      {currentState && (
        <div className="space-y-6">
          {/* Main Answer Card */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-mono text-slate-400">Final Answer from ResponderAgent</span>
                <div className="text-xs text-slate-400 mt-0.5">
                  Grounded across <span className="text-indigo-300 font-semibold">{currentState.metadata?.rag_chunks_used || 0} Pinecone chunks</span> and <span className="text-indigo-300 font-semibold">{currentState.metadata?.live_records_used || 0} live tool feeds</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-slate-400">
                  Latency: <span className="text-emerald-400 font-semibold">{currentState.metadata?.elapsed_ms || 340} ms</span>
                </div>
                <button
                  onClick={() => setShowStateJson(!showStateJson)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{showStateJson ? 'Hide State' : 'Inspect State'}</span>
                </button>
              </div>
            </div>

            {/* Answer Content */}
            <div className="p-5 bg-slate-950 rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-slate-100 font-sans border border-slate-800/80">
              {currentState.final_response}
            </div>

            {/* Evidence & Grounding Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* RAG Section */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">Pinecone Vector RAG Evidence</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentState.rag_context?.length || 0} matches
                  </span>
                </div>
                {currentState.rag_context && currentState.rag_context.length > 0 ? (
                  <div className="space-y-2.5 mt-2">
                    {currentState.rag_context.map((doc, i) => (
                      <div key={i} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{doc.title}</span>
                          <span className="font-mono text-emerald-400 font-medium">Cosine: {doc.score}</span>
                        </div>
                        <p className="text-slate-400 line-clamp-3 leading-normal">{doc.text}</p>
                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          Source: {doc.source}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-1">No RAG documents retrieved (query routed away from vector store).</p>
                )}
              </div>

              {/* Live Tools Section */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-semibold text-white">Real-Time Tool Telemetry</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentState.live_data_context?.length || 0} feeds
                  </span>
                </div>
                {currentState.live_data_context && currentState.live_data_context.length > 0 ? (
                  <div className="space-y-2.5 mt-2">
                    {currentState.live_data_context.map((tool, i) => (
                      <div key={i} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{tool.source}</span>
                          <span className="font-mono text-sky-400 text-[10px] uppercase">{tool.tool}</span>
                        </div>
                        <p className="text-slate-400 leading-normal">{tool.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-1">No real-time tools executed for this route.</p>
                )}
              </div>

            </div>

            {/* State Inspector Drawer */}
            {showStateJson && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase">AgentGraphState (TypedDict Runtime Memory)</span>
                  <span className="text-[11px] text-indigo-400 font-mono">Immutable LangGraph Snapshot</span>
                </div>
                <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-indigo-200 overflow-x-auto border border-slate-800/90 leading-relaxed">
                  {JSON.stringify(currentState, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
