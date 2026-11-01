import { useState } from 'react';
import { TopNav, NavTab } from './components/TopNav';
import { WorkflowRunner } from './components/WorkflowRunner';
import { CodebaseExplorer } from './components/CodebaseExplorer';
import { RagPlayground } from './components/RagPlayground';
import { ToolsLab } from './components/ToolsLab';
import { McpInspector } from './components/McpInspector';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { Download } from 'lucide-react';
import { downloadProjectZip } from './utils/zipExport';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('workflow');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadProjectZip();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Bar adhering to 3-zone contract */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'workflow' && <WorkflowRunner />}
        {activeTab === 'explorer' && <CodebaseExplorer />}
        {activeTab === 'rag' && <RagPlayground />}
        {activeTab === 'tools' && <ToolsLab />}
        {activeTab === 'mcp' && <McpInspector />}
        {activeTab === 'docs' && <ArchitectureDocs />}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 px-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Modern AI Systems Reference Architecture</span>
            <span aria-hidden="true">·</span>
            <span>LangGraph & LangChain</span>
            <span aria-hidden="true">·</span>
            <span>Local Ollama LLMs</span>
            <span aria-hidden="true">·</span>
            <span>Pinecone Vector RAG</span>
            <span aria-hidden="true">·</span>
            <span>Model Context Protocol (MCP)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="hover:text-indigo-400 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Project (.ZIP)</span>
            </button>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400">Ready to publish on GitHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
