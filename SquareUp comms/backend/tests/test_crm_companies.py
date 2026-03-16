"""Tests for /api/crm/v2 companies endpoints."""

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_company(client: AsyncClient, name: str = "Acme Corp", **kwargs) -> dict:
    payload = {"name": name, **kwargs}
    resp = await client.post("/api/crm/v2/companies", json=payload)
    assert resp.status_code == 201
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# POST /api/crm/v2/companies
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_company(client: AsyncClient):
    """Create a company."""
    data = await _create_company(
        client,
        name="TestCo",
        domain="testco.com",
        industry="Tech",
        size="50-100",
    )
    assert data["name"] == "TestCo"
    assert data["domain"] == "testco.com"
    assert data["industry"] == "Tech"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_company_minimal(client: AsyncClient):
    """Create a company with only required fields."""
    data = await _create_company(client, name="MinimalCo")
    assert data["name"] == "MinimalCo"
    assert data["domain"] is None


# ---------------------------------------------------------------------------
# GET /api/crm/v2/companies
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_companies(client: AsyncClient):
    """List companies."""
    await _create_company(client, name="ListCo1")
    await _create_company(client, name="ListCo2")

    resp = await client.get("/api/crm/v2/companies")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) >= 2


@pytest.mark.asyncio
async def test_list_companies_with_search(client: AsyncClient):
    """List companies with search filter."""
    await _create_company(client, name="UniqueSearchName")

    resp = await client.get("/api/crm/v2/companies", params={"search": "UniqueSearchName"})
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert any(c["name"] == "UniqueSearchName" for c in items)


# ---------------------------------------------------------------------------
# GET /api/crm/v2/companies/{company_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_company(client: AsyncClient):
    """Get a single company."""
    company = await _create_company(client, name="GetCo")

    resp = await client.get(f"/api/crm/v2/companies/{company['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "GetCo"


@pytest.mark.asyncio
async def test_get_company_not_found(client: AsyncClient):
    """Get nonexistent company returns 404."""
    resp = await client.get("/api/crm/v2/companies/missing")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/crm/v2/companies/{company_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_company(client: AsyncClient):
    """Update a company."""
    company = await _create_company(client, name="BeforeUpdate")

    resp = await client.put(
        f"/api/crm/v2/companies/{company['id']}",
        json={"name": "AfterUpdate", "industry": "Finance"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "AfterUpdate"
    assert data["industry"] == "Finance"


@pytest.mark.asyncio
async def test_update_company_not_found(client: AsyncClient):
    """Update nonexistent company returns 404."""
    resp = await client.put(
        "/api/crm/v2/companies/missing",
        json={"name": "nope"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/crm/v2/companies/{company_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_archive_company(client: AsyncClient):
    """Soft-delete (archive) a company."""
    company = await _create_company(client, name="ArchiveMe")

    resp = await client.delete(f"/api/crm/v2/companies/{company['id']}")
    assert resp.status_code == 200
    assert resp.json()["data"]["archived"] is True


@pytest.mark.asyncio
async def test_archive_company_not_found(client: AsyncClient):
    """Archive nonexistent company returns 404."""
    resp = await client.delete("/api/crm/v2/companies/missing")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/crm/v2/companies/{company_id}/contacts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_company_contacts_empty(client: AsyncClient):
    """Get contacts for a company with none returns empty list."""
    company = await _create_company(client, name="NoContactsCo")

    resp = await client.get(f"/api/crm/v2/companies/{company['id']}/contacts")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["company"]["name"] == "NoContactsCo"
    assert data["contacts"] == []


@pytest.mark.asyncio
async def test_get_company_contacts_not_found(client: AsyncClient):
    """Get contacts for nonexistent company returns 404."""
    resp = await client.get("/api/crm/v2/companies/missing/contacts")
    assert resp.status_code == 404
