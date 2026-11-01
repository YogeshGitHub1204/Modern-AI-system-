export interface SimulatedRagDoc {
  id: string;
  score: number;
  text: string;
  source: string;
  title: string;
  category: string;
}

export interface SimulatedLiveToolData {
  source: string;
  tool: string;
  content: string;
}

export interface SimulatedGraphState {
  question: string;
  route: 'rag' | 'live_tool' | 'both' | 'direct';
  agent_trail: string[];
  rag_context: SimulatedRagDoc[];
  live_data_context: SimulatedLiveToolData[];
  research_notes: string;
  final_response: string;
  metadata: {
    elapsed_ms: number;
    agents_count: number;
    rag_chunks_used: number;
    live_records_used: number;
    ollama_model: string;
    temperature: number;
  };
}

export const KNOWLEDGE_BASE_DOCS = [
  {
    id: "refund_sla_2026_01",
    title: "Corporate Refund & Customer SLA Policy (2026 Edition)",
    source: "knowledge_base/policies/refund_sla_2026.md",
    category: "Customer Support",
    text: "Apex Systems provides a 30-day no-questions-asked refund policy on all enterprise software licenses. To qualify for a tier-1 expedited refund, customers must submit ticket category 'BILLING-REFUND-EXP' via the customer portal. Refunds are credited back to the original payment method within 3 to 5 business days.",
    keywords: ["refund", "policy", "sla", "customer", "billing", "money", "30-day", "license", "portal", "payment"]
  },
  {
    id: "refund_sla_2026_02",
    title: "Enterprise Annual Agreement Pro-Rata Terms",
    source: "knowledge_base/policies/refund_sla_2026.md",
    category: "Customer Support",
    text: "For enterprise annual agreements exceeding $50,000, refunds are pro-rated to the calendar month of termination, and require sign-off from the dedicated Technical Account Manager (TAM). Software license keys will be revoked 24 hours after refund authorization.",
    keywords: ["enterprise", "annual", "agreement", "pro-rated", "tam", "50,000", "revoked", "license"]
  },
  {
    id: "multi_agent_spec_01",
    title: "Multi-Agent System Architecture Specification (v3.4)",
    source: "knowledge_base/engineering/multi_agent_spec_v3.4.md",
    category: "Engineering",
    text: "The Apex AI System architecture is divided into three primary layers: 1. The Routing Layer (RouterAgent) evaluates incoming query intent. 2. The Factual Grounding Layer (ResearcherAgent) connects to the Pinecone vector index for internal RAG retrieval and live real-time tools. 3. The Synthesis Layer (ResponderAgent) formulates the final grounded answer using the local Ollama LLM.",
    keywords: ["architecture", "spec", "agents", "routeragent", "researcheragent", "responderagent", "layers", "pinecone", "ollama"]
  },
  {
    id: "security_sop_01",
    title: "Enterprise Cloud Security & Model Isolation Guidelines",
    source: "knowledge_base/security/cloud_isolation_sop.md",
    category: "Compliance",
    text: "All model weights must execute in zero-egress hardware enclaves using Ollama. Sensitive corporate data must never be transmitted to public cloud LLM endpoints. Vector databases (Pinecone) must be configured with TLS 1.3 encryption in transit and AES-256 at rest. API keys must be injected strictly via environment variables (PINECONE_API_KEY).",
    keywords: ["security", "cloud", "isolation", "ollama", "zero-egress", "encryption", "pinecone", "api_key", "compliance"]
  }
];

export async function fetchLiveWeather(location: string = "San Francisco"): Promise<string> {
  const cityCoords: Record<string, [number, number]> = {
    "san francisco": [37.7749, -122.4194],
    "new york": [40.7128, -74.0060],
    "london": [51.5074, -0.1278],
    "tokyo": [35.6762, 139.6503],
    "berlin": [52.5200, 13.4050],
  };

  const norm = location.toLowerCase().trim();
  const [lat, lon] = cityCoords[norm] || [37.7749, -122.4194];

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    if (res.ok) {
      const data = await res.json();
      const current = data.current_weather;
      return `Live Weather Report for ${location}: Temperature: ${current.temperature}°C, Wind Speed: ${current.windspeed} km/h, Telemetry Timestamp: ${current.time} UTC (Fetched live from Open-Meteo REST API).`;
    }
  } catch {
    // Ignore network failure and return fallback
  }

  return `Live Weather Report for ${location}: 18.2°C, Wind: 14.5 km/h, Clear conditions (Simulated telemetry).`;
}

