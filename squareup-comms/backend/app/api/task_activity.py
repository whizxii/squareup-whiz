"""Task Activity API — activity log for tasks."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_task_service
from app.core.auth import get_current_user
from app.core.responses import success_response
from app.models.task_activity import TaskActivity
from app.services.task_service import TaskService

router = APIRouter(prefix="/api/tasks", tags=["task-activity"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ActivityResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    extra_data: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, entry: TaskActivity) -> "ActivityResponse":
        return cls(
            id=entry.id,
            task_id=entry.task_id,
            user_id=entry.user_id,
            action=entry.action,
            field_changed=entry.field_changed,
            old_value=entry.old_value,
            new_value=entry.new_value,
            extra_data=entry.extra_data,
            created_at=entry.created_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/{task_id}/activity")
async def list_activity(
    task_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: TaskService = Depends(get_task_service),
    user_id: str = Depends(get_current_user),
):
    """List activity entries for a task (newest first)."""
    page = await svc.get_activity(task_id, user_id, cursor=cursor, limit=limit)
    return success_response(
        [ActivityResponse.from_model(a).model_dump(mode="json") for a in page.items],
        meta={"next_cursor": page.next_cursor, "has_more": page.has_more},
    )
