"""User/team directory built-in tools."""

from __future__ import annotations

from sqlmodel import select, col

from app.core.db import async_session
from app.models.users import UserProfile
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def list_team_members(inp: dict, ctx: ToolContext) -> ToolResult:
    """List all team members in the workspace."""
    async with async_session() as session:
        stmt = select(UserProfile).order_by(UserProfile.display_name)
        results = await session.execute(stmt)
        members = [
            {
                "user_id": u.firebase_uid,
                "display_name": u.display_name,
                "email": u.email,
                "status": u.status,
                "status_message": u.status_message,
            }
            for u in results.scalars().all()
        ]

    return ToolResult(success=True, output={"members": members, "count": len(members)})


async def get_user_status(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get the current status of a team member."""
    user_id = inp.get("user_id", "")
    if not user_id:
        return ToolResult(success=False, output=None, error="user_id is required")

    async with async_session() as session:
        user = await session.get(UserProfile, user_id)
        if not user:
            return ToolResult(success=False, output=None, error=f"User {user_id} not found")
        return ToolResult(success=True, output={
            "user_id": user.firebase_uid,
            "display_name": user.display_name,
            "status": user.status,
            "status_message": user.status_message,
            "status_emoji": user.status_emoji,
            "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
        })


async def get_user_profile(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get the full profile of a team member by user_id or email."""
    user_id = inp.get("user_id")
    email = inp.get("email")

    if not user_id and not email:
        return ToolResult(success=False, output=None, error="user_id or email is required")

    async with async_session() as session:
        if user_id:
            user = await session.get(UserProfile, user_id)
        else:
            stmt = select(UserProfile).where(col(UserProfile.email).ilike(email))
            result = await session.execute(stmt)
            user = result.scalars().first()

        if not user:
            return ToolResult(success=False, output=None, error="User not found")

        return ToolResult(success=True, output={
            "user_id": user.firebase_uid,
            "display_name": user.display_name,
            "nickname": user.nickname,
            "email": user.email,
            "status": user.status,
            "status_message": user.status_message,
            "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    """Register all user/team tools."""

    registry.register_builtin(ToolDefinition(
        name="list_team_members",
        display_name="List Team Members",
        description="List all team members in the workspace with their names, emails, and online status.",
        category="team",
        input_schema={
            "type": "object",
            "properties": {},
        },
        handler=list_team_members,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_user_status",
        display_name="Get User Status",
        description="Get the current online status and status message of a team member.",
        category="team",
        input_schema={
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Firebase UID of the user"},
            },
            "required": ["user_id"],
        },
        handler=get_user_status,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_user_profile",
        display_name="Get User Profile",
        description="Get the full profile of a team member by user_id or email address.",
        category="team",
        input_schema={
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Firebase UID of the user"},
                "email": {"type": "string", "description": "Email address to look up"},
            },
        },
        handler=get_user_profile,
    ))
