"""Tests for /api/auth endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# POST /api/auth/verify
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_verify_new_user_needs_onboarding(client: AsyncClient):
    """Verify returns needs_onboarding=True for users without a profile."""
    resp = await client.post("/api/auth/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["uid"] == TEST_USER_ID
    assert data["needs_onboarding"] is True
    assert data["profile"] is None


@pytest.mark.asyncio
async def test_verify_existing_user(client: AsyncClient):
    """After onboarding, verify returns needs_onboarding=False with profile."""
    # Onboard first
    await client.post("/api/auth/onboard", json={
        "full_name": "Test User",
        "avatar_id": "fox",
    })

    resp = await client.post("/api/auth/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["uid"] == TEST_USER_ID
    assert data["needs_onboarding"] is False
    assert data["profile"] is not None
    assert data["profile"]["display_name"] == "Test User"


# ---------------------------------------------------------------------------
# POST /api/auth/onboard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_onboard_creates_profile(client: AsyncClient):
    """Onboard creates a new user profile and returns 201."""
    resp = await client.post("/api/auth/onboard", json={
        "full_name": "Alice Builder",
        "nickname": "alice",
        "avatar_id": "cat",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["display_name"] == "Alice Builder"
    assert data["nickname"] == "alice"
    assert data["avatar_config"] is not None
    assert data["avatar_config"]["avatar_id"] == "cat"


@pytest.mark.asyncio
async def test_onboard_duplicate_returns_409(client: AsyncClient):
    """Onboarding the same user twice returns 409 Conflict."""
    await client.post("/api/auth/onboard", json={
        "full_name": "Alice",
        "avatar_id": "fox",
    })
    resp = await client.post("/api/auth/onboard", json={
        "full_name": "Alice Again",
        "avatar_id": "bear",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_onboard_invalid_avatar_returns_422(client: AsyncClient):
    """Onboarding with an invalid avatar_id returns 422."""
    resp = await client.post("/api/auth/onboard", json={
        "full_name": "Bad Avatar",
        "avatar_id": "unicorn",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_me_returns_profile(client: AsyncClient):
    """GET /me returns the onboarded user's profile."""
    await client.post("/api/auth/onboard", json={
        "full_name": "Me User",
        "avatar_id": "robot",
    })
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Me User"


@pytest.mark.asyncio
async def test_get_me_without_profile_returns_404(client: AsyncClient):
    """GET /me before onboarding returns 404."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/auth/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    """PUT /me updates profile fields."""
    await client.post("/api/auth/onboard", json={
        "full_name": "Original Name",
        "avatar_id": "fox",
    })
    resp = await client.put("/api/auth/me", json={
        "display_name": "Updated Name",
        "nickname": "upd",
        "status": "away",
        "status_emoji": "🌙",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "Updated Name"
    assert data["nickname"] == "upd"
    assert data["status"] == "away"
    assert data["status_emoji"] == "🌙"


@pytest.mark.asyncio
async def test_update_avatar_via_profile(client: AsyncClient):
    """PUT /me with avatar_id changes avatar_config."""
    await client.post("/api/auth/onboard", json={
        "full_name": "Avatar Changer",
        "avatar_id": "fox",
    })
    resp = await client.put("/api/auth/me", json={"avatar_id": "alien"})
    assert resp.status_code == 200
    assert resp.json()["avatar_config"]["avatar_id"] == "alien"


@pytest.mark.asyncio
async def test_update_invalid_avatar_returns_422(client: AsyncClient):
    """PUT /me with an invalid avatar_id returns 422."""
    await client.post("/api/auth/onboard", json={
        "full_name": "Bad Update",
        "avatar_id": "fox",
    })
    resp = await client.put("/api/auth/me", json={"avatar_id": "nope"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/auth/avatars
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_avatars(client: AsyncClient):
    """GET /avatars returns 5 avatar options."""
    resp = await client.get("/api/auth/avatars")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5
    ids = {a["id"] for a in data}
    assert ids == {"fox", "cat", "bear", "robot", "alien"}
