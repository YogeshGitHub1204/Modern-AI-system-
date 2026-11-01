import React, { useState } from 'react';
import { Database, Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import { KNOWLEDGE_BASE_DOCS, calculateCosineSimilarity } from '../utils/agentSimulator';

export const RagPlayground: React.FC = () => {
  const [sampleText, setSampleText] = useState(
    "Apex Systems provides a 30-day no-questions-asked refund policy on all enterprise software licenses. " +
    "To qualify for a tier-1 expedited refund, customers must submit ticket category 'BILLING-REFUND-EXP' via the customer portal. " +
    "Refunds are credited back to the original payment method within 3 to 5 business days. " +
    "For enterprise annual agreements exceeding $50,000, refunds are pro-rated to the calendar month of termination, " +
    "and require sign-off from the dedicated Technical Account Manager (TAM)."
  );

  const [chunkSize, setChunkSize] = useState(220);
  const [chunkOverlap, setChunkOverlap] = useState(45);

  const [testQuery, setTestQuery] = useState("What is the refund SLA timeframe?");
  const [topK, setTopK] = useState(3);

  // Dynamic chunking calculation
  const generateChunks = () => {
    const words = sampleText.split(' ');
    const chunks: { id: number; text: string; overlapStart: string; body: string }[] = [];
    let current = '';
    let lastOverlap = '';
    let counter = 1;

    for (const w of words) {
      if ((current + ' ' + w).length > chunkSize) {
        if (current) {
          const overlapText = current.slice(-chunkOverlap);
          chunks.push({
            id: counter++,
            text: current.trim(),
            overlapStart: lastOverlap,
            body: current.slice(lastOverlap.length).trim()
          });
          lastOverlap = overlapText;
          current = overlapText + ' ' + w;
        } else {
          current = w;
        }
      } else {
        current = (current + ' ' + w).trim();
      }
    }
    if (current) {
      chunks.push({
        id: counter++,
        text: current.trim(),
        overlapStart: lastOverlap,
        body: current.slice(lastOverlap.length).trim()
      });
    }
    return chunks;
  };

  const chunks = generateChunks();

  // Dynamic cosine similarity scoring on knowledge base
  const searchResults = KNOWLEDGE_BASE_DOCS.map(doc => ({
    ...doc,
    score: calculateCosineSimilarity(testQuery, doc.keywords)
  })).sort((a, b) => b.score - a.score).slice(0, topK);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">RAG & Pinecone Vector Laboratory</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Understand how Retrieval-Augmented Generation (RAG) breaks large documents into discrete overlapping chunks, generates high-dimensional embeddings, and executes vector similarity searches using cosine distance in Pinecone.
        </p>
      </div>

      {/* Part 1: Document Chunking Simulator */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Part 1: Ingestion & Recursive Document Chunking</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">rag/chunking.py</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls & Input */}
          <div className="space-y-4">
            <div>
              <label htmlFor="raw-document-input" className="block text-xs font-medium text-slate-300 mb-1.5">Raw Internal Document Text</label>
              <textarea
                id="raw-document-input"
                rows={5}
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Chunk Size:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{chunkSize} chars</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="400"
                  step="10"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Chunk Overlap:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{chunkOverlap} chars</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 leading-normal">
              <strong className="text-slate-200">Why chunk overlap matters:</strong> Overlap prevents sentences sliced at arbitrary character boundaries from losing context. The trailing <span className="text-emerald-300 font-mono">{chunkOverlap} chars</span> are carried into the subsequent chunk.
            </div>
          </div>

          {/* Generated Chunks View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Resulting Vector Chunks ({chunks.length})</span>
              <span className="text-[11px] font-mono text-slate-400">Embedding target: 768-dim</span>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {chunks.map((c) => (
                <div key={c.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1 font-mono">
                    <span className="text-indigo-400 font-semibold">Chunk #{c.id}</span>
                    <span>{c.text.length} chars</span>
                  </div>
                  <div className="text-slate-300 pt-1 leading-relaxed">
                    {c.overlapStart && (
                      <span className="bg-emerald-950/60 text-emerald-300 px-1 py-0.5 rounded mr-1 font-mono text-[11px]" title="Overlapped context from previous chunk">
                        [overlap: ...{c.overlapStart}]
                      </span>
                    )}
                    <span>{c.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: Vector Similarity Search Simulator */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Part 2: Runtime Vector Similarity Search (Pinecone Cosine Distance)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">rag/retrieval.py</span>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="rag-query-input" className="block text-xs font-medium text-slate-300 mb-1.5">Runtime Query to Embed & Match</label>
              <input
                id="rag-query-input"
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="w-32">
              <label htmlFor="top-k-select" className="block text-xs font-medium text-slate-300 mb-1.5">Top K Results</label>
              <select
                id="top-k-select"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Top 1</option>
                <option value={2}>Top 2</option>
                <option value={3}>Top 3</option>
                <option value={4}>All</option>
              </select>
            </div>
          </div>

          {/* Mathematical Formula Callout */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
            <div className="text-slate-300">
              <span className="text-indigo-400 font-semibold">Mathematical Formula:</span> Cosine Similarity = (q · d) / (||q|| · ||d||)
            </div>
            <div className="text-slate-400">
              Pinecone Metric: <span className="text-emerald-400">cosine</span> · Dimension: <span className="text-emerald-400">768</span>
            </div>
          </div>

          {/* Results Grid */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nearest Neighbor Chunks Retrieved From Index
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {searchResults.map((doc, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Rank #{idx + 1}</span>
                      <span className="text-emerald-400 font-bold">Similarity: {doc.score}</span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-1">{doc.title}</div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-4">{doc.text}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="truncate">{doc.category}</span>
                    <span className="text-indigo-400 flex items-center gap-1">
                      Injected into LLM <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Part 3: Pinecone Architecture Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Vector Index Namespace</div>
          <div className="font-mono text-sm text-white font-semibold">ai-systems-knowledge-base</div>
          <p className="text-xs text-slate-500 mt-1">Configurable via <code className="text-indigo-300">PINECONE_INDEX_NAME</code></p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Serverless Cloud Region</div>
          <div className="font-mono text-sm text-white font-semibold">AWS (us-east-1)</div>
          <p className="text-xs text-slate-500 mt-1">Zero-idle scaling serverless infrastructure</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Offline Fallback Vector Store</div>
          <div className="font-mono text-sm text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Active in Repo
          </div>
          <p className="text-xs text-slate-500 mt-1">Runs out-of-the-box before adding Pinecone API key</p>
        </div>
      </div>
    </div>
  );
};
