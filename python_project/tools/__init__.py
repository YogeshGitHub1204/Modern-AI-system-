"""
================================================================================
CONCEPT: Real-Time Data Access & Tool Calling
--------------------------------------------------------------------------------
This package exposes tools that connect agents to the live external world.
Unlike static RAG vectors, tools execute dynamic HTTP network requests or system
functions at runtime to retrieve real-time state.
================================================================================
"""

from .live_data import (
    search_live_information,
    fetch_live_weather_report,
    search_web_tool,
    weather_tool,
)

__all__ = [
    "search_live_information",
    "fetch_live_weather_report",
    "search_web_tool",
    "weather_tool",
]
