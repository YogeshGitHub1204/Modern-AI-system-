import React, { useState } from 'react';
import { Download, Check, Sparkles } from 'lucide-react';
import { downloadProjectZip } from '../utils/zipExport';

export type NavTab = 'workflow' | 'explorer' | 'rag' | 'tools' | 'mcp' | 'docs';

interface TopNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ activeTab, onTabChange }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadProjectZip();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        
        {/* Zone 1: Wordmark Brand Title (Single line text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Modern AI Systems
          </span>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            onClick={() => onTabChange('workflow')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeTab === 'workflow' ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Workflow Runner
            {activeTab === 'workflow' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onTabChange('explorer')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeTab === 'explorer' ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Codebase Explorer
            {activeTab === 'explorer' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onTabChange('rag')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeTab === 'rag' ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            RAG & Vectors
            {activeTab === 'rag' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onTabChange('tools')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeTab === 'tools' ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Live Tools Lab
            {activeTab === 'tools' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onTabChange('mcp')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeTab === 'mcp' ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            MCP Inspector
            {activeTab === 'mcp' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onTabChange('docs')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeTab === 'docs' ? 'text-indigo-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Architecture & Use Cases
            {activeTab === 'docs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Action (Download Complete Python Project) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-sm transition whitespace-nowrap disabled:opacity-50"
            title="Download complete runnable Python project (LangGraph, Ollama, Pinecone, MCP, FastAPI)"
          >
            {downloaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Downloaded .ZIP</span>
              </>
            ) : downloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Packaging...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Python Project (.ZIP)</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Mobile nav row */}
      <div className="lg:hidden flex items-center gap-4 overflow-x-auto pt-3 border-t border-slate-800/60 mt-3 text-xs scrollbar-none">
        <button
          onClick={() => onTabChange('workflow')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'workflow' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : 'text-slate-400'}`}
        >
          Workflow Runner
        </button>
        <button
          onClick={() => onTabChange('explorer')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'explorer' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : 'text-slate-400'}`}
        >
          Codebase Explorer
        </button>
        <button
          onClick={() => onTabChange('rag')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'rag' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : 'text-slate-400'}`}
        >
          RAG & Vectors
        </button>
        <button
          onClick={() => onTabChange('tools')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'tools' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : 'text-slate-400'}`}
        >
          Live Tools
        </button>
        <button
          onClick={() => onTabChange('mcp')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'mcp' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : 'text-slate-400'}`}
        >
          MCP Inspector
        </button>
        <button
          onClick={() => onTabChange('docs')}
          className={`whitespace-nowrap pb-1 ${activeTab === 'docs' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : 'text-slate-400'}`}
        >
          Use Cases
        </button>
      </div>
    </header>
  );
};
