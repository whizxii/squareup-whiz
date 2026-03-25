"""Task Comments API — CRUD for comments on tasks."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_task_service
from app.core.auth import get_current_user
from app.core.responses import success_response
from app.models.task_comments import TaskComment
from app.services.task_service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["task-comments"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CommentCreateBody(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    mentions: Optional[list[dict[str, str]]] = Field(default_factory=list)


class CommentUpdateBody(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    content: str
    mentions: list[dict[str, str]] = []
    is_deleted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, comment: TaskComment) -> "CommentResponse":
        mentions_list: list[dict[str, str]] = []
        if comment.mentions:
            try:
                mentions_list = json.loads(comment.mentions)
            except (json.JSONDecodeError, TypeError):
                mentions_list = []
        return cls(
            id=comment.id,
            task_id=comment.task_id,
            user_id=comment.user_id,
            content=comment.content,
            mentions=mentions_list,
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/{task_id}/comments")
async def list_comments(
    task_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """List comments for a task (newest first)."""
    page = await svc.get_comments(task_id, user_id, cursor=cursor, limit=limit)
    return success_response(
        [CommentResponse.from_model(c).model_dump(mode="json") for c in page.items],
        meta={"next_cursor": page.next_cursor, "has_more": page.has_more},
    )


@router.post("/{task_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(
    task_id: str,
    body: CommentCreateBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Add a comment to a task."""
    comment = await svc.add_comment(
        task_id, user_id, body.content, mentions=body.mentions,
    )
    return success_response(CommentResponse.from_model(comment).model_dump(mode="json"))


@router.patch("/{task_id}/comments/{comment_id}")
async def update_comment(
    task_id: str,
    comment_id: str,
    body: CommentUpdateBody,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Edit a comment — only the author can edit."""
    comment = await svc.update_comment(task_id, comment_id, user_id, body.content)
    return success_response(CommentResponse.from_model(comment).model_dump(mode="json"))


@router.delete("/{task_id}/comments/{comment_id}", status_code=status.HTTP_200_OK)
async def delete_comment(
    task_id: str,
    comment_id: str,
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """Soft-delete a comment — only the author can delete."""
    await svc.delete_comment(task_id, comment_id, user_id)
    return success_response({"deleted": True})
