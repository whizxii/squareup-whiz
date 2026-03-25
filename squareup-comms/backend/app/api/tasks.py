"""Tasks API — CRUD for user/agent-created tasks with subtasks, reorder, bulk ops."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field, field_validator

from app.api.deps import get_task_service
from app.core.auth import get_current_user
from app.core.responses import success_response
from app.models.tasks import Task
from app.services.task_service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TaskCreateBody(BaseModel):
    title: str = Field(max_length=300, min_length=1)
    description: Optional[str] = Field(default=None, max_length=5000)
    assigned_to: Optional[str] = None  # defaults to current user
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    due_date: Optional[str] = None  # ISO datetime string
    tags: list[str] = Field(default_factory=list)
    workspace_id: Optional[str] = None
    estimated_minutes: Optional[int] = Field(default=None, ge=0, le=9999)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank")
        return stripped


class TaskUpdateBody(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300, min_length=1)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[str] = Field(default=None, pattern="^(todo|in_progress|done)$")
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high|urgent)$")
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[list[str]] = None
    estimated_minutes: Optional[int] = Field(default=None, ge=0, le=9999)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("title must not be blank")
            return stripped
        return v


class ReorderBody(BaseModel):
    task_id: str
    status: str = Field(pattern="^(todo|in_progress|done)$")
    position: int = Field(ge=0)


class BulkUpdateBody(BaseModel):
    task_ids: list[str] = Field(min_length=1, max_length=100)
    updates: TaskUpdateBody


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
    parent_id: Optional[str] = None
    workspace_id: Optional[str] = None
    position: int = 0
    estimated_minutes: Optional[int] = None
    completed_at: Optional[datetime] = None
    is_deleted: bool = False
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
            parent_id=task.parent_id,
            workspace_id=task.workspace_id,
            position=task.position,
            estimated_minutes=task.estimated_minutes,
            completed_at=task.completed_at,
            is_deleted=task.is_deleted,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreateBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new task."""
    task = await svc.create_task(user_id, body.model_dump(exclude_unset=False))
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.get("/")
async def list_tasks(
    task_status: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """List tasks scoped to current user (as creator or assignee)."""
    page = await svc.list_tasks(
        user_id, status=task_status, priority=priority, cursor=cursor, limit=limit,
    )
    return success_response(
        [TaskResponse.from_model(t).model_dump(mode="json") for t in page.items],
        meta={"next_cursor": page.next_cursor, "has_more": page.has_more},
    )


@router.get("/search")
async def search_tasks(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=100),
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Search tasks by title/description."""
    tasks = await svc.search_tasks(user_id, q, limit=limit)
    return success_response([TaskResponse.from_model(t).model_dump(mode="json") for t in tasks])


@router.get("/stats")
async def task_stats(
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Count user's tasks grouped by status."""
    counts = await svc.count_by_status(user_id)
    return success_response(counts)


# ---------------------------------------------------------------------------
# Reorder & Bulk (must be before /{task_id} to avoid path param capture)
# ---------------------------------------------------------------------------

@router.patch("/reorder", status_code=status.HTTP_200_OK)
async def reorder_task(
    body: ReorderBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Move a task to a new position/status column."""
    task = await svc.reorder_task(body.task_id, user_id, body.position, body.status)
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.patch("/bulk", status_code=status.HTTP_200_OK)
async def bulk_update_tasks(
    body: BulkUpdateBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Bulk-update multiple tasks."""
    updates = body.updates.model_dump(exclude_unset=True)
    tasks = await svc.bulk_update(body.task_ids, user_id, updates)
    return success_response([TaskResponse.from_model(t).model_dump(mode="json") for t in tasks])


# ---------------------------------------------------------------------------
# Single task CRUD (/{task_id} routes)
# ---------------------------------------------------------------------------

@router.get("/{task_id}")
async def get_task(
    task_id: str,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single task by ID."""
    task = await svc.get_task(task_id, user_id)
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdateBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Update a task's fields."""
    updates = body.model_dump(exclude_unset=True)
    task = await svc.update_task(task_id, user_id, updates)
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
async def delete_task(
    task_id: str,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Soft-delete a task."""
    await svc.delete_task(task_id, user_id)
    return success_response({"deleted": True})


# ---------------------------------------------------------------------------
# Subtasks
# ---------------------------------------------------------------------------

@router.get("/{task_id}/subtasks")
async def list_subtasks(
    task_id: str,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """List subtasks of a parent task."""
    subtasks = await svc.get_subtasks(task_id, user_id)
    return success_response([TaskResponse.from_model(t).model_dump(mode="json") for t in subtasks])


@router.post("/{task_id}/subtasks", status_code=status.HTTP_201_CREATED)
async def create_subtask(
    task_id: str,
    body: TaskCreateBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Create a subtask under a parent task."""
    task = await svc.create_subtask(task_id, user_id, body.model_dump(exclude_unset=False))
    return success_response(TaskResponse.from_model(task).model_dump(mode="json"))
