"""Tests for /api/crm endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_contact(
    client: AsyncClient,
    name: str = "John Doe",
    **kwargs,
) -> dict:
    """Create a CRM contact and return response JSON."""
    payload = {"name": name, **kwargs}
    resp = await client.post("/api/crm/contacts", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/crm/contacts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_contact(client: AsyncClient):
    """Creating a contact returns 201 with correct data."""
    data = await _create_contact(
        client,
        name="Alice Corp",
        email="alice@example.com",
        company="Acme",
        tags=["vip", "enterprise"],
    )
    assert data["name"] == "Alice Corp"
    assert data["email"] == "alice@example.com"
    assert data["company"] == "Acme"
    assert data["tags"] == ["vip", "enterprise"]
    assert data["stage"] == "lead"
    assert data["created_by"] == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_contact_defaults(client: AsyncClient):
    """Contact uses default stage and currency."""
    data = await _create_contact(client, name="Default Guy")
    assert data["stage"] == "lead"
    assert data["currency"] == "INR"


# ---------------------------------------------------------------------------
# GET /api/crm/contacts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_contacts(client: AsyncClient):
    """List contacts returns created contacts."""
    await _create_contact(client, name="List Test")
    resp = await client.get("/api/crm/contacts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["contacts"]) >= 1


@pytest.mark.asyncio
async def test_list_contacts_filter_by_stage(client: AsyncClient):
    """Filter contacts by stage."""
    await _create_contact(client, name="Lead Contact", stage="lead")
    await _create_contact(client, name="Won Contact", stage="won")

    resp = await client.get("/api/crm/contacts", params={"stage": "won"})
    assert resp.status_code == 200
    data = resp.json()
    assert all(c["stage"] == "won" for c in data["contacts"])


@pytest.mark.asyncio
async def test_list_contacts_search(client: AsyncClient):
    """Search contacts by name/email/company."""
    await _create_contact(client, name="Findable Corp", email="find@example.com")
    await _create_contact(client, name="Other Unrelated")

    resp = await client.get("/api/crm/contacts", params={"search": "Findable"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any("Findable" in c["name"] for c in data["contacts"])


@pytest.mark.asyncio
async def test_list_contacts_pagination(client: AsyncClient):
    """Offset/limit pagination works."""
    for i in range(5):
        await _create_contact(client, name=f"Page Contact {i}")

    resp = await client.get("/api/crm/contacts", params={"limit": 2, "offset": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["contacts"]) == 2
    assert data["total"] >= 5


# ---------------------------------------------------------------------------
# GET /api/crm/contacts/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_contact_by_id(client: AsyncClient):
    """Get a single contact by ID."""
    contact = await _create_contact(client, name="Get Me")
    resp = await client.get(f"/api/crm/contacts/{contact['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_get_contact_not_found(client: AsyncClient):
    """Get non-existent contact returns 404."""
    resp = await client.get("/api/crm/contacts/nonexistent-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/crm/contacts/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_contact(client: AsyncClient):
    """Update contact fields."""
    contact = await _create_contact(client, name="Old Name")
    resp = await client.put(
        f"/api/crm/contacts/{contact['id']}",
        json={"name": "New Name", "company": "New Co"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Name"
    assert data["company"] == "New Co"


@pytest.mark.asyncio
async def test_update_stage_changes_timestamp(client: AsyncClient):
    """Changing stage updates stage_changed_at."""
    contact = await _create_contact(client, name="Stage Mover")
    original_changed = contact["stage_changed_at"]

    resp = await client.put(
        f"/api/crm/contacts/{contact['id']}",
        json={"stage": "qualified"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] == "qualified"
    assert data["stage_changed_at"] != original_changed


# ---------------------------------------------------------------------------
# DELETE /api/crm/contacts/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_contact(client: AsyncClient):
    """Delete contact returns 204 and cascades activities."""
    contact = await _create_contact(client, name="Delete Me")
    # Add an activity first
    await client.post(
        f"/api/crm/contacts/{contact['id']}/activities",
        json={"type": "note", "title": "A note"},
    )

    resp = await client.delete(f"/api/crm/contacts/{contact['id']}")
    assert resp.status_code == 204

    # Confirm gone
    resp = await client.get(f"/api/crm/contacts/{contact['id']}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/crm/contacts/{id}/activities
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_activity(client: AsyncClient):
    """Creating an activity returns 201."""
    contact = await _create_contact(client, name="Activity Target")
    resp = await client.post(
        f"/api/crm/contacts/{contact['id']}/activities",
        json={"type": "call", "title": "Follow-up call"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "call"
    assert data["title"] == "Follow-up call"
    assert data["performed_by"] == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_activity_updates_last_contacted(client: AsyncClient):
    """Call/email/meeting activities update last_contacted_at."""
    contact = await _create_contact(client, name="Contactable")
    assert contact["last_contacted_at"] is None

    await client.post(
        f"/api/crm/contacts/{contact['id']}/activities",
        json={"type": "email", "title": "Sent proposal"},
    )

    # Refetch contact
    resp = await client.get(f"/api/crm/contacts/{contact['id']}")
    assert resp.json()["last_contacted_at"] is not None


@pytest.mark.asyncio
async def test_create_activity_invalid_type_returns_422(client: AsyncClient):
    """Invalid activity type returns 422."""
    contact = await _create_contact(client, name="Bad Activity")
    resp = await client.post(
        f"/api/crm/contacts/{contact['id']}/activities",
        json={"type": "invalid_type", "title": "Nope"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/crm/contacts/{id}/activities
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_activities(client: AsyncClient):
    """List activities for a contact."""
    contact = await _create_contact(client, name="Activity List")
    await client.post(
        f"/api/crm/contacts/{contact['id']}/activities",
        json={"type": "note", "title": "Note 1"},
    )
    await client.post(
        f"/api/crm/contacts/{contact['id']}/activities",
        json={"type": "note", "title": "Note 2"},
    )

    resp = await client.get(f"/api/crm/contacts/{contact['id']}/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["activities"]) == 2


# ---------------------------------------------------------------------------
# GET /api/crm/pipeline
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_returns_all_stages(client: AsyncClient):
    """Pipeline returns all 8 stages."""
    resp = await client.get("/api/crm/pipeline")
    assert resp.status_code == 200
    stages = resp.json()["stages"]
    assert len(stages) == 8
    stage_names = [s["name"] for s in stages]
    assert "lead" in stage_names
    assert "won" in stage_names
    assert "churned" in stage_names


@pytest.mark.asyncio
async def test_pipeline_groups_contacts(client: AsyncClient):
    """Pipeline groups contacts by their stage."""
    await _create_contact(client, name="Pipeline Lead", stage="lead")
    await _create_contact(client, name="Pipeline Won", stage="won")

    resp = await client.get("/api/crm/pipeline")
    stages = resp.json()["stages"]
    lead_stage = next(s for s in stages if s["name"] == "lead")
    won_stage = next(s for s in stages if s["name"] == "won")
    assert lead_stage["count"] >= 1
    assert won_stage["count"] >= 1


# ---------------------------------------------------------------------------
# PUT /api/crm/contacts/{id}/stage
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_stage_via_endpoint(client: AsyncClient):
    """PUT /stage updates stage and logs deal_update activity."""
    contact = await _create_contact(client, name="Stage Updater")

    resp = await client.put(
        f"/api/crm/contacts/{contact['id']}/stage",
        json={"stage": "proposal"},
    )
    assert resp.status_code == 200
    assert resp.json()["stage"] == "proposal"

    # Check activity was logged
    resp = await client.get(f"/api/crm/contacts/{contact['id']}/activities")
    activities = resp.json()["activities"]
    assert any(a["type"] == "deal_update" for a in activities)


@pytest.mark.asyncio
async def test_update_same_stage_is_noop(client: AsyncClient):
    """Moving to same stage is a no-op (no activity logged)."""
    contact = await _create_contact(client, name="Same Stage")

    resp = await client.put(
        f"/api/crm/contacts/{contact['id']}/stage",
        json={"stage": "lead"},  # same as default
    )
    assert resp.status_code == 200

    # No deal_update activity should exist
    resp = await client.get(f"/api/crm/contacts/{contact['id']}/activities")
    assert resp.json()["total"] == 0
