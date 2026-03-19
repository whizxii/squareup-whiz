"""Calendar built-in tools — list, create, check availability, and update calendar events.

Uses Google Calendar API via OAuth when connected, falls back to the local
CRMCalendarEvent table otherwise.  Token management is handled by
``google_auth.get_valid_access_token`` which auto-refreshes expired tokens.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

import httpx
from sqlmodel import select

from app.core.db import async_session
from app.models.crm_calendar import CRMCalendarEvent
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry

logger = logging.getLogger(__name__)

GCAL_BASE = "https://www.googleapis.com/calendar/v3"


# ---------------------------------------------------------------------------
# Google Calendar API helpers
# ---------------------------------------------------------------------------

async def _get_google_token(user_id: str) -> str | None:
    """Return a valid Google access token for *user_id*, or None if not connected."""
    from app.services.integrations.google_auth import (
        get_user_integration_config,
        get_valid_access_token,
    )
    try:
        async with async_session() as session:
            config = await get_user_integration_config(user_id, "google_calendar", session)
            if not config:
                return None
            return await get_valid_access_token(config, session)
    except (ValueError, Exception) as exc:
        logger.debug("Google Calendar token unavailable for user %s: %s", user_id, exc)
        return None


def _gcal_event_to_dict(ev: dict[str, Any]) -> dict[str, Any]:
    """Normalise a Google Calendar API event into our standard format."""
    start = ev.get("start", {})
    end = ev.get("end", {})
    return {
        "id": ev.get("id", ""),
        "title": ev.get("summary", "(no title)"),
        "description": ev.get("description"),
        "start_at": start.get("dateTime") or start.get("date"),
        "end_at": end.get("dateTime") or end.get("date"),
        "is_all_day": "date" in start and "dateTime" not in start,
        "location": ev.get("location"),
        "meeting_url": ev.get("hangoutLink"),
        "attendees": [
            {"email": a.get("email", ""), "name": a.get("displayName", "")}
            for a in ev.get("attendees", [])
        ],
        "status": ev.get("status", "confirmed"),
        "source": "google_calendar",
    }


async def _gcal_list_events(
    token: str, time_min: str, time_max: str, max_results: int = 20,
) -> list[dict[str, Any]]:
    """Fetch events from Google Calendar API."""
    params: dict[str, Any] = {
        "timeMin": time_min,
        "timeMax": time_max,
        "maxResults": max_results,
        "singleEvents": "true",
        "orderBy": "startTime",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{GCAL_BASE}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )
    if resp.status_code != 200:
        logger.warning("Google Calendar list failed (%d): %s", resp.status_code, resp.text[:200])
        return []
    return [_gcal_event_to_dict(e) for e in resp.json().get("items", [])]


async def _gcal_create_event(token: str, body: dict[str, Any]) -> dict[str, Any] | None:
    """Create an event via Google Calendar API. Returns the created event or None."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{GCAL_BASE}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
        )
    if resp.status_code in (200, 201):
        return resp.json()
    logger.warning("Google Calendar create failed (%d): %s", resp.status_code, resp.text[:200])
    return None


async def _gcal_freebusy(token: str, time_min: str, time_max: str) -> list[dict[str, str]]:
    """Query Google Calendar FreeBusy API. Returns list of busy intervals."""
    body = {
        "timeMin": time_min,
        "timeMax": time_max,
        "items": [{"id": "primary"}],
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{GCAL_BASE}/freeBusy",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
        )
    if resp.status_code != 200:
        logger.warning("Google Calendar freebusy failed (%d): %s", resp.status_code, resp.text[:200])
        return []
    calendars = resp.json().get("calendars", {})
    return calendars.get("primary", {}).get("busy", [])


