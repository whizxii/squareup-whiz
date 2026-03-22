"""Tests for /api/crm/v2 endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER_ID

# V2 API base path
V2 = "/api/crm/v2"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _unwrap(resp_json: dict) -> dict:
    """Unwrap the V2 success_response envelope → return data."""
    assert resp_json["success"] is True
    return resp_json["data"]


async def _create_contact(
    client: AsyncClient,
    name: str = "John Doe",
    **kwargs,
) -> dict:
    """Create a CRM contact via V2 API and return the unwrapped data."""
    payload = {"name": name, **kwargs}
    resp = await client.post(f"{V2}/contacts", json=payload)
    assert resp.status_code == 201
    return _unwrap(resp.json())


# ---------------------------------------------------------------------------
# POST /api/crm/v2/contacts
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
# GET /api/crm/v2/contacts
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_contacts(client: AsyncClient):
    """List contacts returns created contacts."""
    await _create_contact(client, name="List Test")
    resp = await client.get(f"{V2}/contacts")
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["total_count"] >= 1
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_list_contacts_filter_by_stage(client: AsyncClient):
    """Filter contacts by stage."""
    await _create_contact(client, name="Lead Contact", stage="lead")
    await _create_contact(client, name="Won Contact", stage="won")

    resp = await client.get(f"{V2}/contacts", params={"stage": "won"})
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert all(c["stage"] == "won" for c in data["items"])


@pytest.mark.asyncio
async def test_list_contacts_search(client: AsyncClient):
    """Search contacts by name/email/company."""
    await _create_contact(client, name="Findable Corp", email="find@example.com")
    await _create_contact(client, name="Other Unrelated")

    resp = await client.get(f"{V2}/contacts", params={"search": "Findable"})
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["total_count"] >= 1
    assert any("Findable" in c["name"] for c in data["items"])


@pytest.mark.asyncio
async def test_list_contacts_pagination(client: AsyncClient):
    """Cursor-based pagination works with limit."""
    for i in range(5):
        await _create_contact(client, name=f"Page Contact {i}")

    resp = await client.get(f"{V2}/contacts", params={"limit": 2})
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert len(data["items"]) == 2
    assert data["total_count"] >= 5


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_contact_by_id(client: AsyncClient):
    """Get a single contact by ID."""
    contact = await _create_contact(client, name="Get Me")
    resp = await client.get(f"{V2}/contacts/{contact['id']}")
    assert resp.status_code == 200
    assert _unwrap(resp.json())["name"] == "Get Me"


@pytest.mark.asyncio
async def test_get_contact_not_found(client: AsyncClient):
    """Get non-existent contact returns 404."""
    resp = await client.get(f"{V2}/contacts/nonexistent-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/crm/v2/contacts/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_contact(client: AsyncClient):
    """Update contact fields."""
    contact = await _create_contact(client, name="Old Name")
    resp = await client.put(
        f"{V2}/contacts/{contact['id']}",
        json={"name": "New Name", "company": "New Co"},
    )
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["name"] == "New Name"
    assert data["company"] == "New Co"


@pytest.mark.asyncio
async def test_update_stage_changes_timestamp(client: AsyncClient):
    """Changing stage updates stage_changed_at."""
    contact = await _create_contact(client, name="Stage Mover")
    original_changed = contact["stage_changed_at"]

    resp = await client.put(
        f"{V2}/contacts/{contact['id']}",
        json={"stage": "qualified"},
    )
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["stage"] == "qualified"
    assert data["stage_changed_at"] != original_changed


@pytest.mark.asyncio
async def test_update_stage_via_contact_put(client: AsyncClient):
    """Stage can be updated via PUT /contacts/{id}."""
    contact = await _create_contact(client, name="Stage Updater")

    resp = await client.put(
        f"{V2}/contacts/{contact['id']}",
        json={"stage": "proposal"},
    )
    assert resp.status_code == 200
    assert _unwrap(resp.json())["stage"] == "proposal"


@pytest.mark.asyncio
async def test_update_same_stage_is_noop(client: AsyncClient):
    """Updating to the same stage still returns 200 with unchanged stage."""
    contact = await _create_contact(client, name="Same Stage")

    resp = await client.put(
        f"{V2}/contacts/{contact['id']}",
        json={"stage": "lead"},  # same as default
    )
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["stage"] == "lead"


# ---------------------------------------------------------------------------
# DELETE /api/crm/v2/contacts/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_contact(client: AsyncClient):
    """Delete (archive) contact returns 200 with archived flag."""
    contact = await _create_contact(client, name="Delete Me")
    resp = await client.delete(f"{V2}/contacts/{contact['id']}")
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["archived"] is True


# ---------------------------------------------------------------------------
# GET /api/crm/v2/pipelines/default
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_default_pipeline_has_stages(client: AsyncClient):
    """Default pipeline is auto-created with 6 stages."""
    resp = await client.get(f"{V2}/pipelines/default")
    assert resp.status_code == 200
    pipeline = _unwrap(resp.json())
    assert pipeline["name"] == "Sales Pipeline"
    stages = pipeline["stages"]
    assert len(stages) == 6
    stage_ids = [s["id"] for s in stages]
    assert "lead" in stage_ids
    assert "closed_won" in stage_ids
    assert "closed_lost" in stage_ids


@pytest.mark.asyncio
async def test_pipeline_stages_have_probability(client: AsyncClient):
    """Each pipeline stage has a probability value."""
    resp = await client.get(f"{V2}/pipelines/default")
    pipeline = _unwrap(resp.json())
    for stage in pipeline["stages"]:
        assert "probability" in stage
        assert isinstance(stage["probability"], int)
