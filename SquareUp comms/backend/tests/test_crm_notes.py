"""Tests for /api/crm/v2 notes endpoints."""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# POST /api/crm/v2/notes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_note(client: AsyncClient):
    """Create a note and verify response structure."""
    resp = await client.post(
        "/api/crm/v2/notes",
        json={
            "contact_id": "contact-abc",
            "content": "Had a great call today.",
            "is_pinned": False,
            "mentions": ["user-x"],
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["contact_id"] == "contact-abc"
    assert data["content"] == "Had a great call today."
    assert data["mentions"] == ["user-x"]
    assert data["is_pinned"] is False


@pytest.mark.asyncio
async def test_create_pinned_note(client: AsyncClient):
    """Create a pinned note."""
    resp = await client.post(
        "/api/crm/v2/notes",
        json={
            "contact_id": "contact-abc",
            "content": "Important note",
            "is_pinned": True,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["is_pinned"] is True


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts/{contact_id}/notes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_contact_notes(client: AsyncClient):
    """List notes for a contact."""
    # Create two notes
    await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-list", "content": "Note 1"},
    )
    await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-list", "content": "Note 2"},
    )

    resp = await client.get("/api/crm/v2/contacts/contact-list/notes")
    assert resp.status_code == 200
    notes = resp.json()["data"]
    assert len(notes) == 2


@pytest.mark.asyncio
async def test_list_notes_empty(client: AsyncClient):
    """List notes for a contact with no notes returns empty."""
    resp = await client.get("/api/crm/v2/contacts/nonexistent/notes")
    assert resp.status_code == 200
    assert resp.json()["data"] == []


# ---------------------------------------------------------------------------
# GET /api/crm/v2/notes/{note_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_note(client: AsyncClient):
    """Get a single note by ID."""
    create = await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-get", "content": "Fetch me"},
    )
    note_id = create.json()["data"]["id"]

    resp = await client.get(f"/api/crm/v2/notes/{note_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["content"] == "Fetch me"


@pytest.mark.asyncio
async def test_get_note_not_found(client: AsyncClient):
    """Get nonexistent note returns 404."""
    resp = await client.get("/api/crm/v2/notes/does-not-exist")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/crm/v2/notes/{note_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_note(client: AsyncClient):
    """Update a note's content and mentions."""
    create = await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-upd", "content": "Original"},
    )
    note_id = create.json()["data"]["id"]

    resp = await client.put(
        f"/api/crm/v2/notes/{note_id}",
        json={"content": "Updated", "mentions": ["user-a", "user-b"]},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["content"] == "Updated"
    assert data["mentions"] == ["user-a", "user-b"]


@pytest.mark.asyncio
async def test_update_note_not_found(client: AsyncClient):
    """Update nonexistent note returns 404."""
    resp = await client.put(
        "/api/crm/v2/notes/missing",
        json={"content": "nope"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/crm/v2/notes/{note_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_note(client: AsyncClient):
    """Delete a note."""
    create = await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-del", "content": "Delete me"},
    )
    note_id = create.json()["data"]["id"]

    resp = await client.delete(f"/api/crm/v2/notes/{note_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["deleted"] is True

    # Verify it's gone
    get_resp = await client.get(f"/api/crm/v2/notes/{note_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_note_not_found(client: AsyncClient):
    """Delete nonexistent note returns 404."""
    resp = await client.delete("/api/crm/v2/notes/missing")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/crm/v2/notes/{note_id}/pin  &  /unpin
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pin_note(client: AsyncClient):
    """Pin a note."""
    create = await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-pin", "content": "Pin me"},
    )
    note_id = create.json()["data"]["id"]
    assert create.json()["data"]["is_pinned"] is False

    resp = await client.put(f"/api/crm/v2/notes/{note_id}/pin")
    assert resp.status_code == 200
    assert resp.json()["data"]["is_pinned"] is True


@pytest.mark.asyncio
async def test_unpin_note(client: AsyncClient):
    """Unpin a previously pinned note."""
    create = await client.post(
        "/api/crm/v2/notes",
        json={"contact_id": "contact-unpin", "content": "Unpin me", "is_pinned": True},
    )
    note_id = create.json()["data"]["id"]

    resp = await client.put(f"/api/crm/v2/notes/{note_id}/unpin")
    assert resp.status_code == 200
    assert resp.json()["data"]["is_pinned"] is False


@pytest.mark.asyncio
async def test_pin_note_not_found(client: AsyncClient):
    """Pin nonexistent note returns 404."""
    resp = await client.put("/api/crm/v2/notes/missing/pin")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_unpin_note_not_found(client: AsyncClient):
    """Unpin nonexistent note returns 404."""
    resp = await client.put("/api/crm/v2/notes/missing/unpin")
    assert resp.status_code == 404
