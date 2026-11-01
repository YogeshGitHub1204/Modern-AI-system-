import React, { useState } from 'react';
import { Terminal, Send, Check, Copy } from 'lucide-react';

export const McpInspector: React.FC = () => {
  const [selectedRpc, setSelectedRpc] = useState<'tools/list' | 'tools/call' | 'resources/read' | 'initialize'>('tools/call');
  const [rpcResponse, setRpcResponse] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const getRpcRequest = () => {
    switch (selectedRpc) {
      case 'initialize':
        return {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            clientInfo: { name: "Claude-Desktop-or-Cursor", version: "1.2.0" },
            capabilities: { tools: {}, resources: {} }
          }
        };
      case 'tools/list':
        return {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {}
        };
      case 'tools/call':
        return {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "query_agent_system",
            arguments: {
              question: "What is the corporate refund SLA policy for software licenses?"
            }
          }
        };
      case 'resources/read':
        return {
          jsonrpc: "2.0",
          id: 4,
          method: "resources/read",
          params: {
            uri: "agent://system/architecture"
          }
        };
    }
  };

  const handleExecuteRpc = () => {
    switch (selectedRpc) {
      case 'initialize':
        setRpcResponse(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: { name: "Modern-AI-Systems-Hub", version: "1.0.0" },
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false }
            }
          }
        }, null, 2));
        break;
      case 'tools/list':
        setRpcResponse(JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          result: {
            tools: [
              {
                name: "query_agent_system",
                description: "Runs full LangGraph multi-agent workflow (Router -> Researcher -> Responder).",
                inputSchema: {
                  type: "object",
                  properties: { question: { type: "string", description: "Natural language query" } },
                  required: ["question"]
                }
              },
              {
                name: "search_vector_knowledge_base",
                description: "Queries Pinecone vector index directly for nearest neighbor text chunks.",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    top_k: { type: "integer", default: 3 }
                  },
                  required: ["query"]
                }
              },
              {
                name: "get_live_weather",
                description: "Fetches live weather telemetry from Open-Meteo REST API.",
                inputSchema: {
                  type: "object",
                  properties: { location: { type: "string", default: "San Francisco" } }
                }
              }
            ]
          }
        }, null, 2));
        break;
      case 'tools/call':
        setRpcResponse(JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  question: "What is the corporate refund SLA policy for software licenses?",
                  answer: "Apex Systems enforces a 30-day no-questions-asked refund policy for enterprise software licenses, credited in 3 to 5 business days. Enterprise agreements >$50k require TAM authorization.",
                  route_selected: "rag",
                  agents_involved: ["RouterAgent", "ResearcherAgent", "ResponderAgent"],
                  rag_sources_count: 2,
                  live_tools_count: 0,
                  execution_metadata: { elapsed_ms: 382, model: "llama3.2" }
                }, null, 2)
              }
            ]
          }
        }, null, 2));
        break;
      case 'resources/read':
        setRpcResponse(JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          result: {
            contents: [
              {
                uri: "agent://system/architecture",
                mimeType: "text/markdown",
                text: "# Modern AI Systems Architecture Specification\n\n- LangGraph: RouterAgent -> ResearcherAgent -> ResponderAgent\n- Local LLM: Ollama (Llama 3.2)\n- Vector DB: Pinecone serverless (AWS us-east-1, dim=768)\n- Tools: DuckDuckGo & Open-Meteo\n- Protocol: Model Context Protocol (MCP)"
              }
            ]
          }
        }, null, 2));
        break;
    }
  };

  const claudeDesktopConfig = `{
  "mcpServers": {
    "modern-ai-systems": {
      "command": "python",
      "args": ["/absolute/path/to/modern-ai-systems/mcp_server/server.py"]
    }
  }
}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Model Context Protocol (MCP) Server & Inspector</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          The Model Context Protocol (MCP) standardizes how local or remote AI agents expose callable tools and read-only resources over JSON-RPC 2.0 to clients like Claude Desktop, Cursor, and Zed.
        </p>
      </div>

      {/* Interactive JSON-RPC 2.0 Sandbox */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Interactive JSON-RPC 2.0 Wire Protocol Simulator</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">mcp_server/server.py</span>
        </div>

        {/* Method Selector Tabs */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: 'tools/call', label: '1. tools/call (Run Multi-Agent Graph)' },
            { id: 'tools/list', label: '2. tools/list (Discover Capabilities)' },
            { id: 'resources/read', label: '3. resources/read (System Architecture)' },
            { id: 'initialize', label: '4. initialize (Protocol Handshake)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedRpc(tab.id as any);
                setRpcResponse(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                selectedRpc === tab.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Request & Response Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Request Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase">Client Request (JSON-RPC 2.0)</span>
              <button
                onClick={handleExecuteRpc}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
              >
                <Send className="w-3 h-3" />
                <span>Send Request</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto min-h-[220px] leading-relaxed">
              {JSON.stringify(getRpcRequest(), null, 2)}
            </pre>
          </div>

          {/* Response Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase">Server Response (MCP Server Output)</span>
              <span className="text-[11px] text-emerald-400 font-mono">Status: 200 OK</span>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto min-h-[220px] leading-relaxed">
              {rpcResponse || "// Click 'Send Request' to inspect JSON-RPC 2.0 response from MCP server"}
            </pre>
          </div>

        </div>
      </div>

      {/* Claude Desktop & Cursor Integration Card */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Connecting Your Python MCP Server to Claude Desktop or Cursor</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(claudeDesktopConfig);
              setCopiedConfig(true);
              setTimeout(() => setCopiedConfig(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
          >
            {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedConfig ? 'Copied' : 'Copy Configuration'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Add the following block to your Claude Desktop configuration file (<code className="text-indigo-300">claude_desktop_config.json</code>). Claude will automatically spawn the Python MCP server process over stdio and enable the <code className="text-indigo-300 font-mono">query_agent_system</code> tool directly inside your desktop chat!
        </p>

        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto">
          {claudeDesktopConfig}
        </pre>
      </div>
    </div>
  );
};
