"""Tests for /api/calendar endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# GET /api/calendar/connect
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_connect_returns_503_without_config(client: AsyncClient):
    """Connect returns 503 when Google OAuth is not configured."""
    # Default test env has empty GOOGLE_CLIENT_ID / SECRET
    resp = await client.get("/api/calendar/connect")
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_connect_returns_auth_url(client: AsyncClient):
    """Connect returns auth_url when Google OAuth is configured."""
    mock_url = "https://accounts.google.com/o/oauth2/v2/auth?state=xyz"

    with (
        patch("app.core.config.settings.GOOGLE_CLIENT_ID", "fake-client-id"),
        patch("app.core.config.settings.GOOGLE_CLIENT_SECRET", "fake-secret"),
        patch(
            "app.services.calendar_service.get_auth_url",
            new_callable=AsyncMock,
            return_value=mock_url,
        ),
    ):
        resp = await client.get("/api/calendar/connect")
        assert resp.status_code == 200
        assert resp.json()["auth_url"] == mock_url


# ---------------------------------------------------------------------------
# GET /api/calendar/status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calendar_status_not_connected(client: AsyncClient):
    """Status returns connected=False when no integration exists."""
    with patch(
        "app.services.calendar_service.get_status",
        new_callable=AsyncMock,
        return_value={"connected": False, "email": None, "last_synced": None},
    ):
        resp = await client.get("/api/calendar/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is False


@pytest.mark.asyncio
async def test_calendar_status_connected(client: AsyncClient):
    """Status returns connected=True with email when integration exists."""
    with patch(
        "app.services.calendar_service.get_status",
        new_callable=AsyncMock,
        return_value={
            "connected": True,
            "email": "user@example.com",
            "last_synced": "2025-01-01T00:00:00Z",
        },
    ):
        resp = await client.get("/api/calendar/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is True
        assert data["email"] == "user@example.com"


# ---------------------------------------------------------------------------
# GET /api/calendar/events
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_events(client: AsyncClient):
    """List events returns mocked events."""
    mock_events = [
        {"id": "evt1", "summary": "Team Standup", "start": "2025-01-01T10:00:00Z"},
        {"id": "evt2", "summary": "Lunch", "start": "2025-01-01T12:00:00Z"},
    ]
    with patch(
        "app.services.calendar_service.get_events",
        new_callable=AsyncMock,
        return_value=mock_events,
    ):
        resp = await client.get("/api/calendar/events", params={"days": 7})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 2
        assert len(data["events"]) == 2


@pytest.mark.asyncio
async def test_list_events_error(client: AsyncClient):
    """List events returns 400 when service raises ValueError."""
    with patch(
        "app.services.calendar_service.get_events",
        new_callable=AsyncMock,
        side_effect=ValueError("Calendar not connected"),
    ):
        resp = await client.get("/api/calendar/events")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/calendar/events
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_event(client: AsyncClient):
    """Create event returns mocked event data."""
    mock_event = {
        "id": "new-evt",
        "summary": "Meeting",
        "start": "2025-01-02T14:00:00Z",
    }
    with patch(
        "app.services.calendar_service.create_event",
        new_callable=AsyncMock,
        return_value=mock_event,
    ):
        resp = await client.post(
            "/api/calendar/events",
            json={
                "summary": "Meeting",
                "start_time": "2025-01-02T14:00:00Z",
                "end_time": "2025-01-02T15:00:00Z",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["event"]["summary"] == "Meeting"


@pytest.mark.asyncio
async def test_create_event_error(client: AsyncClient):
    """Create event returns 400 on ValueError."""
    with patch(
        "app.services.calendar_service.create_event",
        new_callable=AsyncMock,
        side_effect=ValueError("Not connected"),
    ):
        resp = await client.post(
            "/api/calendar/events",
            json={
                "summary": "Fail",
                "start_time": "2025-01-02T14:00:00Z",
                "end_time": "2025-01-02T15:00:00Z",
            },
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/calendar/disconnect
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_disconnect_calendar(client: AsyncClient):
    """Disconnect returns disconnected=True."""
    with patch(
        "app.services.calendar_service.disconnect",
        new_callable=AsyncMock,
        return_value=True,
    ):
        resp = await client.post("/api/calendar/disconnect")
        assert resp.status_code == 200
        assert resp.json()["disconnected"] is True
