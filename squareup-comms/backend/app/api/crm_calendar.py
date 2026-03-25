"""CRM Calendar API — CRUD for calendar events and follow-ups."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List, Literal, Optional

import logging

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field, model_validator

from sqlalchemy import select

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.models.crm import CRMContact

logger = logging.getLogger(__name__)
from app.api.deps import get_calendar_event_service, get_followup_service
from app.services.crm_calendar_service import VALID_EVENT_TYPES, CalendarEventService
from app.services.crm_followup_service import FollowUpService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-calendar"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AttendeeSchema(BaseModel):
    email: str
    name: Optional[str] = None
    response_status: str = "needsAction"


class CreateEventBody(BaseModel):
    contact_id: str
    deal_id: Optional[str] = None
    title: str = Field(..., max_length=300)
    event_type: str = Field(default="meeting", max_length=30)
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    is_all_day: bool = False
    location: Optional[str] = Field(default=None, max_length=500)
    meeting_url: Optional[str] = Field(default=None, max_length=1000)
    external_event_id: Optional[str] = None
    external_calendar_id: Optional[str] = None
    attendees: List[AttendeeSchema] = Field(default_factory=list)
    reminder_minutes: int = 15
    is_auto_created: bool = False

    @model_validator(mode="after")
    def _validate_times(self) -> "CreateEventBody":
        if not self.is_all_day:
            # Normalize timezone awareness for comparison (avoid TypeError)
            start = self.start_at.replace(tzinfo=None)
            end = self.end_at.replace(tzinfo=None)
            if end <= start:
                raise ValueError("end_at must be after start_at")
        if self.event_type not in VALID_EVENT_TYPES:
            raise ValueError(f"event_type must be one of {VALID_EVENT_TYPES}")
        return self


class UpdateEventBody(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    event_type: Optional[str] = Field(default=None, max_length=30)
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    location: Optional[str] = Field(default=None, max_length=500)
    meeting_url: Optional[str] = Field(default=None, max_length=1000)
    attendees: Optional[List[AttendeeSchema]] = None
    reminder_minutes: Optional[int] = None


class SnoozeFollowUpBody(BaseModel):
    snooze_until: datetime


class DismissFollowUpBody(BaseModel):
    pass


class CompleteEventBody(BaseModel):
    outcome: Literal["positive", "neutral", "negative"]
    outcome_notes: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    contact_id: str
    deal_id: Optional[str] = None
    title: str
    event_type: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    is_all_day: bool = False
    location: Optional[str] = None
    meeting_url: Optional[str] = None
    external_event_id: Optional[str] = None
    external_calendar_id: Optional[str] = None
    attendees: Any = Field(default_factory=list)
    reminder_minutes: int = 15
    status: str = "scheduled"
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    is_auto_created: bool = False
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, event: Any) -> "EventResponse":
        attendees = event.attendees
        if isinstance(attendees, str):
            try:
                attendees = json.loads(attendees)
            except (ValueError, TypeError):
                attendees = []

        return cls(
            id=event.id,
            contact_id=event.contact_id,
            deal_id=event.deal_id,
            title=event.title,
            event_type=event.event_type,
            description=event.description,
            start_at=event.start_at,
            end_at=event.end_at,
            is_all_day=event.is_all_day,
            location=event.location,
            meeting_url=event.meeting_url,
            external_event_id=event.external_event_id,
            external_calendar_id=event.external_calendar_id,
            attendees=attendees,
            reminder_minutes=event.reminder_minutes,
            status=event.status,
            outcome=event.outcome,
            outcome_notes=event.outcome_notes,
            is_auto_created=event.is_auto_created,
            created_by=event.created_by,
            created_at=event.created_at,
            updated_at=event.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/calendar/events",
    status_code=status.HTTP_201_CREATED,
)
async def create_event(
    body: CreateEventBody,
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new calendar event."""
    # Validate contact exists before attempting DB insert
    result = await svc.session.execute(
        select(CRMContact.id).where(CRMContact.id == body.contact_id)
    )
    if result.scalar_one_or_none() is None:
        raise ApiError(status_code=404, detail="Contact not found")

    data = body.model_dump(exclude_unset=True)
    # Serialize attendees to dicts for service layer
    if "attendees" in data:
        data["attendees"] = [
            a.model_dump() if hasattr(a, "model_dump") else a
            for a in body.attendees
        ]
    try:
        event = await svc.create_event(data, user_id)
    except ValueError as exc:
        raise ApiError(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Failed to create calendar event: %s", exc, exc_info=True)
        raise ApiError(status_code=500, detail=f"Failed to create calendar event: {exc}") from exc
    return success_response(EventResponse.from_model(event))


@router.get("/calendar/events")
async def list_events(
    contact_id: Optional[str] = Query(default=None),
    deal_id: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    sort_by: str = Query(default="start_at"),
    sort_dir: str = Query(default="asc"),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """List calendar events with filters and cursor pagination."""
    page = await svc.repo.search(
        contact_id=contact_id,
        deal_id=deal_id,
        event_type=event_type,
        status=status_filter,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_dir=sort_dir,
        cursor=cursor,
        limit=limit,
    )
    return success_response({
        "items": [EventResponse.from_model(e).model_dump(mode="json") for e in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/calendar/upcoming")
async def get_upcoming(
    limit: int = Query(default=20, ge=1, le=100),
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Get upcoming scheduled events."""
    events = await svc.get_upcoming(limit=limit)
    return success_response([
        EventResponse.from_model(e).model_dump(mode="json") for e in events
    ])


@router.get("/calendar/overdue")
async def get_overdue(
    limit: int = Query(default=50, ge=1, le=200),
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Get overdue follow-up events."""
    events = await svc.get_overdue_follow_ups(limit=limit)
    return success_response([
        EventResponse.from_model(e).model_dump(mode="json") for e in events
    ])


@router.get("/calendar/events/{event_id}")
async def get_event(
    event_id: str,
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single calendar event by ID."""
    event = await svc.get_event(event_id)
    if event is None:
        raise ApiError(status_code=404, detail="Calendar event not found")
    return success_response(EventResponse.from_model(event))


@router.put("/calendar/events/{event_id}")
async def update_event(
    event_id: str,
    body: UpdateEventBody,
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Update a calendar event."""
    updates = body.model_dump(exclude_unset=True)
    # Serialize attendees if provided
    if "attendees" in updates and updates["attendees"] is not None:
        updates["attendees"] = [
            a.model_dump() if hasattr(a, "model_dump") else a
            for a in body.attendees  # type: ignore[union-attr]
        ]
    event = await svc.update_event(event_id, updates, user_id)
    if event is None:
        raise ApiError(status_code=404, detail="Calendar event not found")
    return success_response(EventResponse.from_model(event))


@router.put("/calendar/events/{event_id}/complete")
async def complete_event(
    event_id: str,
    body: CompleteEventBody,
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Mark a calendar event as completed with outcome."""
    event = await svc.complete_event(event_id, body.outcome, body.outcome_notes, user_id)
    if event is None:
        raise ApiError(status_code=404, detail="Calendar event not found")
    return success_response(EventResponse.from_model(event))


@router.delete("/calendar/events/{event_id}")
async def cancel_event(
    event_id: str,
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Cancel a calendar event."""
    event = await svc.cancel_event(event_id, user_id)
    if event is None:
        raise ApiError(status_code=404, detail="Calendar event not found")
    return success_response(EventResponse.from_model(event))


@router.get("/contacts/{contact_id}/calendar")
async def get_contact_calendar(
    contact_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    svc: CalendarEventService = Depends(get_calendar_event_service),
    user_id: str = Depends(get_current_user),
):
    """Get all calendar events for a contact."""
    events = await svc.get_for_contact(contact_id, limit=limit)
    return success_response([
        EventResponse.from_model(e).model_dump(mode="json") for e in events
    ])


# ---------------------------------------------------------------------------
# Follow-Up Snooze / Dismiss
# ---------------------------------------------------------------------------


@router.put("/calendar/follow-ups/{event_id}/snooze")
async def snooze_follow_up(
    event_id: str,
    body: SnoozeFollowUpBody,
    svc: FollowUpService = Depends(get_followup_service),
    user_id: str = Depends(get_current_user),
):
    """Snooze a follow-up to a later time."""
    try:
        event = await svc.snooze_follow_up(event_id, body.snooze_until, user_id)
    except ValueError as exc:
        raise ApiError(status_code=400, detail=str(exc))
    if event is None:
        raise ApiError(status_code=404, detail="Follow-up not found")
    return success_response(EventResponse.from_model(event))


@router.put("/calendar/follow-ups/{event_id}/dismiss")
async def dismiss_follow_up(
    event_id: str,
    svc: FollowUpService = Depends(get_followup_service),
    user_id: str = Depends(get_current_user),
):
    """Dismiss (cancel) a follow-up."""
    event = await svc.dismiss_follow_up(event_id, user_id)
    if event is None:
        raise ApiError(status_code=404, detail="Follow-up not found")
    return success_response(EventResponse.from_model(event))
