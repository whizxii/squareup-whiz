"""Tests for /api/crm/v2 contacts endpoints."""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_contact(client: AsyncClient, name: str = "Jane Doe", **kwargs) -> dict:
    payload = {"name": name, **kwargs}
    resp = await client.post("/api/crm/v2/contacts", json=payload)
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# POST /api/crm/v2/contacts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_contact(client: AsyncClient):
    """Create a contact with full data."""
    data = await _create_contact(
        client,
        name="Alice",
        email="alice@example.com",
        phone="+1234567890",
        company="TechCorp",
        stage="qualified",
        value=5000.0,
        tags=["vip", "enterprise"],
    )
    assert data["name"] == "Alice"
    assert data["email"] == "alice@example.com"
    assert data["stage"] == "qualified"
    assert data["value"] == 5000.0
    assert data["tags"] == ["vip", "enterprise"]


@pytest.mark.asyncio
async def test_create_contact_minimal(client: AsyncClient):
    """Create a contact with only required name."""
    data = await _create_contact(client, name="Bob")
    assert data["name"] == "Bob"
    assert data["stage"] == "lead"


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_contacts(client: AsyncClient):
    """List contacts returns items."""
    await _create_contact(client, name="ListA")
    await _create_contact(client, name="ListB")

    resp = await client.get("/api/crm/v2/contacts")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) >= 2
    assert "next_cursor" in data
    assert "has_more" in data
    assert "total_count" in data


@pytest.mark.asyncio
async def test_list_contacts_filter_stage(client: AsyncClient):
    """List contacts filtered by stage."""
    await _create_contact(client, name="StageFilter", stage="qualified")

    resp = await client.get("/api/crm/v2/contacts", params={"stage": "qualified"})
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert all(c["stage"] == "qualified" for c in items)


@pytest.mark.asyncio
async def test_list_contacts_search(client: AsyncClient):
    """List contacts with search query."""
    await _create_contact(client, name="SearchableUniqueXyz")

    resp = await client.get("/api/crm/v2/contacts", params={"search": "SearchableUniqueXyz"})
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(c["name"] == "SearchableUniqueXyz" for c in items)


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts/{contact_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_contact(client: AsyncClient):
    """Get a single contact."""
    contact = await _create_contact(client, name="GetMe")

    resp = await client.get(f"/api/crm/v2/contacts/{contact['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "GetMe"


@pytest.mark.asyncio
async def test_get_contact_not_found(client: AsyncClient):
    """Get nonexistent contact returns 404."""
    resp = await client.get("/api/crm/v2/contacts/missing")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/crm/v2/contacts/{contact_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_contact(client: AsyncClient):
    """Update contact fields."""
    contact = await _create_contact(client, name="BeforeUpdate")

    resp = await client.put(
        f"/api/crm/v2/contacts/{contact['id']}",
        json={"name": "AfterUpdate", "email": "updated@example.com"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "AfterUpdate"
    assert data["email"] == "updated@example.com"


@pytest.mark.asyncio
async def test_update_contact_not_found(client: AsyncClient):
    """Update nonexistent contact returns 404."""
    resp = await client.put(
        "/api/crm/v2/contacts/missing",
        json={"name": "nope"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/crm/v2/contacts/{contact_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_archive_contact(client: AsyncClient):
    """Soft-delete (archive) a contact."""
    contact = await _create_contact(client, name="ArchiveMe")

    resp = await client.delete(f"/api/crm/v2/contacts/{contact['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["archived"] is True


@pytest.mark.asyncio
async def test_archive_contact_not_found(client: AsyncClient):
    """Archive nonexistent contact returns 404."""
    resp = await client.delete("/api/crm/v2/contacts/missing")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/crm/v2/contacts/{contact_id}/restore
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_restore_contact(client: AsyncClient):
    """Restore an archived contact."""
    contact = await _create_contact(client, name="RestoreMe")

    # Archive first
    await client.delete(f"/api/crm/v2/contacts/{contact['id']}")

    # Restore
    resp = await client.post(f"/api/crm/v2/contacts/{contact['id']}/restore")
    assert resp.status_code == 200
    assert resp.json()["data"]["is_archived"] is False


@pytest.mark.asyncio
async def test_restore_contact_not_found(client: AsyncClient):
    """Restore nonexistent contact returns 404."""
    resp = await client.post("/api/crm/v2/contacts/missing/restore")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts/{contact_id}/360
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_contact_360(client: AsyncClient):
    """Get Contact 360 view."""
    contact = await _create_contact(client, name="FullView")

    resp = await client.get(f"/api/crm/v2/contacts/{contact['id']}/360")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["contact"]["name"] == "FullView"
    assert "tags" in data
    assert "activities" in data
    assert "notes" in data


@pytest.mark.asyncio
async def test_contact_360_not_found(client: AsyncClient):
    """Contact 360 for nonexistent returns 404."""
    resp = await client.get("/api/crm/v2/contacts/missing/360")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts/{contact_id}/duplicates
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_find_duplicates(client: AsyncClient):
    """Find duplicate contacts for a given contact."""
    contact = await _create_contact(client, name="DupTest", email="dup@example.com")

    resp = await client.get(f"/api/crm/v2/contacts/{contact['id']}/duplicates")
    assert resp.status_code == 200
    # Response is a list (may be empty if no duplicates)
    assert isinstance(resp.json()["data"], list)


@pytest.mark.asyncio
async def test_find_duplicates_not_found(client: AsyncClient):
    """Duplicates for nonexistent contact returns 404."""
    resp = await client.get("/api/crm/v2/contacts/missing/duplicates")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/crm/v2/search
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unified_search(client: AsyncClient):
    """Unified search across contacts and companies."""
    await _create_contact(client, name="UnifiedSearchTarget")

    resp = await client.get("/api/crm/v2/search", params={"q": "UnifiedSearchTarget"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "contacts" in data
    assert "companies" in data
