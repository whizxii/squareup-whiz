"""MCP Server management API — connect, disconnect, list MCP servers."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.services.mcp_client import mcp_manager, MCPServerConfig

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class MCPConnectBody(BaseModel):
    url: str = Field(max_length=500)
    name: str = Field(max_length=100)
    headers: dict[str, str] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/connect", status_code=status.HTTP_200_OK)
async def connect_mcp_server(
    body: MCPConnectBody,
    user_id: str = Depends(get_current_user),
):
    """Connect to an MCP server and discover its tools."""
    config = MCPServerConfig(
        url=body.url,
        name=body.name,
        headers=body.headers,
    )
    tools = await mcp_manager.connect(config)
    if not tools and mcp_manager._sdk_available:
        raise ApiError(
            status_code=400,
            detail=f"Failed to connect to MCP server at {body.url} or no tools discovered",
        )
    return success_response({
        "url": body.url,
        "name": body.name,
        "tools": [{"name": t.name, "description": t.description} for t in tools],
        "tool_count": len(tools),
    })


@router.get("")
async def list_mcp_servers(
    user_id: str = Depends(get_current_user),
):
    """List all connected MCP servers and their tools."""
    servers = mcp_manager.list_connected()
    return success_response({"servers": servers, "count": len(servers)})


@router.delete("/{server_url:path}", status_code=status.HTTP_200_OK)
async def disconnect_mcp_server(
    server_url: str,
    user_id: str = Depends(get_current_user),
):
    """Disconnect from an MCP server."""
    disconnected = await mcp_manager.disconnect(server_url)
    if not disconnected:
        raise ApiError(status_code=404, detail=f"MCP server not connected: {server_url}")
    return success_response({"disconnected": True, "url": server_url})
