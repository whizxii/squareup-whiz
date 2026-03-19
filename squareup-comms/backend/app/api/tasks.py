"""Tasks API — CRUD for user/agent-created tasks."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.tasks import Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TaskCreateBody(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = None
    assigned_to: Optional[str] = None  # defaults to current user
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    due_date: Optional[str] = None  # ISO datetime string
    tags: list[str] = Field(default_factory=list)


class TaskUpdateBody(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(todo|in_progress|done)$")
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high|urgent)$")
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[list[str]] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    assigned_to: str
    created_by: Optional[str] = None
    created_by_type: str = "user"
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    channel_id: Optional[str] = None
    tags: list[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, task: Task) -> "TaskResponse":
        tags_list: list[str] = []
        if task.tags:
            try:
                tags_list = json.loads(task.tags)
            except (json.JSONDecodeError, TypeError):
                tags_list = []
        return cls(
            id=task.id,
            title=task.title,
            description=task.description,
            assigned_to=task.assigned_to,
            created_by=task.created_by,
            created_by_type=task.created_by_type,
            status=task.status,
            priority=task.priority,
            due_date=task.due_date,
            channel_id=task.channel_id,
            tags=tags_list,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Create a new task."""
    now = datetime.utcnow()
    due_date = _parse_datetime(body.due_date) if body.due_date else None

    task = Task(
        title=body.title,
        description=body.description,
        assigned_to=body.assigned_to or user_id,
        created_by=user_id,
        created_by_type="user",
        status="todo",
        priority=body.priority,
        due_date=due_date,
        tags=json.dumps(body.tags),
        created_at=now,
        updated_at=now,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.get("")
async def list_tasks(
    assigned_to: Optional[str] = Query(default=None),
    task_status: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List tasks with optional filters."""
    stmt = select(Task).order_by(Task.created_at.desc()).limit(limit)
    if assigned_to:
        stmt = stmt.where(Task.assigned_to == assigned_to)
    if task_status:
        stmt = stmt.where(Task.status == task_status)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    result = await session.execute(stmt)
    tasks = list(result.scalars().all())
    return success_response([TaskResponse.from_model(t).model_dump(mode="json") for t in tasks])


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Get a single task by ID."""
    task = await session.get(Task, task_id)
    if task is None:
        raise ApiError(status_code=404, detail="Task not found")
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Update a task's fields."""
    task = await session.get(Task, task_id)
    if task is None:
        raise ApiError(status_code=404, detail="Task not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "tags":
            task.tags = json.dumps(value or [])
        elif field == "due_date":
            task.due_date = _parse_datetime(value) if value else None
        else:
            setattr(task, field, value)

    task.updated_at = datetime.utcnow()
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Delete a task."""
    task = await session.get(Task, task_id)
    if task is None:
        raise ApiError(status_code=404, detail="Task not found")
    await session.delete(task)
    await session.commit()
    return success_response({"deleted": True})


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
