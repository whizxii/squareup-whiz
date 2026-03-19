"""Unified tool registry — built-in, custom HTTP/webhook, and MCP tools."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine

import httpx
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ToolContext:
    """Immutable context passed to every tool handler."""

    user_id: str
    channel_id: str
    agent_id: str


@dataclass(frozen=True)
class ToolResult:
    """Immutable result returned by tool execution."""

    success: bool
    output: Any  # JSON-serializable
    error: str | None = None


# Type alias for built-in tool handlers
ToolHandler = Callable[[dict, ToolContext], Coroutine[Any, Any, ToolResult]]


@dataclass(frozen=True)
class ToolDefinition:
    """Describes a single tool the LLM can invoke."""

    name: str
    display_name: str
    description: str
    category: str
    input_schema: dict
    source: str = "builtin"  # "builtin" | "custom_http" | "custom_webhook" | "mcp"
    requires_confirmation: bool = False
    handler: ToolHandler | None = None
    config: dict = field(default_factory=dict)

    def to_claude_schema(self) -> dict:
        """Convert to Anthropic tool_use format."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

class ToolRegistry:
    """Central registry that merges built-in, custom, and MCP tools."""

    def __init__(self) -> None:
        self._builtins: dict[str, ToolDefinition] = {}

    # -- Registration -------------------------------------------------------

    def register_builtin(self, tool: ToolDefinition) -> None:
        if tool.source != "builtin":
            raise ValueError(f"Cannot register non-builtin tool via register_builtin: {tool.name}")
        if tool.handler is None:
            raise ValueError(f"Built-in tool must have a handler: {tool.name}")
        self._builtins[tool.name] = tool
        logger.debug("Registered built-in tool: %s", tool.name)

    # -- Lookup -------------------------------------------------------------

    def get(self, name: str) -> ToolDefinition | None:
        return self._builtins.get(name)

    def list_builtins(self) -> list[ToolDefinition]:
        return list(self._builtins.values())

    async def get_tools_for_agent(
        self,
        agent_tools_json: str,
        user_id: str,
        custom_tools_json: str | None = None,
        mcp_servers_json: str | None = None,
    ) -> list[ToolDefinition]:
        """Return the merged tool list for an agent.

        Three sources:
        1. Built-in tools from the agent's ``tools`` JSON array
        2. Custom tools (HTTP/webhook) from DB, filtered by agent's custom_tools list
        3. MCP server tools from agent's mcp_servers config
        """
        # 1. Built-in tools
        try:
            tool_names: list[str] = json.loads(agent_tools_json) if agent_tools_json else []
        except (json.JSONDecodeError, TypeError):
            tool_names = []

        tools: list[ToolDefinition] = []
        for name in tool_names:
            builtin = self._builtins.get(name)
            if builtin is not None:
                tools.append(builtin)

        # 2. Custom tools from DB
        custom_tool_ids = _parse_json_list(custom_tools_json)
        if custom_tool_ids:
            custom_tools = await self._load_custom_tools(custom_tool_ids, user_id)
            tools.extend(custom_tools)

        # 3. MCP server tools
        mcp_configs = _parse_json_list(mcp_servers_json)
        if mcp_configs:
            mcp_tools = await self._load_mcp_tools(mcp_configs)
            tools.extend(mcp_tools)

        return tools

    async def _load_custom_tools(
        self, tool_ids: list[str], user_id: str,
    ) -> list[ToolDefinition]:
        """Load custom tools from the database and convert to ToolDefinitions."""
        from app.models.custom_tools import CustomTool
        from app.services.integrations.google_auth import decrypt_tokens

        try:
            async with async_session() as session:
                stmt = (
                    select(CustomTool)
                    .where(
                        CustomTool.id.in_(tool_ids),
                        or_(
                            CustomTool.created_by == user_id,
                            CustomTool.is_shared == True,  # noqa: E712
                        ),
                    )
                )
                result = await session.execute(stmt)
                rows = result.scalars().all()
        except Exception as exc:
            logger.error("Failed to load custom tools: %s", exc)
            return []

        definitions: list[ToolDefinition] = []
        for row in rows:
            _TYPE_SOURCE_MAP = {"http": "custom_http", "openapi": "custom_http", "webhook": "custom_webhook"}
            source = _TYPE_SOURCE_MAP.get(row.tool_type, "custom_webhook")
            try:
                config = decrypt_tokens(row.config) if row.config else {}
            except Exception:
                config = {}
            try:
                input_schema = json.loads(row.input_schema) if row.input_schema else {}
            except (json.JSONDecodeError, TypeError):
                input_schema = {}

            definitions.append(ToolDefinition(
                name=f"custom_{row.name}",
                display_name=row.display_name,
                description=row.description,
                category=row.category,
                input_schema=input_schema,
                source=source,
                requires_confirmation=row.requires_confirmation,
                handler=None,
                config=config,
            ))
        return definitions

    async def _load_mcp_tools(
        self, mcp_configs: list[dict],
    ) -> list[ToolDefinition]:
        """Connect to MCP servers and discover their tools."""
        from app.services.mcp_client import mcp_manager, MCPServerConfig

        tools: list[ToolDefinition] = []
        for cfg in mcp_configs:
            if not isinstance(cfg, dict) or "url" not in cfg:
                continue
            try:
                server_cfg = MCPServerConfig(
                    url=cfg["url"],
                    name=cfg.get("name", "mcp"),
                    headers=cfg.get("headers", {}),
                )
                discovered = await mcp_manager.connect(server_cfg)
                tools.extend(discovered)
            except Exception as exc:
                logger.error("Failed to load MCP tools from %s: %s", cfg.get("url"), exc)
        return tools

    # -- Execution ----------------------------------------------------------

    async def execute(
        self,
        tool_name: str,
        tool_input: dict,
        context: ToolContext,
        *,
        available_tools: list[ToolDefinition] | None = None,
    ) -> ToolResult:
        """Execute a tool by name, dispatching to the correct handler.

        ``available_tools`` is the merged tool list from ``get_tools_for_agent``
        so we can resolve custom and MCP tools that aren't in the builtins dict.
        """
        # Try builtins first, then fall back to the provided available list
        tool = self.get(tool_name)
        if tool is None and available_tools:
            tool = next((t for t in available_tools if t.name == tool_name), None)
        if tool is None:
            return ToolResult(success=False, output=None, error=f"Unknown tool: {tool_name}")

        try:
            if tool.source == "builtin":
                if tool.handler is None:
                    return ToolResult(success=False, output=None, error=f"No handler for tool: {tool_name}")
                return await tool.handler(tool_input, context)

            if tool.source == "custom_http":
                return await self._execute_http_tool(tool, tool_input, context)

            if tool.source == "custom_webhook":
                return await self._execute_webhook_tool(tool, tool_input, context)

            if tool.source == "mcp":
                return await self._execute_mcp_tool(tool, tool_input, context)

            return ToolResult(success=False, output=None, error=f"Unknown tool source: {tool.source}")

        except Exception as exc:
            logger.error("Tool %s execution failed: %s", tool_name, exc)
            return ToolResult(success=False, output=None, error=str(exc)[:500])

    # -- Custom HTTP tools --------------------------------------------------

    async def _execute_http_tool(
        self,
        tool: ToolDefinition,
        tool_input: dict,
        context: ToolContext,  # noqa: ARG002
    ) -> ToolResult:
        """Execute a user-configured HTTP request tool."""
        config = tool.config
        url = config["url_template"].format(**tool_input)
        method: str = config.get("method", "GET").upper()
        headers: dict[str, str] = dict(config.get("headers", {}))
        body = config.get("body_template")

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(method, url, json=body, headers=headers)
            if resp.is_success:
                try:
                    data = resp.json()
                except Exception:
                    data = resp.text
                return ToolResult(success=True, output=data)
            return ToolResult(success=False, output=resp.text, error=f"HTTP {resp.status_code}")

    # -- MCP tools ----------------------------------------------------------

    async def _execute_mcp_tool(
        self,
        tool: ToolDefinition,
        tool_input: dict,
        context: ToolContext,  # noqa: ARG002
    ) -> ToolResult:
        """Execute a tool on a connected MCP server."""
        from app.services.mcp_client import mcp_manager

        mcp_url = tool.config.get("mcp_url", "")
        mcp_tool_name = tool.config.get("mcp_tool_name", "")
        if not mcp_url or not mcp_tool_name:
            return ToolResult(
                success=False, output=None,
                error="MCP tool missing url or tool_name in config",
            )
        return await mcp_manager.call_tool(mcp_url, mcp_tool_name, tool_input)

    # -- Custom Webhook tools -----------------------------------------------

    async def _execute_webhook_tool(
        self,
        tool: ToolDefinition,
        tool_input: dict,
        context: ToolContext,
    ) -> ToolResult:
        """POST to an external webhook (n8n, Zapier, Make.com, etc.)."""
        config = tool.config
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if config.get("secret_header"):
            headers[config["secret_header"]] = config.get("secret_value", "")

        payload = {
            **tool_input,
            "_meta": {"agent_id": context.agent_id, "user_id": context.user_id},
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(config["webhook_url"], json=payload, headers=headers)
            if resp.is_success:
                try:
                    data = resp.json()
                except Exception:
                    data = resp.text
                return ToolResult(success=True, output=data)
            return ToolResult(success=False, output=resp.text, error=f"Webhook returned {resp.status_code}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_json_list(value: str | None) -> list:
    """Safely parse a JSON string expected to be a list."""
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

tool_registry = ToolRegistry()
