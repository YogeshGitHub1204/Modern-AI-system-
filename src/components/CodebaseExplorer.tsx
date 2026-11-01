import React, { useState } from 'react';
import { Copy, Check, Folder, FileCode, Sparkles } from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from '../data/projectFiles';

export const CodebaseExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [highlightConcepts, setHighlightConcepts] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = PROJECT_FILES.filter(f =>
    f.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.keyConcepts.some(c => c.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const categories = [
    { id: 'agents', label: 'agents/' },
    { id: 'rag', label: 'rag/' },
    { id: 'tools', label: 'tools/' },
    { id: 'mcp', label: 'mcp_server/' },
    { id: 'web', label: 'web/' },
    { id: 'root', label: 'root /' },
  ];

  // Helper to detect if a line is a key concept comment
  const isConceptLine = (line: string): { isConcept: boolean; type?: string } => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# LangGraph:') || trimmed.startsWith('# StateGraph:')) {
      return { isConcept: true, type: 'LangGraph' };
    }
    if (trimmed.startsWith('# RAG:') || trimmed.startsWith('# Pinecone:')) {
      return { isConcept: true, type: 'RAG' };
    }
    if (trimmed.startsWith('# Configurable Model:') || trimmed.startsWith('# Local LLM') || trimmed.startsWith('# Local Endpoint:')) {
      return { isConcept: true, type: 'Ollama' };
    }
    if (trimmed.startsWith('# Real-Time') || trimmed.startsWith('# Tool:')) {
      return { isConcept: true, type: 'Tool' };
    }
    if (trimmed.startsWith('# MCP:') || trimmed.startsWith('# MCP Tool:')) {
      return { isConcept: true, type: 'MCP' };
    }
    if (trimmed.startsWith('# CONCEPT:')) {
      return { isConcept: true, type: 'Architecture' };
    }
    return { isConcept: false };
  };

  const lines = selectedFile.content.split('\n');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Interactive Python Codebase Explorer</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Browse every runnable file in the project. Every module begins with a clear plain-language concept block, followed by single-line concept comments above key statements to help you study and publish this on GitHub.
        </p>
      </div>

      {/* Main IDE Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: File Tree Navigation (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="space-y-2">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search files or concepts..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const catFiles = filteredFiles.filter(f => f.category === cat.id);
              if (catFiles.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{cat.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {catFiles.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                          selectedFile.path === file.path
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span className="truncate">{file.path}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          
          {/* File Header Bar */}
          <div className="bg-slate-950/80 px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white">{selectedFile.path}</span>
                <span className="text-[11px] text-slate-400">({lines.length} lines)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setHighlightConcepts(!highlightConcepts)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                  highlightConcepts
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Highlight inline concept comments in code"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Concept Highlighting</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Key Concepts Pills Bar */}
          <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs text-slate-400 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">Concepts:</span>
            {selectedFile.keyConcepts.map((concept, idx) => (
              <span key={idx} className="shrink-0 text-slate-300">
                {concept}{idx < selectedFile.keyConcepts.length - 1 ? ' ·' : ''}
              </span>
            ))}
          </div>

          {/* Code Viewer Body */}
          <div className="p-4 bg-slate-950 overflow-x-auto max-h-[700px] overflow-y-auto font-mono text-xs leading-relaxed select-text">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, index) => {
                  const lineNumber = index + 1;
                  const { isConcept, type } = isConceptLine(line);
                  const shouldHighlight = highlightConcepts && isConcept;

                  return (
                    <tr
                      key={index}
                      className={`transition-colors ${
                        shouldHighlight
                          ? 'bg-indigo-950/50 hover:bg-indigo-950/70 border-l-2 border-indigo-400'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Line Number */}
                      <td className="w-12 text-right pr-4 select-none text-slate-600 font-mono text-[11px] align-top py-0.5">
                        {lineNumber}
                      </td>

                      {/* Code Content */}
                      <td className="text-slate-300 whitespace-pre font-mono py-0.5 pl-2">
                        {shouldHighlight ? (
                          <span className="text-indigo-300 font-semibold flex items-center gap-2">
                            <span>{line}</span>
                            {type && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {type}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className={
                              line.trim().startsWith('#')
                                ? 'text-slate-500 italic'
                                : line.trim().startsWith('"""') || line.trim().startsWith("'''")
                                ? 'text-emerald-300/80'
                                : line.includes('def ') || line.includes('class ')
                                ? 'text-violet-300 font-semibold'
                                : line.includes('import ') || line.includes('from ')
                                ? 'text-sky-300'
                                : 'text-slate-200'
                            }
                          >
                            {line}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
};
