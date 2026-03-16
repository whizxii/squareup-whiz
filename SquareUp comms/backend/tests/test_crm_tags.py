"""Tests for /api/crm/v2 tags endpoints."""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_tag(client: AsyncClient, name: str = "VIP", color: str = "#FF0000") -> dict:
    resp = await client.post("/api/crm/v2/tags", json={"name": name, "color": color})
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# POST /api/crm/v2/tags
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_tag(client: AsyncClient):
    """Create a tag."""
    data = await _create_tag(client, "Priority", "#00FF00")
    assert data["name"] == "Priority"
    assert data["color"] == "#00FF00"
    assert "id" in data


# ---------------------------------------------------------------------------
# GET /api/crm/v2/tags
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_tags(client: AsyncClient):
    """List all tags."""
    await _create_tag(client, "Alpha")
    await _create_tag(client, "Beta")

    resp = await client.get("/api/crm/v2/tags")
    assert resp.status_code == 200
    tags = resp.json()["data"]
    assert len(tags) >= 2
    names = [t["name"] for t in tags]
    assert "Alpha" in names
    assert "Beta" in names


# ---------------------------------------------------------------------------
# PUT /api/crm/v2/tags/{tag_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_tag(client: AsyncClient):
    """Update a tag's name and color."""
    tag = await _create_tag(client, "OldName", "#111111")

    resp = await client.put(
        f"/api/crm/v2/tags/{tag['id']}",
        json={"name": "NewName", "color": "#222222"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "NewName"
    assert data["color"] == "#222222"


@pytest.mark.asyncio
async def test_update_tag_not_found(client: AsyncClient):
    """Update nonexistent tag returns 404."""
    resp = await client.put(
        "/api/crm/v2/tags/missing",
        json={"name": "nope"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/crm/v2/tags/{tag_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_tag(client: AsyncClient):
    """Delete a tag."""
    tag = await _create_tag(client, "ToDelete")

    resp = await client.delete(f"/api/crm/v2/tags/{tag['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["deleted"] is True


@pytest.mark.asyncio
async def test_delete_tag_not_found(client: AsyncClient):
    """Delete nonexistent tag returns 404."""
    resp = await client.delete("/api/crm/v2/tags/missing")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_tag_removes_associations(client: AsyncClient):
    """Deleting a tag also removes its contact-tag links."""
    tag = await _create_tag(client, "LinkedTag")

    # Link tag to a contact
    await client.post(
        "/api/crm/v2/contacts/contact-xyz/tags",
        json={"tag_id": tag["id"]},
    )

    # Delete the tag
    resp = await client.delete(f"/api/crm/v2/tags/{tag['id']}")
    assert resp.status_code == 200

    # Contact should have no tags now
    tags_resp = await client.get("/api/crm/v2/contacts/contact-xyz/tags")
    assert tags_resp.status_code == 200
    assert tags_resp.json()["data"] == []


# ---------------------------------------------------------------------------
# POST /api/crm/v2/contacts/{contact_id}/tags
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_tag_to_contact(client: AsyncClient):
    """Link a tag to a contact."""
    tag = await _create_tag(client, "Linked")

    resp = await client.post(
        "/api/crm/v2/contacts/contact-link/tags",
        json={"tag_id": tag["id"]},
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["linked"] is True
    assert data["already_existed"] is False


@pytest.mark.asyncio
async def test_add_tag_to_contact_duplicate(client: AsyncClient):
    """Re-linking same tag is idempotent."""
    tag = await _create_tag(client, "DupTag")

    await client.post(
        "/api/crm/v2/contacts/contact-dup/tags",
        json={"tag_id": tag["id"]},
    )
    resp = await client.post(
        "/api/crm/v2/contacts/contact-dup/tags",
        json={"tag_id": tag["id"]},
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["already_existed"] is True


@pytest.mark.asyncio
async def test_add_tag_to_contact_tag_not_found(client: AsyncClient):
    """Adding nonexistent tag to contact returns 404."""
    resp = await client.post(
        "/api/crm/v2/contacts/contact-nope/tags",
        json={"tag_id": "no-such-tag"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/crm/v2/contacts/{contact_id}/tags/{tag_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_remove_tag_from_contact(client: AsyncClient):
    """Unlink a tag from a contact."""
    tag = await _create_tag(client, "RemoveMe")
    await client.post(
        "/api/crm/v2/contacts/contact-rm/tags",
        json={"tag_id": tag["id"]},
    )

    resp = await client.delete(f"/api/crm/v2/contacts/contact-rm/tags/{tag['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["unlinked"] is True


@pytest.mark.asyncio
async def test_remove_tag_from_contact_not_found(client: AsyncClient):
    """Unlinking nonexistent association returns 404."""
    resp = await client.delete("/api/crm/v2/contacts/contact-x/tags/no-tag")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/crm/v2/contacts/{contact_id}/tags
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_contact_tags(client: AsyncClient):
    """Get tags for a contact."""
    tag1 = await _create_tag(client, "Tag1")
    tag2 = await _create_tag(client, "Tag2")

    await client.post(
        "/api/crm/v2/contacts/contact-tags/tags",
        json={"tag_id": tag1["id"]},
    )
    await client.post(
        "/api/crm/v2/contacts/contact-tags/tags",
        json={"tag_id": tag2["id"]},
    )

    resp = await client.get("/api/crm/v2/contacts/contact-tags/tags")
    assert resp.status_code == 200
    tags = resp.json()["data"]
    assert len(tags) == 2
    names = {t["name"] for t in tags}
    assert names == {"Tag1", "Tag2"}


@pytest.mark.asyncio
async def test_get_contact_tags_empty(client: AsyncClient):
    """Get tags for a contact with none returns empty."""
    resp = await client.get("/api/crm/v2/contacts/no-tags/tags")
    assert resp.status_code == 200
    assert resp.json()["data"] == []
