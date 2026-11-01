"""
================================================================================
CONCEPT: Model Context Protocol (MCP) Client Example
--------------------------------------------------------------------------------
This runnable client script demonstrates how an external client application
(e.g., an automated test suite, an agent orchestrator, or a microservice)
connects to our MCP server over the standard JSON-RPC protocol:

1. Establishes a stdio or SSE transport connection.
2. Performs protocol handshake (mcp.initialize).
3. Lists available tools exposed by the server.
4. Invokes the `query_agent_system` tool to run the LangGraph workflow remotely.
5. Reads the `agent://system/architecture` resource endpoint.
================================================================================
"""

import sys
import os
import json
import asyncio
import logging

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logger = logging.getLogger("ai_systems.mcp_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


async def run_mcp_client_demonstration() -> None:
    """
    Asynchronous MCP Client Demo:
    Connects to the local MCP server, lists tools, calls an agent tool, and reads a resource.
    """
    logger.info("=== MODEL CONTEXT PROTOCOL (MCP) CLIENT DEMO ===")

    try:
        # MCP Client SDK Imports
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        # Server Parameters: Launch the MCP server as a subprocess communicating via stdin/stdout
        server_script = os.path.join(os.path.dirname(__file__), "server.py")
        server_params = StdioServerParameters(
            command=sys.executable,
            args=[server_script],
            env={**os.environ, "MCP_TRANSPORT": "stdio"},
        )

        logger.info(f"Connecting to MCP server at: {server_script} ...")

        # Transport Handshake: Establish bidirectional stdio pipes
        async with stdio_client(server_params) as (read_stream, write_stream):
            # Session Protocol: Create an MCP client session over the transport
            async with ClientSession(read_stream, write_stream) as session:
                # Handshake: Negotiate protocol version and server capabilities
                await session.initialize()
                logger.info("MCP Session initialized successfully.")

                # Discovery: Request list of callable tools exposed by the server
                # MCP: Query server for all available tools
                tools_response = await session.list_tools()
                tool_names = [tool.name for tool in tools_response.tools]
                logger.info(f"Available Tools ({len(tool_names)}): {tool_names}")

                # Tool Invocation: Call the multi-agent system tool remotely
                test_question = "What is the company refund policy for enterprise licenses?"
                logger.info(f"Calling MCP tool 'query_agent_system' with question: '{test_question}'...")
                
                # MCP: Execute remote tool call via JSON-RPC
                call_result = await session.call_tool(
                    name="query_agent_system",
                    arguments={"question": test_question},
                )
                
                # Parse Result: Extract text content from tool output blocks
                result_text = call_result.content[0].text if call_result.content else "{}"
                logger.info("MCP Tool Response received:")
                print("\n--- MCP Tool Execution Payload ---")
                print(result_text)
                print("----------------------------------\n")

                # Resource Read: Fetch read-only system documentation over MCP
                logger.info("Reading MCP resource 'agent://system/architecture'...")
                # MCP: Fetch resource content by URI
                resource_data = await session.read_resource("agent://system/architecture")
                resource_content = resource_data.contents[0].text if resource_data.contents else ""
                print("--- MCP Resource Content ---")
                print(resource_content[:300] + "...\n")

    except ImportError:
        logger.warning(
            "The 'mcp' Python SDK is not installed in the current environment. "
            "To test live MCP client communication: pip install mcp"
        )
        # Direct fallback demonstration invoking the Python interface directly
        from mcp_server.server import query_agent_system, get_system_architecture
        print("\n[Direct Python Fallback Demo]")
        res = query_agent_system("What is the company refund policy?")
        print("Tool Output:\n", res)
        print("\nResource Output:\n", get_system_architecture()[:200])


if __name__ == "__main__":
    asyncio.run(run_mcp_client_demonstration())
