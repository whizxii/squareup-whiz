"""Channel and message built-in tools."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import select, or_, col

from app.core.db import async_session
from app.models.chat import Channel, Message, ChannelMember
from app.models.users import UserProfile
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def list_channels(inp: dict, ctx: ToolContext) -> ToolResult:
    """List channels the current user can see."""
    limit = min(inp.get("limit", 20), 50)

    async with async_session() as session:
        stmt = (
            select(Channel)
            .where(Channel.is_archived == False)  # noqa: E712
            .order_by(Channel.name)
            .limit(limit)
        )
        results = await session.execute(stmt)
        channels = [
            {
                "id": ch.id,
                "name": ch.name,
                "type": ch.type,
                "description": ch.description,
                "is_default": ch.is_default,
            }
            for ch in results.scalars().all()
        ]

    return ToolResult(success=True, output={"channels": channels, "count": len(channels)})


async def search_messages(inp: dict, ctx: ToolContext) -> ToolResult:
    """Search messages across channels by content."""
    query = inp.get("query", "")
    channel_id = inp.get("channel_id")
    limit = min(inp.get("limit", 10), 25)

    if not query:
        return ToolResult(success=False, output=None, error="query is required")

    async with async_session() as session:
        stmt = (
            select(Message)
            .where(col(Message.content).ilike(f"%{query}%"))
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        if channel_id:
            stmt = stmt.where(Message.channel_id == channel_id)

        results = await session.execute(stmt)
        messages = [
            {
                "id": m.id,
                "channel_id": m.channel_id,
                "sender_id": m.sender_id,
                "sender_type": m.sender_type,
                "content": (m.content or "")[:300],
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in results.scalars().all()
        ]

    return ToolResult(success=True, output={"messages": messages, "count": len(messages)})


async def get_channel_info(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get details about a specific channel."""
    channel_id = inp.get("channel_id", "")
    if not channel_id:
        return ToolResult(success=False, output=None, error="channel_id is required")

    async with async_session() as session:
        channel = await session.get(Channel, channel_id)
        if not channel:
            return ToolResult(success=False, output=None, error=f"Channel {channel_id} not found")

        # Count members
        member_stmt = select(ChannelMember).where(ChannelMember.channel_id == channel_id)
        member_results = await session.execute(member_stmt)
        member_count = len(member_results.scalars().all())

        return ToolResult(success=True, output={
            "id": channel.id,
            "name": channel.name,
            "type": channel.type,
            "description": channel.description,
            "is_default": channel.is_default,
            "member_count": member_count,
            "created_at": channel.created_at.isoformat() if channel.created_at else None,
        })


async def send_channel_message(inp: dict, ctx: ToolContext) -> ToolResult:
    """Send a message to a channel on behalf of the agent."""
    channel_id = inp.get("channel_id", "")
    content = inp.get("content", "")
    if not channel_id or not content:
        return ToolResult(success=False, output=None, error="channel_id and content are required")

    msg = Message(
        id=str(uuid.uuid4()),
        channel_id=channel_id,
        sender_id=ctx.agent_id,
        sender_type="agent",
        content=content,
        created_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(msg)
        await session.commit()

    return ToolResult(success=True, output={"message_id": msg.id, "channel_id": channel_id})


async def get_channel_members(inp: dict, ctx: ToolContext) -> ToolResult:
    """List members of a channel."""
    channel_id = inp.get("channel_id", "")
    if not channel_id:
        return ToolResult(success=False, output=None, error="channel_id is required")

    async with async_session() as session:
        stmt = (
            select(ChannelMember, UserProfile)
            .join(UserProfile, ChannelMember.user_id == UserProfile.firebase_uid)
            .where(ChannelMember.channel_id == channel_id)
        )
        results = await session.execute(stmt)
        members = [
            {
                "user_id": cm.user_id,
                "display_name": up.display_name,
                "email": up.email,
                "role": cm.role,
                "status": up.status,
            }
            for cm, up in results.all()
        ]

    return ToolResult(success=True, output={"members": members, "count": len(members)})


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    """Register all channel/message tools."""

    registry.register_builtin(ToolDefinition(
        name="list_channels",
        display_name="List Channels",
        description="List all active channels in the workspace. Returns channel names, types, and descriptions.",
        category="communication",
        input_schema={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max results (default 20)", "default": 20},
            },
        },
        handler=list_channels,
    ))

    registry.register_builtin(ToolDefinition(
        name="search_messages",
        display_name="Search Messages",
        description="Search chat messages by content, optionally filtered to a specific channel.",
        category="communication",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Text to search for in message content"},
                "channel_id": {"type": "string", "description": "Optional channel UUID to restrict search"},
                "limit": {"type": "integer", "description": "Max results (default 10)", "default": 10},
            },
            "required": ["query"],
        },
        handler=search_messages,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_channel_info",
        display_name="Get Channel Info",
        description="Get details about a specific channel including member count.",
        category="communication",
        input_schema={
            "type": "object",
            "properties": {
                "channel_id": {"type": "string", "description": "UUID of the channel"},
            },
            "required": ["channel_id"],
        },
        handler=get_channel_info,
    ))

    registry.register_builtin(ToolDefinition(
        name="send_channel_message",
        display_name="Send Channel Message",
        description="Send a message to a specific channel. Use this to post updates, notifications, or replies in other channels.",
        category="communication",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "channel_id": {"type": "string", "description": "UUID of the target channel"},
                "content": {"type": "string", "description": "Message text (supports markdown)"},
            },
            "required": ["channel_id", "content"],
        },
        handler=send_channel_message,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_channel_members",
        display_name="Get Channel Members",
        description="List all members of a channel with their display names and roles.",
        category="communication",
        input_schema={
            "type": "object",
            "properties": {
                "channel_id": {"type": "string", "description": "UUID of the channel"},
            },
            "required": ["channel_id"],
        },
        handler=get_channel_members,
    ))
