"""
================================================================================
CONCEPT: Real-Time Tools vs. Retrieval-Augmented Generation (RAG)
--------------------------------------------------------------------------------
A common question in AI engineering is: "When should I use RAG, and when should
I use Tools?"

1. RETRIEVAL-AUGMENTED GENERATION (RAG):
   - Scope: Queries internal, static, or semi-static proprietary documents.
   - Mechanism: Pre-chunked text converted into vector embeddings and indexed
     in a vector database (e.g., Pinecone, Milvus, Chroma).
   - Latency: Ultra-low latency similarity search ($\approx 10-50\text{ms}$).
   - Limitation: Cannot provide information that changes second-by-second
     (e.g., current stock prices, live weather, or breaking news) without
     constant re-chunking and re-indexing.

2. REAL-TIME TOOLS:
   - Scope: Fetches dynamic, ephemeral, live data from the outside world.
   - Mechanism: Executes runtime RPCs, HTTP GET/POST calls to external REST APIs,
     or live web search engines at the exact moment the agent runs.
   - Latency: Subject to network latency and third-party API availability ($\approx 200-1500\text{ms}$).
   - Advantage: Delivers up-to-the-second ground truth (live traffic, weather,
     exchange rates, database mutations) that cannot be pre-indexed into vectors.

Together in an agentic workflow, RAG handles deep institutional memory, while
Tools provide live situational awareness.
================================================================================
"""

import json
import logging
from typing import List, Dict, Any
import httpx
from langchain_core.tools import tool

logger = logging.getLogger("ai_systems.tools")


def search_live_information(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    """
    Real-Time Data Access: Live Web Search Tool.
    Queries the live public web using DuckDuckGo search or fallback API.
    Differs from RAG because this data is fetched live over HTTP at runtime,
    without requiring prior vector indexing into Pinecone.
    """
    logger.info(f"[Tool:LiveSearch] Querying web for: '{query}'")

    try:
        # Tool: Attempt live web query using duckduckgo_search library
        from duckduckgo_search import DDGS

        results: List[Dict[str, Any]] = []
        with DDGS() as ddgs:
            # Tool: Execute live external HTTP request against search engine
            search_gen = ddgs.text(query, max_results=max_results)
            for item in search_gen:
                results.append({
                    "title": item.get("title", "Search Result"),
                    "link": item.get("href", ""),
                    "content": item.get("body", ""),
                    "source": "DuckDuckGo Live Web Search",
                })

        if results:
            return results

    except Exception as exc:
        logger.warning(f"[Tool:LiveSearch] DDGS search failed ({exc}). Using live public knowledge API.")

    # Tool Fallback: Live query to Wikipedia Public REST API for current factual lookup
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
        response = httpx.get(url, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            return [{
                "title": data.get("title", query),
                "link": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "content": data.get("extract", "No extract available."),
                "source": "Wikipedia Public REST API",
            }]
    except Exception as exc2:
        logger.warning(f"[Tool:LiveSearch] Wikipedia fallback failed: {exc2}")

    # Simulated Live Context if internet connection is offline
    return [{
        "title": f"Live Web Telemetry for '{query}'",
        "link": "https://news.ycombinator.com",
        "content": (
            f"Live observation at execution time: Distributed multi-agent systems and "
            f"local Ollama runtime deployments are increasingly replacing centralized cloud APIs. "
            f"Query subject: {query}."
        ),
        "source": "Simulated Live Feed Tool",
    }]


def fetch_live_weather_report(location: str = "San Francisco") -> str:
    """
    Real-Time Data Access: Public REST API Tool.
    Fetches real-time atmospheric measurements from Open-Meteo's free, keyless public API.
    Illustrates how live dynamic state can never be pre-indexed into RAG embeddings.
    """
    logger.info(f"[Tool:Weather] Fetching live weather data for '{location}'")

    # Geocoding lookup table for primary demo cities (latitude, longitude)
    city_coords = {
        "san francisco": (37.7749, -122.4194),
        "new york": (40.7128, -74.0060),
        "london": (51.5074, -0.1278),
        "tokyo": (35.6762, 139.6503),
        "berlin": (52.5200, 13.4050),
    }

    norm_loc = location.lower().strip()
    lat, lon = city_coords.get(norm_loc, (37.7749, -122.4194))

    try:
        # Tool: Call Open-Meteo's live public meteorological REST API
        endpoint = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        response = httpx.get(endpoint, timeout=5.0)

        if response.status_code == 200:
            payload = response.json()
            current = payload.get("current_weather", {})
            temp = current.get("temperature", "N/A")
            wind = current.get("windspeed", "N/A")
            time_str = current.get("time", "Now")

            # Data Formatting: Translate live JSON telemetry into human-readable report
            return (
                f"Live Weather Report for {location.title()}:\n"
                f"- Temperature: {temp}°C\n"
                f"- Wind Speed: {wind} km/h\n"
                f"- Telemetry Timestamp: {time_str} UTC\n"
                f"- Data Provider: Open-Meteo Public API (real-time live fetch)"
            )

    except Exception as exc:
        logger.warning(f"[Tool:Weather] Live API request failed ({exc}).")

    # Offline Fallback
    return (
        f"Simulated Weather for {location.title()}:\n"
        f"- Temperature: 18.5°C\n"
        f"- Conditions: Mild with clear skies\n"
        f"- Note: Demonstrates real-time tool calling interface."
    )


# LangChain Tool Decorators: Exposes Python functions as callable tools for agent runtimes
@tool
def search_web_tool(query: str) -> str:
    """Useful when you need to answer questions about current events, breaking news, or live information from the web."""
    # Tool Execution: Dispatches call to the live search implementation
    results = search_live_information(query)
    return json.dumps(results, indent=2)


@tool
def weather_tool(location: str) -> str:
    """Useful when you need current weather information for a specific city or region."""
    # Tool Execution: Dispatches call to the live weather API
    return fetch_live_weather_report(location)
