"""Reminder built-in tools — set, list, and cancel time-based reminders."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import select

from app.core.db import async_session
from app.models.reminders import Reminder
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reminder_to_dict(r: Reminder) -> dict:
    return {
        "id": r.id,
        "message": r.message,
        "remind_at": r.remind_at.isoformat() if r.remind_at else None,
        "status": r.status,
        "recurrence": r.recurrence,
        "channel_id": r.channel_id,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def set_reminder(inp: dict, ctx: ToolContext) -> ToolResult:
    """Create a reminder for the user at a specific time."""
    message = inp.get("message", "").strip()
    remind_at_raw = inp.get("remind_at", "")

    if not message:
        return ToolResult(success=False, output=None, error="message is required")

    remind_at = _parse_datetime(remind_at_raw)
    if not remind_at:
        return ToolResult(success=False, output=None, error="remind_at must be a valid ISO datetime")
    if remind_at <= datetime.utcnow():
        return ToolResult(success=False, output=None, error="remind_at must be in the future")

    reminder = Reminder(
        id=str(uuid.uuid4()),
        user_id=ctx.user_id,
        created_by_agent=ctx.agent_id,
        message=message,
        remind_at=remind_at,
        channel_id=ctx.channel_id,
        recurrence=inp.get("recurrence"),
        status="pending",
        created_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(reminder)
        await session.commit()
        await session.refresh(reminder)

    return ToolResult(
        success=True,
        output={
            "message": f"Reminder set for {remind_at.isoformat()}",
            "reminder": _reminder_to_dict(reminder),
        },
    )


async def list_reminders(inp: dict, ctx: ToolContext) -> ToolResult:
    """List reminders for the current user, optionally filtered by status."""
    status_filter = inp.get("status")
    limit = min(inp.get("limit", 20), 50)

    async with async_session() as session:
        stmt = (
            select(Reminder)
            .where(Reminder.user_id == ctx.user_id)
            .order_by(Reminder.remind_at)
            .limit(limit)
        )
        if status_filter:
            stmt = stmt.where(Reminder.status == status_filter)
        rows = await session.execute(stmt)
        reminders = [_reminder_to_dict(r) for r in rows.scalars().all()]

    return ToolResult(success=True, output={"reminders": reminders, "count": len(reminders)})


async def cancel_reminder(inp: dict, ctx: ToolContext) -> ToolResult:
    """Cancel a pending reminder by ID."""
    reminder_id = inp.get("reminder_id", "")
    if not reminder_id:
        return ToolResult(success=False, output=None, error="reminder_id is required")

    async with async_session() as session:
        reminder = await session.get(Reminder, reminder_id)
        if not reminder:
            return ToolResult(success=False, output=None, error=f"Reminder {reminder_id} not found")
        if reminder.user_id != ctx.user_id:
            return ToolResult(success=False, output=None, error="You can only cancel your own reminders")
        if reminder.status != "pending":
            return ToolResult(
                success=False, output=None,
                error=f"Reminder is already '{reminder.status}' — only pending reminders can be cancelled",
            )

        reminder.status = "cancelled"
        session.add(reminder)
        await session.commit()

    return ToolResult(success=True, output={"message": f"Reminder cancelled: {reminder.message}"})


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="set_reminder",
        display_name="Set Reminder",
        description="Set a time-based reminder for the user. The reminder will fire at the specified time and post a notification.",
        category="productivity",
        input_schema={
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "The reminder message"},
                "remind_at": {"type": "string", "description": "When to fire the reminder (ISO datetime, e.g. 2025-01-15T09:00:00Z)"},
                "recurrence": {"type": "string", "description": "Optional cron expression for recurring reminders (e.g. '0 9 * * MON-FRI' for weekday mornings)"},
            },
            "required": ["message", "remind_at"],
        },
        handler=set_reminder,
    ))

    registry.register_builtin(ToolDefinition(
        name="list_reminders",
        display_name="List Reminders",
        description="List the current user's reminders, sorted by time. Optionally filter by status (pending/fired/cancelled).",
        category="productivity",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["pending", "fired", "cancelled"], "description": "Filter by reminder status"},
                "limit": {"type": "integer", "description": "Max results (default 20, max 50)"},
            },
        },
        handler=list_reminders,
    ))

    registry.register_builtin(ToolDefinition(
        name="cancel_reminder",
        display_name="Cancel Reminder",
        description="Cancel a pending reminder by ID so it will not fire.",
        category="productivity",
        input_schema={
            "type": "object",
            "properties": {
                "reminder_id": {"type": "string", "description": "The reminder ID to cancel"},
            },
            "required": ["reminder_id"],
        },
        handler=cancel_reminder,
    ))