export function calculateCosineSimilarity(query: string, docKeywords: string[]): number {
  const qWords = query.toLowerCase().split(/\W+/).filter(Boolean);
  let matches = 0;
  for (const w of qWords) {
    if (docKeywords.includes(w)) {
      matches += 1;
    }
  }
  const score = Math.min(0.98, 0.45 + (matches * 0.16) + (Math.random() * 0.05));
  return parseFloat(score.toFixed(4));
}

export async function simulateAgentWorkflow(
  question: string,
  onStep?: (agent: string, stateSnapshot: Partial<SimulatedGraphState>) => void
): Promise<SimulatedGraphState> {
  const startTime = performance.now();
  const qLower = question.toLowerCase();

  // Step 1: Router Agent Node
  let route: 'rag' | 'live_tool' | 'both' | 'direct' = 'both';
  if (qLower.includes('weather') || qLower.includes('today') || qLower.includes('news') || qLower.includes('current')) {
    if (qLower.includes('policy') || qLower.includes('refund') || qLower.includes('spec')) {
      route = 'both';
    } else {
      route = 'live_tool';
    }
  } else if (qLower.includes('policy') || qLower.includes('refund') || qLower.includes('architecture') || qLower.includes('rag') || qLower.includes('security') || qLower.includes('handbook')) {
    route = 'rag';
  } else if (qLower.startsWith('hi') || qLower.startsWith('hello') || qLower.includes('who are you') || qLower.includes('what can you do')) {
    route = 'direct';
  }

  const trail = ['RouterAgent'];
  onStep?.('RouterAgent', {
    question,
    route,
    agent_trail: [...trail],
    research_notes: `Router evaluated query intent and selected route: '${route}'.`
  });

  await new Promise(r => setTimeout(r, 450));

  // Step 2: Researcher Agent Node (if not direct)
  const ragResults: SimulatedRagDoc[] = [];
  const liveResults: SimulatedLiveToolData[] = [];
  const notesList: string[] = [];

  if (route === 'rag' || route === 'both') {
    // Pinecone RAG query
    const scored = KNOWLEDGE_BASE_DOCS.map(doc => ({
      ...doc,
      score: calculateCosineSimilarity(question, doc.keywords)
    })).sort((a, b) => b.score - a.score).slice(0, 2);

    for (const item of scored) {
      ragResults.push({
        id: item.id,
        score: item.score,
        text: item.text,
        source: item.source,
        title: item.title,
        category: item.category,
      });
    }
    notesList.push(`Retrieved ${ragResults.length} document chunks from Pinecone index 'ai-systems-knowledge-base'`);
  }

  if (route === 'live_tool' || route === 'both') {
    trail.push('ResearcherAgent');
    if (qLower.includes('weather')) {
      const weatherText = await fetchLiveWeather('San Francisco');
      liveResults.push({
        source: 'Open-Meteo Live API',
        tool: 'fetch_live_weather_report',
        content: weatherText,
      });
      notesList.push('Executed live Open-Meteo public REST API query');
    } else {
      liveResults.push({
        source: 'DuckDuckGo Live Search',
        tool: 'search_live_information',
        content: `Live Web Telemetry: Multi-agent architectures utilizing local open-source models (Ollama) and vector indices (Pinecone) provide privacy-preserving factual grounding without cloud egress. Query topic: "${question}".`,
      });
      notesList.push('Executed DuckDuckGo live search query');
    }

    onStep?.('ResearcherAgent', {
      route,
      agent_trail: [...trail],
      rag_context: ragResults,
      live_data_context: liveResults,
      research_notes: notesList.join(' · ')
    });

    await new Promise(r => setTimeout(r, 600));
  } else if (route === 'rag') {
    trail.push('ResearcherAgent');
    onStep?.('ResearcherAgent', {
      route,
      agent_trail: [...trail],
      rag_context: ragResults,
      live_data_context: liveResults,
      research_notes: notesList.join(' · ')
    });

    await new Promise(r => setTimeout(r, 500));
  }

  // Step 3: Responder Agent Node
  trail.push('ResponderAgent');

  let finalResponse = '';
  if (route === 'direct') {
    finalResponse = `Hello! I am an enterprise multi-agent system built on LangGraph and local Ollama weights.\n\n` +
      `Here is what I can do:\n` +
      `• Retrieve internal corporate knowledge (policies, SLA, security specs) using Pinecone vector RAG.\n` +
      `• Fetch real-time live data (live weather, web search) through dynamic tools.\n` +
      `• Coordinate specialized agents (RouterAgent → ResearcherAgent → ResponderAgent) over a shared state machine.\n` +
      `• Expose tools and resources over the Model Context Protocol (MCP) for Claude Desktop and Cursor.\n\n` +
      `Ask me about our refund policy, the current weather, or technical architecture specs!`;
  } else {
    const citations: string[] = [];
    if (ragResults.length > 0) {
      citations.push(`Internal Knowledge Base: ${ragResults.map(r => `"${r.title}" (Score: ${r.score})`).join(', ')}`);
    }
    if (liveResults.length > 0) {
      citations.push(`Live Tools: ${liveResults.map(l => l.source).join(', ')}`);
    }

    let coreContent = '';
    if (route === 'rag') {
      coreContent = `Based on our verified internal documentation, Apex Systems enforces a strict 30-day no-questions-asked refund policy on all enterprise software licenses.\n\n` +
        `Key Requirements:\n` +
        `1. Submission: Submit a tier-1 expedited refund ticket under category "BILLING-REFUND-EXP" via the customer portal.\n` +
        `2. Disbursement: Funds are credited to the original payment method within 3 to 5 business days.\n` +
        `3. Enterprise Contracts: For annual agreements exceeding $50,000, refunds are pro-rated to the calendar month of termination and require explicit Technical Account Manager (TAM) authorization.\n` +
        `4. License Deactivation: Software license keys are revoked 24 hours post-authorization.`;
    } else if (route === 'live_tool') {
      coreContent = `Based on live dynamic data retrieved at runtime:\n\n` +
        `${liveResults.map(r => r.content).join('\n\n')}\n\n` +
        `Notice: Unlike RAG vectors which store historical knowledge, this data was fetched dynamically via live HTTP requests.`;
    } else {
      coreContent = `Synthesis of internal knowledge and real-time findings:\n\n` +
        `1. Internal Corporate Benchmark:\n` +
        `Apex Systems offers a 30-day refund window with 3-5 day processing for standard tiers, and pro-rated terms for agreements >$50k with TAM sign-off.\n\n` +
        `2. Live External Telemetry:\n` +
        `${liveResults[0]?.content || 'Current market standard indicates typical 14-30 day SLAs with mandatory audit trails.'}\n\n` +
        `This response was cross-grounded across both vector knowledge and live runtime tools.`;
    }

    finalResponse = `${coreContent}\n\n` +
      `──────────────────────────────────────────────────────────\n` +
      `Grounding Sources:\n${citations.map(c => `• ${c}`).join('\n')}\n` +
      `Agents Executed: ${trail.join(' → ')}`;
  }

  const elapsed = Math.round(performance.now() - startTime);

  const finalState: SimulatedGraphState = {
    question,
    route,
    agent_trail: trail,
    rag_context: ragResults,
    live_data_context: liveResults,
    research_notes: notesList.join(' · ') || 'Direct execution without external lookups.',
    final_response: finalResponse,
    metadata: {
      elapsed_ms: elapsed,
      agents_count: trail.length,
      rag_chunks_used: ragResults.length,
      live_records_used: liveResults.length,
      ollama_model: 'llama3.2',
      temperature: 0.2
    }
  };

  onStep?.('ResponderAgent', finalState);
  return finalState;
}
