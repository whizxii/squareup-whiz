"""MCP (Model Context Protocol) client manager.

Manages connections to external MCP servers and discovers/executes their tools.
Each server connection is cached and reused until explicitly disconnected.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.tools.registry import ToolDefinition, ToolResult

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MCPServerConfig:
    """Configuration for connecting to an MCP server."""

    url: str
    name: str
    headers: dict[str, str] = field(default_factory=dict)


class MCPConnectionManager:
    """Manages connections to MCP servers and provides tool discovery + execution.

    Uses the `mcp` Python SDK when available. Falls back to a stub that returns
    helpful error messages when the SDK is not installed.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, Any] = {}  # url -> ClientSession
        self._tools_cache: dict[str, list[ToolDefinition]] = {}  # url -> tools
        self._sdk_available = self._check_sdk()

    @staticmethod
    def _check_sdk() -> bool:
        try:
            import mcp  # noqa: F401
            return True
        except ImportError:
            logger.warning(
                "MCP SDK not installed. Install with: pip install mcp "
                "to enable MCP server connections."
            )
            return False

    async def connect(self, config: MCPServerConfig) -> list[ToolDefinition]:
        """Connect to an MCP server and discover its tools."""
        if not self._sdk_available:
            return []

        if config.url in self._sessions:
            # Already connected — return cached tools
            return self._tools_cache.get(config.url, [])

        try:
            from mcp import ClientSession
            from mcp.client.streamable_http import streamablehttp_client

            read_stream, write_stream, _ = await streamablehttp_client(
                config.url, headers=config.headers
            )
            session = ClientSession(read_stream, write_stream)
            await session.initialize()

            self._sessions[config.url] = session

            # Discover tools
            response = await session.list_tools()
            tools = [
                ToolDefinition(
                    name=f"mcp_{config.name}_{t.name}",
                    display_name=t.name,
                    description=t.description or f"MCP tool: {t.name}",
                    category="external",
                    input_schema=t.inputSchema if hasattr(t, "inputSchema") else {},
                    source="mcp",
                    requires_confirmation=False,
                    handler=None,
                    config={"mcp_url": config.url, "mcp_tool_name": t.name},
                )
                for t in response.tools
            ]
            self._tools_cache[config.url] = tools
            logger.info(
                "Connected to MCP server %s (%s) — discovered %d tools",
                config.name, config.url, len(tools),
            )
            return tools

        except Exception as exc:
            logger.error("Failed to connect to MCP server %s: %s", config.url, exc)
            return []

    async def call_tool(self, url: str, tool_name: str, tool_input: dict) -> ToolResult:
        """Execute a tool on a connected MCP server."""
        session = self._sessions.get(url)
        if session is None:
            return ToolResult(
                success=False, output=None,
                error=f"MCP server not connected: {url}",
            )

        try:
            result = await session.call_tool(tool_name, tool_input)
            # MCP returns content blocks; extract text
            output = _extract_mcp_content(result.content)
            return ToolResult(success=True, output=output)
        except Exception as exc:
            logger.error("MCP tool %s execution failed: %s", tool_name, exc)
            return ToolResult(success=False, output=None, error=str(exc)[:500])

    async def disconnect(self, url: str) -> bool:
        """Disconnect from an MCP server."""
        session = self._sessions.pop(url, None)
        self._tools_cache.pop(url, None)
        if session is not None:
            try:
                await session.close()
            except Exception:
                pass  # Best-effort cleanup
            return True
        return False

    def list_connected(self) -> list[dict]:
        """List all currently connected MCP servers."""
        result = []
        for url, tools in self._tools_cache.items():
            result.append({
                "url": url,
                "tool_count": len(tools),
                "tools": [{"name": t.name, "description": t.description} for t in tools],
            })
        return result

    def get_tools_for_server(self, url: str) -> list[ToolDefinition]:
        """Get cached tools for a connected server."""
        return self._tools_cache.get(url, [])


def _extract_mcp_content(content: list) -> Any:
    """Extract usable content from MCP response content blocks."""
    texts = []
    for block in content:
        if hasattr(block, "text"):
            texts.append(block.text)
        elif hasattr(block, "data"):
            texts.append(block.data)
    combined = "\n".join(texts) if texts else str(content)
    # Try to parse as JSON
    try:
        return json.loads(combined)
    except (json.JSONDecodeError, TypeError):
        return combined


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

mcp_manager = MCPConnectionManager()
