"""Tests for /api/channels endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_channel(client: AsyncClient, name: str = "general", **kwargs) -> dict:
    """Create a channel and return the response JSON."""
    payload = {"name": name, "type": "public", **kwargs}
    resp = await client.post("/api/channels/", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/channels/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_channel(client: AsyncClient):
    """Creating a channel returns 201 with correct data."""
    data = await _create_channel(client, name="engineering", description="Eng team")
    assert data["name"] == "engineering"
    assert data["type"] == "public"
    assert data["description"] == "Eng team"
    assert data["created_by"] == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_channel_auto_adds_owner(client: AsyncClient):
    """Creator is automatically added as owner member."""
    ch = await _create_channel(client, name="owned-channel")
    resp = await client.get(f"/api/channels/{ch['id']}/members")
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 1
    assert members[0]["user_id"] == TEST_USER_ID
    assert members[0]["role"] == "owner"


# ---------------------------------------------------------------------------
# GET /api/channels/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_channels_only_member_of(client: AsyncClient):
    """List returns only channels the user is a member of."""
    await _create_channel(client, name="my-channel")
    resp = await client.get("/api/channels/")
    assert resp.status_code == 200
    channels = resp.json()
    assert len(channels) >= 1
    names = [c["name"] for c in channels]
    assert "my-channel" in names


# ---------------------------------------------------------------------------
# GET /api/channels/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_channel_by_id(client: AsyncClient):
    """Get returns the correct channel."""
    ch = await _create_channel(client, name="fetch-me")
    resp = await client.get(f"/api/channels/{ch['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "fetch-me"


@pytest.mark.asyncio
async def test_get_channel_not_found(client: AsyncClient):
    """Get with non-existent ID returns 404."""
    resp = await client.get("/api/channels/does-not-exist")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/channels/{id}/members
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_member(client: AsyncClient):
    """Adding a new member returns 201."""
    ch = await _create_channel(client, name="add-member-ch")
    resp = await client.post(
        f"/api/channels/{ch['id']}/members",
        json={"user_id": "other-user-001"},
    )
    assert resp.status_code == 201
    assert resp.json()["user_id"] == "other-user-001"
    assert resp.json()["role"] == "member"


@pytest.mark.asyncio
async def test_add_duplicate_member_returns_409(client: AsyncClient):
    """Adding the same member twice returns 409."""
    ch = await _create_channel(client, name="dup-member-ch")
    # Creator is already a member; adding again should conflict
    resp = await client.post(
        f"/api/channels/{ch['id']}/members",
        json={"user_id": TEST_USER_ID},
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# DELETE /api/channels/{id}/members/{user_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_remove_member(client: AsyncClient):
    """Removing a member returns 204."""
    ch = await _create_channel(client, name="remove-member-ch")
    await client.post(
        f"/api/channels/{ch['id']}/members",
        json={"user_id": "removable-user"},
    )
    resp = await client.delete(
        f"/api/channels/{ch['id']}/members/removable-user"
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_remove_nonexistent_member_returns_404(client: AsyncClient):
    """Removing a non-member returns 404."""
    ch = await _create_channel(client, name="no-member-ch")
    resp = await client.delete(
        f"/api/channels/{ch['id']}/members/ghost-user"
    )
    assert resp.status_code == 404
