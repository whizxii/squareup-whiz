"""Google Calendar integration API routes.

Prefix: /api/calendar
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.core.logging_config import get_logger
from app.services import calendar_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class ConnectResponse(BaseModel):
    auth_url: str


class StatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    last_synced: Optional[str] = None


class CreateEventRequest(BaseModel):
    summary: str
    start_time: str
    end_time: str
    description: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = "UTC"
    attendees: Optional[list[str]] = None


class DisconnectResponse(BaseModel):
    disconnected: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/connect", response_model=ConnectResponse)
async def connect_calendar(
    user_id: str = Depends(get_current_user),
):
    """Get the Google OAuth URL to initiate calendar connection."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    auth_url = await calendar_service.get_auth_url(user_id)
    return ConnectResponse(auth_url=auth_url)


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    """Handle Google OAuth callback. Redirects to frontend settings page."""
    try:
        await calendar_service.handle_callback(code, state, session)
        # Redirect to frontend settings page with success indicator
        frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
        return RedirectResponse(
            url=f"{frontend_url}/settings?calendar=connected",
            status_code=302,
        )
    except ValueError as exc:
        logger.error("Calendar OAuth callback failed: %s", exc)
        frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
        return RedirectResponse(
            url=f"{frontend_url}/settings?calendar=error",
            status_code=302,
        )


@router.get("/status", response_model=StatusResponse)
async def calendar_status(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Check if Google Calendar is connected for the current user."""
    result = await calendar_service.get_status(user_id, session)
    return StatusResponse(**result)


@router.get("/events")
async def list_events(
    days: int = Query(default=7, ge=1, le=30),
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List upcoming calendar events."""
    try:
        events = await calendar_service.get_events(user_id, session, days=days)
        return {"events": events, "count": len(events)}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/events")
async def create_event(
    body: CreateEventRequest,
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new calendar event."""
    try:
        event = await calendar_service.create_event(
            user_id,
            session,
            event_data={
                "summary": body.summary,
                "start_time": body.start_time,
                "end_time": body.end_time,
                "description": body.description,
                "location": body.location,
                "timezone": body.timezone,
                "attendees": body.attendees,
            },
        )
        return {"event": event}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/disconnect", response_model=DisconnectResponse)
async def disconnect_calendar(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Disconnect Google Calendar integration."""
    result = await calendar_service.disconnect(user_id, session)
    return DisconnectResponse(disconnected=result)