async def _gcal_update_event(
    token: str, event_id: str, body: dict[str, Any],
) -> dict[str, Any] | None:
    """Patch an event via Google Calendar API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.patch(
            f"{GCAL_BASE}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
        )
    if resp.status_code == 200:
        return resp.json()
    logger.warning("Google Calendar update failed (%d): %s", resp.status_code, resp.text[:200])
    return None


# ---------------------------------------------------------------------------
# Local DB helpers
# ---------------------------------------------------------------------------

def _event_to_dict(e: CRMCalendarEvent) -> dict:
    return {
        "id": e.id,
        "title": e.title,
        "event_type": e.event_type,
        "description": e.description,
        "start_at": e.start_at.isoformat() if e.start_at else None,
        "end_at": e.end_at.isoformat() if e.end_at else None,
        "is_all_day": e.is_all_day,
        "location": e.location,
        "meeting_url": e.meeting_url,
        "attendees": json.loads(e.attendees) if e.attendees else [],
        "status": e.status,
        "contact_id": e.contact_id,
        "deal_id": e.deal_id,
        "source": "local",
    }


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _to_gcal_datetime(dt: datetime) -> dict[str, str]:
    """Format a datetime for the Google Calendar API body."""
    return {"dateTime": dt.isoformat(), "timeZone": "UTC"}


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def list_calendar_events(inp: dict, ctx: ToolContext) -> ToolResult:
    """List upcoming calendar events — uses Google Calendar API if connected."""
    start_raw = inp.get("start_date")
    end_raw = inp.get("end_date")
    limit = min(inp.get("limit", 20), 50)

    start = _parse_datetime(start_raw) or datetime.utcnow()
    end = _parse_datetime(end_raw) or (start + timedelta(days=7))

    # Try Google Calendar first
    token = await _get_google_token(ctx.user_id)
    if token:
        events = await _gcal_list_events(
            token, start.isoformat() + "Z", end.isoformat() + "Z", limit,
        )
        return ToolResult(success=True, output={
            "events": events,
            "count": len(events),
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "source": "google_calendar",
        })

    # Fallback to local DB
    async with async_session() as session:
        stmt = (
            select(CRMCalendarEvent)
            .where(
                CRMCalendarEvent.start_at >= start,
                CRMCalendarEvent.start_at <= end,
                CRMCalendarEvent.status != "cancelled",
            )
            .order_by(CRMCalendarEvent.start_at)
            .limit(limit)
        )
        rows = await session.execute(stmt)
        events = [_event_to_dict(e) for e in rows.scalars().all()]

    return ToolResult(success=True, output={
        "events": events,
        "count": len(events),
        "range": {"start": start.isoformat(), "end": end.isoformat()},
        "source": "local",
    })


async def create_calendar_event(inp: dict, ctx: ToolContext) -> ToolResult:
    """Create a new calendar event — pushes to Google Calendar if connected."""
    title = inp.get("title", "").strip()
    if not title:
        return ToolResult(success=False, output=None, error="title is required")

    start_at = _parse_datetime(inp.get("start_at"))
    end_at = _parse_datetime(inp.get("end_at"))
    if not start_at:
        return ToolResult(success=False, output=None, error="start_at is required (ISO datetime)")
    if not end_at:
        end_at = start_at + timedelta(minutes=30)

    attendees = inp.get("attendees", [])
    google_event_id: str | None = None

    # Push to Google Calendar if connected
    token = await _get_google_token(ctx.user_id)
    if token:
        gcal_body: dict[str, Any] = {
            "summary": title,
            "start": _to_gcal_datetime(start_at),
            "end": _to_gcal_datetime(end_at),
        }
        if inp.get("description"):
            gcal_body["description"] = inp["description"]
        if inp.get("location"):
            gcal_body["location"] = inp["location"]
        if attendees:
            gcal_body["attendees"] = [
                {"email": a.get("email", "")} for a in attendees if a.get("email")
            ]
        created = await _gcal_create_event(token, gcal_body)
        if created:
            google_event_id = created.get("id")

    # Always save to local DB
    event = CRMCalendarEvent(
        id=google_event_id or str(uuid.uuid4()),
        contact_id=inp.get("contact_id", ""),
        deal_id=inp.get("deal_id"),
        title=title,
        event_type=inp.get("event_type", "meeting"),
        description=inp.get("description"),
        start_at=start_at,
        end_at=end_at,
        is_all_day=inp.get("is_all_day", False),
        location=inp.get("location"),
        meeting_url=inp.get("meeting_url"),
        attendees=json.dumps(attendees),
        status="scheduled",
        is_auto_created=True,
        created_by=ctx.agent_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(event)
        await session.commit()
        await session.refresh(event)

    result_dict = _event_to_dict(event)
    synced = google_event_id is not None
    return ToolResult(
        success=True,
        output={
            "message": f"Event created: {title}" + (" (synced to Google Calendar)" if synced else ""),
            "event": result_dict,
            "google_synced": synced,
        },
    )


async def check_availability(inp: dict, ctx: ToolContext) -> ToolResult:
    """Check calendar availability — uses Google FreeBusy API if connected."""
    start_at = _parse_datetime(inp.get("start_at"))
    end_at = _parse_datetime(inp.get("end_at"))

    if not start_at or not end_at:
        return ToolResult(success=False, output=None, error="Both start_at and end_at are required (ISO datetime)")

    # Try Google FreeBusy API first
    token = await _get_google_token(ctx.user_id)
    if token:
        busy = await _gcal_freebusy(
            token, start_at.isoformat() + "Z", end_at.isoformat() + "Z",
        )
        is_available = len(busy) == 0
        return ToolResult(success=True, output={
            "available": is_available,
            "busy_intervals": busy,
            "checked_range": {"start": start_at.isoformat(), "end": end_at.isoformat()},
            "source": "google_calendar",
        })

    # Fallback to local DB
    async with async_session() as session:
        stmt = select(CRMCalendarEvent).where(
            CRMCalendarEvent.status != "cancelled",
            CRMCalendarEvent.start_at < end_at,
            CRMCalendarEvent.end_at > start_at,
        )
        rows = await session.execute(stmt)
        conflicts = [_event_to_dict(e) for e in rows.scalars().all()]

    is_available = len(conflicts) == 0
    return ToolResult(success=True, output={
        "available": is_available,
        "conflicts": conflicts,
        "checked_range": {"start": start_at.isoformat(), "end": end_at.isoformat()},
        "source": "local",
    })


async def update_calendar_event(inp: dict, ctx: ToolContext) -> ToolResult:
    """Update an existing calendar event — patches Google Calendar if connected."""
    event_id = inp.get("event_id", "")
    if not event_id:
        return ToolResult(success=False, output=None, error="event_id is required")

    # Build patch body for Google Calendar
    gcal_patch: dict[str, Any] = {}
    if "title" in inp:
        gcal_patch["summary"] = inp["title"]
    if "description" in inp:
        gcal_patch["description"] = inp["description"]
    if "start_at" in inp:
        parsed = _parse_datetime(inp["start_at"])
        if parsed:
            gcal_patch["start"] = _to_gcal_datetime(parsed)
    if "end_at" in inp:
        parsed = _parse_datetime(inp["end_at"])
        if parsed:
            gcal_patch["end"] = _to_gcal_datetime(parsed)
    if "location" in inp:
        gcal_patch["location"] = inp["location"]
    if "status" in inp:
        status_map = {"cancelled": "cancelled", "scheduled": "confirmed"}
        gcal_status = status_map.get(inp["status"])
        if gcal_status:
            gcal_patch["status"] = gcal_status
    if "attendees" in inp:
        gcal_patch["attendees"] = [
            {"email": a.get("email", "")} for a in inp["attendees"] if a.get("email")
        ]

    google_updated = False
    token = await _get_google_token(ctx.user_id)
    if token and gcal_patch:
        result = await _gcal_update_event(token, event_id, gcal_patch)
        google_updated = result is not None

    # Update local DB
    async with async_session() as session:
        event = await session.get(CRMCalendarEvent, event_id)
        if not event:
            if google_updated:
                return ToolResult(
                    success=True,
                    output={"message": f"Event updated on Google Calendar (not in local DB)", "google_synced": True},
                )
            return ToolResult(success=False, output=None, error=f"Event {event_id} not found")

        if "title" in inp:
            event.title = inp["title"]
        if "description" in inp:
            event.description = inp["description"]
        if "start_at" in inp:
            parsed = _parse_datetime(inp["start_at"])
            if parsed:
                event.start_at = parsed
        if "end_at" in inp:
            parsed = _parse_datetime(inp["end_at"])
            if parsed:
                event.end_at = parsed
        if "location" in inp:
            event.location = inp["location"]
        if "meeting_url" in inp:
            event.meeting_url = inp["meeting_url"]
        if "status" in inp:
            if inp["status"] not in ("scheduled", "completed", "cancelled", "rescheduled"):
                return ToolResult(success=False, output=None, error=f"Invalid status: {inp['status']}")
            event.status = inp["status"]
        if "attendees" in inp:
            event.attendees = json.dumps(inp["attendees"])

        event.updated_at = datetime.utcnow()
        session.add(event)
        await session.commit()
        await session.refresh(event)

    return ToolResult(
        success=True,
        output={
            "message": f"Event updated: {event.title}" + (" (synced to Google Calendar)" if google_updated else ""),
            "event": _event_to_dict(event),
            "google_synced": google_updated,
        },
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="list_calendar_events",
        display_name="List Calendar Events",
        description="List upcoming calendar events within a date range. Defaults to the next 7 days.",
        category="calendar",
        input_schema={
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Start of range (ISO datetime, defaults to now)"},
                "end_date": {"type": "string", "description": "End of range (ISO datetime, defaults to +7 days)"},
                "limit": {"type": "integer", "description": "Max results (default 20, max 50)"},
            },
        },
        handler=list_calendar_events,
    ))

    registry.register_builtin(ToolDefinition(
        name="create_calendar_event",
        display_name="Create Calendar Event",
        description="Create a new calendar event with title, time, attendees, and location.",
        category="calendar",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Event title"},
                "start_at": {"type": "string", "description": "Start time (ISO datetime)"},
                "end_at": {"type": "string", "description": "End time (ISO datetime, defaults to +30 minutes)"},
                "event_type": {"type": "string", "enum": ["follow_up", "meeting", "call", "demo", "onboarding"], "description": "Type of event"},
                "description": {"type": "string", "description": "Event description or agenda"},
                "location": {"type": "string", "description": "Physical location or virtual meeting room"},
                "meeting_url": {"type": "string", "description": "Video meeting URL (Zoom, Meet, etc.)"},
                "contact_id": {"type": "string", "description": "CRM contact ID associated with this event"},
                "deal_id": {"type": "string", "description": "CRM deal ID associated with this event"},
                "attendees": {"type": "array", "items": {"type": "object"}, "description": "List of {email, name} attendee objects"},
                "is_all_day": {"type": "boolean", "description": "Whether this is an all-day event"},
            },
            "required": ["title", "start_at"],
        },
        handler=create_calendar_event,
    ))

    registry.register_builtin(ToolDefinition(
        name="check_availability",
        display_name="Check Availability",
        description="Check if a time slot is available by looking for conflicting calendar events.",
        category="calendar",
        input_schema={
            "type": "object",
            "properties": {
                "start_at": {"type": "string", "description": "Start of time slot to check (ISO datetime)"},
                "end_at": {"type": "string", "description": "End of time slot to check (ISO datetime)"},
            },
            "required": ["start_at", "end_at"],
        },
        handler=check_availability,
    ))

    registry.register_builtin(ToolDefinition(
        name="update_calendar_event",
        display_name="Update Calendar Event",
        description="Update an existing calendar event's title, time, location, status, or attendees.",
        category="calendar",
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {"type": "string", "description": "The calendar event ID to update"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "start_at": {"type": "string", "description": "New start time (ISO datetime)"},
                "end_at": {"type": "string", "description": "New end time (ISO datetime)"},
                "location": {"type": "string"},
                "meeting_url": {"type": "string"},
                "status": {"type": "string", "enum": ["scheduled", "completed", "cancelled", "rescheduled"]},
                "attendees": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["event_id"],
        },
        handler=update_calendar_event,
    ))
