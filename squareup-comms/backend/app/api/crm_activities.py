"""CRM Activities API — CRUD for manual activity logging."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.crm import CRMActivity, CRMContact

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crm/v2", tags=["crm-activities"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CreateActivityBody(BaseModel):
    contact_id: str
    type: str = Field(..., max_length=30)
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    activity_metadata: Optional[dict] = Field(default_factory=dict)


class ActivityResponse(BaseModel):
    id: str
    contact_id: str
    type: str
    title: Optional[str] = None
    content: Optional[str] = None
    activity_metadata: Any = Field(default_factory=dict)
    performed_by: Optional[str] = None
    performer_type: Optional[str] = None
    performer_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, activity: Any) -> "ActivityResponse":
        metadata = activity.activity_metadata
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except (ValueError, TypeError):
                metadata = {}

        return cls(
            id=activity.id,
            contact_id=activity.contact_id,
            type=activity.type,
            title=activity.title,
            content=activity.content,
            activity_metadata=metadata,
            performed_by=activity.performed_by,
            performer_type=activity.performer_type,
            performer_name=activity.performer_name,
            created_at=activity.created_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/activities",
    status_code=status.HTTP_201_CREATED,
)
async def create_activity(
    body: CreateActivityBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Create a manual activity log entry."""
    # Validate contact exists
    result = await session.execute(
        select(CRMContact.id).where(CRMContact.id == body.contact_id)
    )
    if result.scalar_one_or_none() is None:
        raise ApiError(status_code=404, detail="Contact not found")

    metadata_str = json.dumps(body.activity_metadata) if body.activity_metadata else "{}"

    activity = CRMActivity(
        contact_id=body.contact_id,
        type=body.type,
        title=body.title,
        content=body.content,
        activity_metadata=metadata_str,
        performed_by=user_id,
        performer_type="user",
    )
    session.add(activity)

    # Update contact's last_activity_at and activity_count
    contact_result = await session.execute(
        select(CRMContact).where(CRMContact.id == body.contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if contact is not None:
        contact.last_activity_at = datetime.utcnow()
        contact.activity_count = (contact.activity_count or 0) + 1
        session.add(contact)

    await session.commit()
    await session.refresh(activity)

    return success_response(ActivityResponse.from_model(activity))


@router.get("/contacts/{contact_id}/activities")
async def list_activities(
    contact_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List activities for a contact."""
    # Get items
    stmt = (
        select(CRMActivity)
        .where(CRMActivity.contact_id == contact_id)
        .order_by(CRMActivity.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    activities = result.scalars().all()

    # Get total count
    count_stmt = (
        select(func.count())
        .select_from(CRMActivity)
        .where(CRMActivity.contact_id == contact_id)
    )
    total = (await session.execute(count_stmt)).scalar() or 0

    return success_response({
        "items": [ActivityResponse.from_model(a).model_dump(mode="json") for a in activities],
        "total_count": total,
    })


@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Delete an activity."""
    result = await session.execute(
        select(CRMActivity).where(CRMActivity.id == activity_id)
    )
    activity = result.scalar_one_or_none()
    if activity is None:
        raise ApiError(status_code=404, detail="Activity not found")

    await session.delete(activity)
    await session.commit()

    return success_response({"deleted": True})
