"""Reminders API — CRUD for time-based user reminders."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.reminders import Reminder

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReminderCreateBody(BaseModel):
    message: str = Field(max_length=1000)
    remind_at: str  # ISO datetime
    channel_id: Optional[str] = None
    recurrence: Optional[str] = Field(default=None, max_length=100)


class ReminderResponse(BaseModel):
    id: str
    user_id: str
    created_by_agent: Optional[str] = None
    message: str
    remind_at: Optional[datetime] = None
    channel_id: Optional[str] = None
    recurrence: Optional[str] = None
    status: str = "pending"
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, r: Reminder) -> "ReminderResponse":
        return cls(
            id=r.id,
            user_id=r.user_id,
            created_by_agent=r.created_by_agent,
            message=r.message,
            remind_at=r.remind_at,
            channel_id=r.channel_id,
            recurrence=r.recurrence,
            status=r.status,
            created_at=r.created_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_reminder(
    body: ReminderCreateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Create a new reminder."""
    remind_at = _parse_datetime(body.remind_at)
    if not remind_at:
        raise ApiError(status_code=400, detail="remind_at must be a valid ISO datetime")
    if remind_at <= datetime.utcnow():
        raise ApiError(status_code=400, detail="remind_at must be in the future")

    reminder = Reminder(
        user_id=user_id,
        message=body.message,
        remind_at=remind_at,
        channel_id=body.channel_id,
        recurrence=body.recurrence,
        status="pending",
        created_at=datetime.utcnow(),
    )
    session.add(reminder)
    await session.commit()
    await session.refresh(reminder)
    return success_response(ReminderResponse.from_model(reminder).model_dump(mode="json"))


@router.get("/")
async def list_reminders(
    reminder_status: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List the current user's reminders."""
    stmt = (
        select(Reminder)
        .where(Reminder.user_id == user_id)
        .order_by(Reminder.remind_at)
        .limit(limit)
    )
    if reminder_status:
        stmt = stmt.where(Reminder.status == reminder_status)
    result = await session.execute(stmt)
    reminders = list(result.scalars().all())
    return success_response([ReminderResponse.from_model(r).model_dump(mode="json") for r in reminders])


@router.get("/{reminder_id}")
async def get_reminder(
    reminder_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Get a single reminder."""
    reminder = await session.get(Reminder, reminder_id)
    if reminder is None:
        raise ApiError(status_code=404, detail="Reminder not found")
    if reminder.user_id != user_id:
        raise ApiError(status_code=403, detail="Not your reminder")
    return success_response(ReminderResponse.from_model(reminder).model_dump(mode="json"))


@router.delete("/{reminder_id}", status_code=status.HTTP_200_OK)
async def cancel_reminder(
    reminder_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Cancel a pending reminder."""
    reminder = await session.get(Reminder, reminder_id)
    if reminder is None:
        raise ApiError(status_code=404, detail="Reminder not found")
    if reminder.user_id != user_id:
        raise ApiError(status_code=403, detail="Not your reminder")
    if reminder.status != "pending":
        raise ApiError(status_code=400, detail=f"Reminder is already '{reminder.status}'")

    reminder.status = "cancelled"
    session.add(reminder)
    await session.commit()
    return success_response({"cancelled": True, "reminder_id": reminder.id})


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
