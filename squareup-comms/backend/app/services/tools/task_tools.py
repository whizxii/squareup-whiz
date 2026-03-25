"""Task built-in tools — create, list, update, complete, and assign tasks."""

from __future__ import annotations

import json
import uuid
from datetime import datetime

from sqlmodel import select

from app.core.db import async_session
from app.models.tasks import Task
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _task_to_dict(t: Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "assigned_to": t.assigned_to,
        "created_by": t.created_by,
        "created_by_type": t.created_by_type,
        "status": t.status,
        "priority": t.priority,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "channel_id": t.channel_id,
        "tags": json.loads(t.tags) if t.tags else [],
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def create_task(inp: dict, ctx: ToolContext) -> ToolResult:
    """Create a new task."""
    title = inp.get("title", "").strip()
    if not title:
        return ToolResult(success=False, output=None, error="title is required")

    assigned_to = inp.get("assigned_to", ctx.user_id)
    priority = inp.get("priority", "medium")
    if priority not in ("low", "medium", "high", "urgent"):
        return ToolResult(success=False, output=None, error=f"Invalid priority: {priority}")

    # Validate channel_id exists before using it as FK
    resolved_channel_id = None
    if ctx.channel_id and ctx.channel_id != "direct":
        async with async_session() as session:
            from app.models.chat import Channel
            ch = await session.get(Channel, ctx.channel_id)
            if ch:
                resolved_channel_id = ctx.channel_id

    task = Task(
        id=str(uuid.uuid4()),
        title=title,
        description=inp.get("description"),
        assigned_to=assigned_to,
        created_by=ctx.agent_id,
        created_by_type="agent",
        status="todo",
        priority=priority,
        due_date=_parse_datetime(inp.get("due_date")),
        channel_id=resolved_channel_id,
        tags=json.dumps(inp.get("tags", [])),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(task)
        await session.commit()
        await session.refresh(task)

    return ToolResult(success=True, output={"message": f"Task created: {title}", "task": _task_to_dict(task)})


async def list_tasks(inp: dict, ctx: ToolContext) -> ToolResult:
    """List tasks with optional filters."""
    assigned_to = inp.get("assigned_to")
    status = inp.get("status")
    priority = inp.get("priority")
    limit = min(inp.get("limit", 20), 50)

    async with async_session() as session:
        stmt = select(Task).order_by(Task.created_at.desc()).limit(limit)
        if assigned_to:
            stmt = stmt.where(Task.assigned_to == assigned_to)
        if status:
            stmt = stmt.where(Task.status == status)
        if priority:
            stmt = stmt.where(Task.priority == priority)
        rows = await session.execute(stmt)
        tasks = [_task_to_dict(t) for t in rows.scalars().all()]

    return ToolResult(success=True, output={"tasks": tasks, "count": len(tasks)})


async def update_task(inp: dict, ctx: ToolContext) -> ToolResult:
    """Update a task's fields (title, description, priority, due_date, status)."""
    task_id = inp.get("task_id", "")
    if not task_id:
        return ToolResult(success=False, output=None, error="task_id is required")

    async with async_session() as session:
        task = await session.get(Task, task_id)
        if not task:
            return ToolResult(success=False, output=None, error=f"Task {task_id} not found")

        if task.created_by != ctx.user_id and task.assigned_to != ctx.user_id:
            return ToolResult(success=False, output=None, error="Not authorized to update this task")

        # Apply updates immutably — build new values then set
        if "title" in inp:
            task.title = inp["title"]
        if "description" in inp:
            task.description = inp["description"]
        if "priority" in inp:
            if inp["priority"] not in ("low", "medium", "high", "urgent"):
                return ToolResult(success=False, output=None, error=f"Invalid priority: {inp['priority']}")
            task.priority = inp["priority"]
        if "due_date" in inp:
            task.due_date = _parse_datetime(inp["due_date"])
        if "status" in inp:
            if inp["status"] not in ("todo", "in_progress", "done"):
                return ToolResult(success=False, output=None, error=f"Invalid status: {inp['status']}")
            task.status = inp["status"]
        if "tags" in inp:
            task.tags = json.dumps(inp["tags"])

        task.updated_at = datetime.utcnow()
        session.add(task)
        await session.commit()
        await session.refresh(task)

    return ToolResult(success=True, output={"message": f"Task updated: {task.title}", "task": _task_to_dict(task)})


async def complete_task(inp: dict, ctx: ToolContext) -> ToolResult:
    """Mark a task as done."""
    task_id = inp.get("task_id", "")
    if not task_id:
        return ToolResult(success=False, output=None, error="task_id is required")

    async with async_session() as session:
        task = await session.get(Task, task_id)
        if not task:
            return ToolResult(success=False, output=None, error=f"Task {task_id} not found")

        if task.created_by != ctx.user_id and task.assigned_to != ctx.user_id:
            return ToolResult(success=False, output=None, error="Not authorized to complete this task")

        if task.status == "done":
            return ToolResult(success=True, output={"message": f"Task '{task.title}' is already done"})

        task.status = "done"
        task.updated_at = datetime.utcnow()
        session.add(task)
        await session.commit()

    return ToolResult(success=True, output={"message": f"Task completed: {task.title}", "task_id": task.id})


async def assign_task(inp: dict, ctx: ToolContext) -> ToolResult:
    """Reassign a task to a different user."""
    task_id = inp.get("task_id", "")
    assigned_to = inp.get("assigned_to", "")
    if not task_id:
        return ToolResult(success=False, output=None, error="task_id is required")
    if not assigned_to:
        return ToolResult(success=False, output=None, error="assigned_to is required")

    async with async_session() as session:
        task = await session.get(Task, task_id)
        if not task:
            return ToolResult(success=False, output=None, error=f"Task {task_id} not found")

        # Only creator can reassign a task
        if task.created_by != ctx.user_id:
            return ToolResult(success=False, output=None, error="Only the task creator can reassign it")

        task.assigned_to = assigned_to
        task.updated_at = datetime.utcnow()
        session.add(task)
        await session.commit()

    return ToolResult(
        success=True,
        output={"message": f"Task '{task.title}' assigned to {assigned_to}", "task_id": task.id},
    )


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _parse_datetime(value: str | None) -> datetime | None:
    """Best-effort ISO datetime parsing.  Always returns a naive UTC datetime."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        # Strip timezone info → naive UTC (consistent with created_at / updated_at)
        if dt.tzinfo is not None:
            from datetime import timezone
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except (ValueError, AttributeError):
        return None


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="create_task",
        display_name="Create Task",
        description="Create a new task and assign it to a user. The agent can set title, description, priority, due date, and tags.",
        category="tasks",
        input_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Task title (required)"},
                "description": {"type": "string", "description": "Detailed task description"},
                "assigned_to": {"type": "string", "description": "User ID to assign to (defaults to requesting user)"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Task priority (default: medium)"},
                "due_date": {"type": "string", "description": "Due date in ISO format (e.g. 2025-01-15T09:00:00)"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags for categorisation"},
            },
            "required": ["title"],
        },
        handler=create_task,
    ))

    registry.register_builtin(ToolDefinition(
        name="list_tasks",
        display_name="List Tasks",
        description="List tasks with optional filters by assignee, status, and priority.",
        category="tasks",
        input_schema={
            "type": "object",
            "properties": {
                "assigned_to": {"type": "string", "description": "Filter by assigned user ID"},
                "status": {"type": "string", "enum": ["todo", "in_progress", "done"], "description": "Filter by status"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Filter by priority"},
                "limit": {"type": "integer", "description": "Max results (default 20, max 50)"},
            },
        },
        handler=list_tasks,
    ))

    registry.register_builtin(ToolDefinition(
        name="update_task",
        display_name="Update Task",
        description="Update a task's title, description, priority, due date, status, or tags.",
        category="tasks",
        input_schema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The task ID to update"},
                "title": {"type": "string", "description": "New title"},
                "description": {"type": "string", "description": "New description"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                "due_date": {"type": "string", "description": "New due date in ISO format"},
                "status": {"type": "string", "enum": ["todo", "in_progress", "done"]},
                "tags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["task_id"],
        },
        handler=update_task,
    ))

    registry.register_builtin(ToolDefinition(
        name="complete_task",
        display_name="Complete Task",
        description="Mark a task as done.",
        category="tasks",
        input_schema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The task ID to complete"},
            },
            "required": ["task_id"],
        },
        handler=complete_task,
    ))

    registry.register_builtin(ToolDefinition(
        name="assign_task",
        display_name="Assign Task",
        description="Reassign a task to a different user.",
        category="tasks",
        input_schema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The task ID to reassign"},
                "assigned_to": {"type": "string", "description": "The user ID to assign the task to"},
            },
            "required": ["task_id", "assigned_to"],
        },
        handler=assign_task,
    ))
