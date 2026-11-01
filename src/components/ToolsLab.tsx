import React, { useState } from 'react';
import { Globe, CloudSun, RefreshCw, Layers } from 'lucide-react';
import { fetchLiveWeather } from '../utils/agentSimulator';

export const ToolsLab: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState('San Francisco');
  const [weatherOutput, setWeatherOutput] = useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [searchQuery, setSearchQuery] = useState('LangGraph StateGraph multi-agent architecture');
  const [searchOutput, setSearchOutput] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const handleFetchWeather = async () => {
    setLoadingWeather(true);
    try {
      const report = await fetchLiveWeather(selectedCity);
      setWeatherOutput(report);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleRunSearch = async () => {
    setLoadingSearch(true);
    try {
      // Simulate live public web query
      await new Promise(r => setTimeout(r, 600));
      setSearchOutput(
        `[DuckDuckGo Live Search Result]\n` +
        `Title: Multi-Agent Workflows with LangGraph\n` +
        `Snippet: LangGraph enables developers to build resilient, cyclic multi-agent applications where state is managed across explicit graph vertices and conditional routing edges.\n` +
        `Source: https://python.langchain.com/docs/langgraph/`
      );
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Real-Time Data Access & Tool Calling Lab</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Observe how real-time tools execute dynamic runtime network calls to fetch ephemeral facts that can never be pre-indexed into static vector embeddings.
        </p>
      </div>

      {/* Side-by-side Architectural Comparison: RAG vs Tools */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Architectural Breakdown: Why Tools Differ from RAG</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-4 font-semibold uppercase">Dimension</th>
                <th className="py-2.5 px-4 font-semibold text-emerald-400 uppercase">Retrieval-Augmented Generation (RAG)</th>
                <th className="py-2.5 px-4 font-semibold text-sky-400 uppercase">Real-Time Data Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-300 font-mono">Primary Scope</td>
                <td className="py-3 px-4 text-slate-300">Internal, proprietary, or static documents (policies, handbooks, codebase specs).</td>
                <td className="py-3 px-4 text-slate-300">Ephemeral, dynamic, real-world state (live weather, stock prices, transit, live search).</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-300 font-mono">Storage & Ingestion</td>
                <td className="py-3 px-4 text-slate-300">Requires offline chunking, embedding generation, and indexing in a vector DB (Pinecone).</td>
                <td className="py-3 px-4 text-slate-300">Zero pre-indexing required; operates directly on HTTP endpoints or system RPCs at runtime.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-300 font-mono">Data Freshness</td>
                <td className="py-3 px-4 text-slate-300">As fresh as the latest document ingestion batch (historical/asynchronous).</td>
                <td className="py-3 px-4 text-slate-300">Up-to-the-second live state at the exact moment of execution.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-300 font-mono">Latency Profile</td>
                <td className="py-3 px-4 text-slate-300 font-mono text-emerald-400">10ms – 50ms (ultra-fast nearest neighbor vector match)</td>
                <td className="py-3 px-4 text-slate-300 font-mono text-sky-400">200ms – 1500ms (bound by external network API response times)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-300 font-mono">Action Capability</td>
                <td className="py-3 px-4 text-slate-300">Read-only factual lookup (cannot mutate state).</td>
                <td className="py-3 px-4 text-slate-300">Can perform both reads (APIs) and writes (sending emails, updating databases).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Tool Interactive Playground */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tool 1: Live Weather API */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Tool 1: Open-Meteo Live Weather API</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">tools/live_data.py</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Calls Open-Meteo's free, keyless public meteorological REST API to retrieve real-time atmospheric measurements.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="San Francisco">San Francisco, CA</option>
                <option value="New York">New York, NY</option>
                <option value="London">London, UK</option>
                <option value="Tokyo">Tokyo, Japan</option>
                <option value="Berlin">Berlin, Germany</option>
              </select>

              <button
                onClick={handleFetchWeather}
                disabled={loadingWeather}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {loadingWeather ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudSun className="w-3.5 h-3.5" />}
                <span>Fetch Live</span>
              </button>
            </div>

            {weatherOutput && (
              <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-sky-300 border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                {weatherOutput}
              </pre>
            )}
          </div>
        </div>

        {/* Tool 2: Live Web Search */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Tool 2: Live Web Search Tool</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">tools/live_data.py</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Executes a dynamic query using DuckDuckGo search or fallback public knowledge API for breaking news or fresh web context.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter query to search web live..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />

              <button
                onClick={handleRunSearch}
                disabled={loadingSearch}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {loadingSearch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                <span>Search Live</span>
              </button>
            </div>

            {searchOutput && (
              <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-emerald-300 border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                {searchOutput}
              </pre>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
