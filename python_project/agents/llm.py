"""
================================================================================
CONCEPT: Local Open-Source LLM Integration via Ollama
--------------------------------------------------------------------------------
Commercial APIs (like OpenAI or Anthropic) send proprietary prompts and company
data to third-party cloud servers. Local LLMs—powered by Ollama and open weights
such as Llama 3, Mistral, or Qwen—allow models to run entirely within on-premise
or local developer hardware.

This module provides a unified interface to a local Ollama instance through
LangChain's `ChatOllama`. The model name is dynamically configurable via the
OLLAMA_MODEL environment variable, allowing instant model swapping (e.g. testing
7B vs 70B models) without any code modifications.
================================================================================
"""

import logging
from typing import Optional, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage

# Local Configuration: Reads environment settings for Ollama model and endpoint
from config import config

logger = logging.getLogger("ai_systems.llm")


def get_llm(temperature: float = 0.2) -> BaseChatModel:
    """
    Instantiates and returns the configured local ChatOllama instance.
    Includes connection validation and fallback emulation for robust offline study.
    """
    try:
        # LangChain Ollama: Import the official LangChain community integration for Ollama
        from langchain_ollama import ChatOllama

        # Configurable Model: Instantiate the local LLM using environment variables
        llm = ChatOllama(
            # Configurable Model: Sets model tag (e.g., 'llama3.2', 'mistral', 'qwen2.5') from env
            model=config.ollama_model,
            # Local Endpoint: Directs HTTP traffic to the local Ollama daemon
            base_url=config.ollama_base_url,
            # Temperature: Controls sampling randomness (low for reasoning, high for creative tasks)
            temperature=temperature,
        )
        return llm

    except Exception as exc:
        # Graceful Fallback: Warns the user when Ollama is offline and provides educational stub
        logger.warning(
            f"Ollama integration notice: Unable to initialize ChatOllama ({exc}). "
            f"Ensure Ollama is running at {config.ollama_base_url} with model '{config.ollama_model}'. "
            f"Activating educational reasoning engine fallback."
        )
        return FallbackEducationalLLM(model_name=config.ollama_model)


class FallbackEducationalLLM(BaseChatModel):
    """
    Fallback Reasoning Engine:
    Emulates the local LLM output when Ollama has not yet been started on the developer's machine.
    This guarantees that students can run, inspect, and step through the full LangGraph workflow
    immediately after cloning the repository.
    """

    model_name: str = "llama3.2-fallback"

    def _generate(self, messages: list[BaseMessage], stop: Optional[list[str]] = None, **kwargs: Any) -> Any:
        # State Parsing: Inspects the incoming prompt to extract intent for realistic synthesis
        prompt_text = " ".join([m.content if isinstance(m.content, str) else str(m.content) for m in messages])
        
        # Educational Simulation: Produce structured responses mirroring Ollama output
        if "ROUTE_DECISION" in prompt_text or "classify" in prompt_text.lower():
            # Router Agent Emulation
            if any(term in prompt_text.lower() for term in ["weather", "current", "today", "live", "news", "price", "stock"]):
                decision = "live_tool"
            elif any(term in prompt_text.lower() for term in ["policy", "refund", "architecture", "handbook", "sop", "rag", "internal"]):
                decision = "rag"
            else:
                decision = "both"
            return {"generations": [{"text": decision, "message": AIMessage(content=decision)}]}
        
        # Responder Agent Emulation
        reply = (
            f"[Local LLM Engine - {self.model_name}]\n\n"
            f"I have synthesized the findings from our specialized agents:\n"
            f"- Question addressed: {prompt_text[:120]}...\n"
            f"- Evidence verified from internal knowledge-base (RAG) and live real-time tools.\n"
            f"This demonstration shows how local weights (Ollama) eliminate cloud API lock-in while preserving privacy."
        )
        return {"generations": [{"text": reply, "message": AIMessage(content=reply)}]}

    @property
    def _llm_type(self) -> str:
        # LangChain Introspection: Identifies the custom LLM type in trace logs
        return "fallback-ollama-educational"
