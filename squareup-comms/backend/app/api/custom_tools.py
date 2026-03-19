"""Custom Tools API — CRUD for user-created HTTP/webhook tools."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.custom_tools import CustomTool
from app.services.integrations.google_auth import encrypt_tokens, decrypt_tokens

router = APIRouter(prefix="/api/custom-tools", tags=["custom-tools"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CustomToolCreateBody(BaseModel):
    name: str = Field(max_length=100)
    display_name: str = Field(max_length=200)
    description: str = Field(max_length=2000)
    tool_type: str = Field(pattern="^(http|webhook|openapi)$")
    category: str = Field(default="custom", max_length=50)
    input_schema: dict = Field(default_factory=dict)
    config: dict = Field(default_factory=dict)  # URL, headers, body template, auth
    requires_confirmation: bool = False
    is_shared: bool = False


class CustomToolUpdateBody(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    category: Optional[str] = Field(default=None, max_length=50)
    input_schema: Optional[dict] = None
    config: Optional[dict] = None
    requires_confirmation: Optional[bool] = None
    is_shared: Optional[bool] = None


class CustomToolResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    tool_type: str
    category: str
    input_schema: dict
    config: dict  # Decrypted for the owner
    requires_confirmation: bool
    created_by: str
    is_shared: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, tool: CustomTool, *, decrypt: bool = True) -> "CustomToolResponse":
        input_schema = _safe_json_loads(tool.input_schema)
        config = _safe_json_loads(tool.config) if not decrypt else _decrypt_config(tool.config)
        return cls(
            id=tool.id,
            name=tool.name,
            display_name=tool.display_name,
            description=tool.description,
            tool_type=tool.tool_type,
            category=tool.category,
            input_schema=input_schema,
            config=config,
            requires_confirmation=tool.requires_confirmation,
            created_by=tool.created_by,
            is_shared=tool.is_shared,
            created_at=tool.created_at,
            updated_at=tool.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_custom_tool(
    body: CustomToolCreateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Create a new custom tool (HTTP, webhook, or OpenAPI)."""
    # Encrypt sensitive config (API keys, webhook secrets, etc.)
    encrypted_config = encrypt_tokens(body.config)

    tool = CustomTool(
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        tool_type=body.tool_type,
        category=body.category,
        input_schema=json.dumps(body.input_schema),
        config=encrypted_config,
        requires_confirmation=body.requires_confirmation,
        created_by=user_id,
        is_shared=body.is_shared,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(tool)
    await session.commit()
    await session.refresh(tool)
    return success_response(CustomToolResponse.from_model(tool).model_dump(mode="json"))


@router.get("")
async def list_custom_tools(
    tool_type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List custom tools visible to the current user (own + shared)."""
    stmt = (
        select(CustomTool)
        .where(
            or_(
                CustomTool.created_by == user_id,
                CustomTool.is_shared == True,  # noqa: E712
            )
        )
        .order_by(CustomTool.created_at.desc())
        .limit(limit)
    )
    if tool_type:
        stmt = stmt.where(CustomTool.tool_type == tool_type)
    result = await session.execute(stmt)
    tools = list(result.scalars().all())
    return success_response([CustomToolResponse.from_model(t).model_dump(mode="json") for t in tools])


@router.get("/{tool_id}")
async def get_custom_tool(
    tool_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Get a single custom tool by ID."""
    tool = await session.get(CustomTool, tool_id)
    if tool is None:
        raise ApiError(status_code=404, detail="Custom tool not found")
    if tool.created_by != user_id and not tool.is_shared:
        raise ApiError(status_code=403, detail="Not your tool")
    return success_response(CustomToolResponse.from_model(tool).model_dump(mode="json"))


@router.put("/{tool_id}")
async def update_custom_tool(
    tool_id: str,
    body: CustomToolUpdateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Update a custom tool's config."""
    tool = await session.get(CustomTool, tool_id)
    if tool is None:
        raise ApiError(status_code=404, detail="Custom tool not found")
    if tool.created_by != user_id:
        raise ApiError(status_code=403, detail="Only the creator can update this tool")

    updates = body.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if field_name == "input_schema":
            tool.input_schema = json.dumps(value or {})
        elif field_name == "config":
            tool.config = encrypt_tokens(value or {})
        else:
            setattr(tool, field_name, value)

    tool.updated_at = datetime.utcnow()
    session.add(tool)
    await session.commit()
    await session.refresh(tool)
    return success_response(CustomToolResponse.from_model(tool).model_dump(mode="json"))


@router.delete("/{tool_id}", status_code=status.HTTP_200_OK)
async def delete_custom_tool(
    tool_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Delete a custom tool."""
    tool = await session.get(CustomTool, tool_id)
    if tool is None:
        raise ApiError(status_code=404, detail="Custom tool not found")
    if tool.created_by != user_id:
        raise ApiError(status_code=403, detail="Only the creator can delete this tool")
    await session.delete(tool)
    await session.commit()
    return success_response({"deleted": True})


@router.post("/test")
async def test_custom_tool(
    body: CustomToolCreateBody,
    user_id: str = Depends(get_current_user),
):
    """Test a custom tool config without saving it."""
    from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, tool_registry

    # Build a temporary ToolDefinition
    _SRC = {"http": "custom_http", "openapi": "custom_http", "webhook": "custom_webhook"}
    source = _SRC.get(body.tool_type, "custom_webhook")
    temp_tool = ToolDefinition(
        name=f"test_{body.name}",
        display_name=body.display_name,
        description=body.description,
        category=body.category,
        input_schema=body.input_schema,
        source=source,
        requires_confirmation=False,
        handler=None,
        config=body.config,
    )
    context = ToolContext(user_id=user_id, channel_id="test", agent_id="test")

    if source == "custom_http":
        result = await tool_registry._execute_http_tool(temp_tool, {}, context)
    else:
        result = await tool_registry._execute_webhook_tool(temp_tool, {}, context)

    return success_response({
        "success": result.success,
        "output": result.output,
        "error": result.error,
    })


# ---------------------------------------------------------------------------
# OpenAPI Import
# ---------------------------------------------------------------------------

class OpenAPIImportBody(BaseModel):
    url: Optional[str] = Field(default=None, description="URL to fetch the OpenAPI spec from")
    spec: Optional[dict] = Field(default=None, description="Inline OpenAPI spec (JSON)")
    base_url_override: Optional[str] = None
    auth_header: Optional[dict] = Field(default=None, description="Auth headers to inject, e.g. {\"Authorization\": \"Bearer xxx\"}")
    category: str = Field(default="external", max_length=50)
    filter_operation_ids: Optional[list[str]] = None
    filter_tags: Optional[list[str]] = None
    max_tools: int = Field(default=50, ge=1, le=200)


@router.post("/import-openapi", status_code=status.HTTP_201_CREATED)
async def import_openapi(
    body: OpenAPIImportBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Import tools from an OpenAPI 3.x spec.

    Provide either ``url`` (to fetch the spec) or ``spec`` (inline JSON).
    Each operation becomes a ``CustomTool`` with ``tool_type='openapi'``.
    """
    from app.services.openapi_parser import fetch_openapi_spec, parse_openapi_spec

    if not body.url and not body.spec:
        raise ApiError(status_code=400, detail="Provide either 'url' or 'spec'")

    # Fetch spec if URL provided
    try:
        spec = body.spec if body.spec else await fetch_openapi_spec(body.url)  # type: ignore[arg-type]
    except Exception as exc:
        raise ApiError(status_code=400, detail=f"Failed to fetch OpenAPI spec: {exc}")

    # Parse
    result = parse_openapi_spec(
        spec,
        base_url_override=body.base_url_override,
        auth_header=body.auth_header,
        category=body.category,
        filter_operation_ids=body.filter_operation_ids,
        filter_tags=body.filter_tags,
        max_tools=body.max_tools,
    )

    if not result.tools:
        return success_response({
            "imported": 0,
            "skipped": list(result.skipped),
            "errors": list(result.errors),
            "api_title": result.title,
            "api_version": result.version,
        })

    # Create CustomTool records for each parsed tool
    created: list[dict] = []
    now = datetime.utcnow()
    for parsed in result.tools:
        encrypted_config = encrypt_tokens(parsed.config)
        tool = CustomTool(
            name=parsed.name,
            display_name=parsed.display_name,
            description=parsed.description,
            tool_type="openapi",
            category=parsed.category,
            input_schema=json.dumps(parsed.input_schema),
            config=encrypted_config,
            requires_confirmation=False,
            created_by=user_id,
            is_shared=False,
            created_at=now,
            updated_at=now,
        )
        session.add(tool)
        await session.flush()
        created.append({
            "id": tool.id,
            "name": parsed.name,
            "display_name": parsed.display_name,
            "description": parsed.description[:120],
        })

    await session.commit()

    return success_response({
        "imported": len(created),
        "tools": created,
        "skipped": list(result.skipped),
        "errors": list(result.errors),
        "api_title": result.title,
        "api_version": result.version,
        "base_url": result.base_url,
    })


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_json_loads(value: str | None) -> dict:
    if not value:
        return {}
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return {}


def _decrypt_config(encrypted: str | None) -> dict:
    """Decrypt tool config; return empty dict on failure."""
    if not encrypted:
        return {}
    try:
        return decrypt_tokens(encrypted)
    except Exception:
        return {}
