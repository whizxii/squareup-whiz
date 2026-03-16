"""Google Calendar integration service.

Handles OAuth flow, token encryption/storage, and Google Calendar API calls.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.integrations import IntegrationConfig
from app.services.integrations.google_auth import (
    GMAIL_SCOPES,
    GOOGLE_TOKEN_URL,
    encrypt_tokens,
    get_user_integration_config,
    get_valid_access_token,
)

logger = get_logger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
]


async def get_auth_url(user_id: str) -> str:
    """Generate a Google OAuth authorization URL.

    The user_id is embedded in the state parameter so we can associate
    the callback with the correct user.

    When GMAIL_SYNC_ENABLED is true, Gmail scopes are included so the
    same OAuth consent covers both Calendar and Gmail access.
    """
    scopes = list(CALENDAR_SCOPES)
    if settings.GMAIL_SYNC_ENABLED:
        scopes.extend(GMAIL_SCOPES)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "state": user_id,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def handle_callback(
    code: str,
    state: str,
    session: AsyncSession,
) -> IntegrationConfig:
    """Exchange the authorization code for tokens and store them.

    Args:
        code: The authorization code from Google.
        state: The user_id embedded in the OAuth state param.
        session: Database session.

    Returns:
        The created or updated IntegrationConfig.
    """

    user_id = state

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        logger.error("Token exchange failed: %s", token_response.text)
        raise ValueError(f"Token exchange failed: {token_response.status_code}")

    tokens = token_response.json()
    encrypted = encrypt_tokens(tokens)

    # Fetch user's calendar email for display
    email = await _get_calendar_email(tokens.get("access_token", ""))

    # Upsert integration config
    stmt = select(IntegrationConfig).where(
        IntegrationConfig.type == "google_calendar",
        IntegrationConfig.connected_by == user_id,
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()

    # Determine which scopes were granted
    all_scopes = list(CALENDAR_SCOPES)
    if settings.GMAIL_SYNC_ENABLED:
        all_scopes.extend(GMAIL_SCOPES)

    if existing:
        updated = IntegrationConfig(
            id=existing.id,
            type=existing.type,
            display_name=email or "Google Calendar",
            mcp_server_config=existing.mcp_server_config,
            oauth_tokens_encrypted=encrypted,
            scopes=json.dumps(all_scopes),
            status="active",
            connected_by=user_id,
            last_synced_at=datetime.now(timezone.utc),
            error_message=None,
            created_at=existing.created_at,
            updated_at=datetime.now(timezone.utc),
        )
        await session.merge(updated)
        await session.commit()
        await session.refresh(updated)
        cal_config = updated
    else:
        cal_config = IntegrationConfig(
            type="google_calendar",
            display_name=email or "Google Calendar",
            oauth_tokens_encrypted=encrypted,
            scopes=json.dumps(all_scopes),
            status="active",
            connected_by=user_id,
            last_synced_at=datetime.now(timezone.utc),
        )
        session.add(cal_config)
        await session.commit()
        await session.refresh(cal_config)

    # When Gmail scopes are included, also upsert a gmail integration config
    # so GmailSyncService can find it via get_user_integration_config(user_id, "gmail")
    if settings.GMAIL_SYNC_ENABLED:
        await _upsert_gmail_config(user_id, email, encrypted, all_scopes, session)

    return cal_config


async def _get_calendar_email(access_token: str) -> Optional[str]:
    """Fetch the primary calendar email from Google."""

    if not access_token:
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GOOGLE_CALENDAR_API}/calendars/primary",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if resp.status_code == 200:
            return resp.json().get("id")
    except Exception as exc:
        logger.warning("Failed to fetch calendar email: %s", exc)

    return None


async def _upsert_gmail_config(
    user_id: str,
    email: Optional[str],
    encrypted_tokens: str,
    scopes: list[str],
    session: AsyncSession,
) -> None:
    """Create or update a gmail integration config sharing the same OAuth tokens."""
    stmt = select(IntegrationConfig).where(
        IntegrationConfig.type == "gmail",
        IntegrationConfig.connected_by == user_id,
    )
    result = await session.execute(stmt)
    existing_gmail = result.scalars().first()

    now = datetime.now(timezone.utc)
    if existing_gmail:
        updated = IntegrationConfig(
            id=existing_gmail.id,
            type="gmail",
            display_name=email or "Gmail",
            mcp_server_config=existing_gmail.mcp_server_config,
            oauth_tokens_encrypted=encrypted_tokens,
            scopes=json.dumps(scopes),
            status="active",
            connected_by=user_id,
            last_synced_at=now,
            error_message=None,
            created_at=existing_gmail.created_at,
            updated_at=now,
        )
        await session.merge(updated)
    else:
        gmail_config = IntegrationConfig(
            type="gmail",
            display_name=email or "Gmail",
            oauth_tokens_encrypted=encrypted_tokens,
            scopes=json.dumps(scopes),
            status="active",
            connected_by=user_id,
            last_synced_at=now,
        )
        session.add(gmail_config)

    await session.commit()


async def get_status(user_id: str, session: AsyncSession) -> dict[str, Any]:
    """Check if Google Calendar is connected for a user."""
    config = await get_user_integration_config(user_id, "google_calendar", session)
    if not config:
        return {"connected": False}

    return {
        "connected": True,
        "email": config.display_name,
        "last_synced": config.last_synced_at.isoformat() if config.last_synced_at else None,
    }


async def get_events(
    user_id: str,
    session: AsyncSession,
    days: int = 7,
) -> list[dict[str, Any]]:
    """Fetch upcoming calendar events for a user."""

    config = await get_user_integration_config(user_id, "google_calendar", session)
    if not config:
        raise ValueError("Google Calendar is not connected.")

    access_token = await get_valid_access_token(config, session)

    now = datetime.now(timezone.utc)
    time_max = now + timedelta(days=days)

    params = {
        "timeMin": now.isoformat(),
        "timeMax": time_max.isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": "50",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )

    if resp.status_code != 200:
        logger.error("Failed to fetch events: %s", resp.text)
        raise ValueError(f"Failed to fetch calendar events: {resp.status_code}")

    data = resp.json()
    events = []

    for item in data.get("items", []):
        events.append({
            "id": item.get("id"),
            "summary": item.get("summary", "(No title)"),
            "description": item.get("description"),
            "start": item.get("start", {}).get("dateTime") or item.get("start", {}).get("date"),
            "end": item.get("end", {}).get("dateTime") or item.get("end", {}).get("date"),
            "location": item.get("location"),
            "html_link": item.get("htmlLink"),
            "status": item.get("status"),
            "attendees": [
                {"email": a.get("email"), "response": a.get("responseStatus")}
                for a in item.get("attendees", [])
            ],
        })

    # Update last_synced timestamp
    updated_config = IntegrationConfig(
        id=config.id,
        type=config.type,
        display_name=config.display_name,
        mcp_server_config=config.mcp_server_config,
        oauth_tokens_encrypted=config.oauth_tokens_encrypted,
        scopes=config.scopes,
        status=config.status,
        connected_by=config.connected_by,
        last_synced_at=datetime.now(timezone.utc),
        error_message=config.error_message,
        created_at=config.created_at,
        updated_at=datetime.now(timezone.utc),
    )
    await session.merge(updated_config)
    await session.commit()

    return events


async def create_event(
    user_id: str,
    session: AsyncSession,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new Google Calendar event.

    Args:
        user_id: The authenticated user's ID.
        session: Database session.
        event_data: Dict with keys: summary, start_time, end_time, description, location, attendees.

    Returns:
        The created event data from Google.
    """

    config = await get_user_integration_config(user_id, "google_calendar", session)
    if not config:
        raise ValueError("Google Calendar is not connected.")

    access_token = await get_valid_access_token(config, session)

    body: dict[str, Any] = {
        "summary": event_data["summary"],
        "start": {"dateTime": event_data["start_time"], "timeZone": event_data.get("timezone", "UTC")},
        "end": {"dateTime": event_data["end_time"], "timeZone": event_data.get("timezone", "UTC")},
    }

    if event_data.get("description"):
        body["description"] = event_data["description"]
    if event_data.get("location"):
        body["location"] = event_data["location"]
    if event_data.get("attendees"):
        body["attendees"] = [{"email": email} for email in event_data["attendees"]]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=body,
        )

    if resp.status_code not in (200, 201):
        logger.error("Failed to create event: %s", resp.text)
        raise ValueError(f"Failed to create calendar event: {resp.status_code}")

    return resp.json()


async def disconnect(user_id: str, session: AsyncSession) -> bool:
    """Disconnect Google Calendar for a user by deactivating the integration."""
    config = await get_user_integration_config(user_id, "google_calendar", session)
    if not config:
        return False

    # Mark as disconnected — create a new copy to avoid mutation
    updated = IntegrationConfig(
        id=config.id,
        type=config.type,
        display_name=config.display_name,
        mcp_server_config=config.mcp_server_config,
        oauth_tokens_encrypted=None,
        scopes=config.scopes,
        status="disconnected",
        connected_by=config.connected_by,
        last_synced_at=config.last_synced_at,
        error_message=None,
        created_at=config.created_at,
        updated_at=datetime.now(timezone.utc),
    )
    await session.merge(updated)
    await session.commit()

    logger.info("User %s disconnected Google Calendar", user_id)
    return True
