"""Tests for /api/agents endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_agent(
    client: AsyncClient,
    name: str = "Test Agent",
    **kwargs,
) -> dict:
    """Create an agent and return the response JSON."""
    payload = {
        "name": name,
        "system_prompt": "You are a test agent.",
        "tools": ["tool_a"],
        **kwargs,
    }
    resp = await client.post("/api/agents/", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/agents/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_agent(client: AsyncClient):
    """Creating an agent returns 201."""
    data = await _create_agent(client, name="My Agent", description="A helper")
    assert data["name"] == "My Agent"
    assert data["description"] == "A helper"
    assert data["created_by"] == TEST_USER_ID
    assert data["active"] is True
    assert data["status"] == "idle"


# ---------------------------------------------------------------------------
# GET /api/agents/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_agents_returns_active_only(client: AsyncClient):
    """List returns only active agents."""
    agent = await _create_agent(client, name="Active Agent")
    deactivated = await _create_agent(client, name="Gone Agent")

    # Deactivate one
    await client.delete(f"/api/agents/{deactivated['id']}")

    resp = await client.get("/api/agents/")
    assert resp.status_code == 200
    agents = resp.json()
    ids = [a["id"] for a in agents]
    assert agent["id"] in ids
    assert deactivated["id"] not in ids


# ---------------------------------------------------------------------------
# GET /api/agents/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_agent_by_id(client: AsyncClient):
    """Get a single agent by ID."""
    agent = await _create_agent(client, name="Fetch Agent")
    resp = await client.get(f"/api/agents/{agent['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Fetch Agent"


@pytest.mark.asyncio
async def test_get_deactivated_agent_returns_404(client: AsyncClient):
    """Getting a deactivated agent returns 404."""
    agent = await _create_agent(client, name="Deactivate Me")
    await client.delete(f"/api/agents/{agent['id']}")

    resp = await client.get(f"/api/agents/{agent['id']}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_agent_returns_404(client: AsyncClient):
    """Getting a non-existent agent returns 404."""
    resp = await client.get("/api/agents/fake-agent-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/agents/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_agent(client: AsyncClient):
    """Updating agent fields."""
    agent = await _create_agent(client, name="Updatable")
    resp = await client.put(
        f"/api/agents/{agent['id']}",
        json={"name": "Updated Agent", "description": "New desc"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Agent"
    assert data["description"] == "New desc"


# ---------------------------------------------------------------------------
# DELETE /api/agents/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_deactivate_agent(client: AsyncClient):
    """Soft-delete sets active=False and status=offline."""
    agent = await _create_agent(client, name="Kill Me")
    resp = await client.delete(f"/api/agents/{agent['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["detail"] == "Agent deactivated"
    assert data["agent_id"] == agent["id"]


# ---------------------------------------------------------------------------
# PUT /api/agents/{id}/status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_agent_status(client: AsyncClient):
    """Update agent status to a valid value."""
    agent = await _create_agent(client, name="Status Agent")
    resp = await client.put(
        f"/api/agents/{agent['id']}/status",
        json={"status": "working", "current_task": "Processing stuff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "working"
    assert data["current_task"] == "Processing stuff"


@pytest.mark.asyncio
async def test_update_agent_invalid_status_returns_422(client: AsyncClient):
    """Invalid status value returns 422."""
    agent = await _create_agent(client, name="Bad Status")
    resp = await client.put(
        f"/api/agents/{agent['id']}/status",
        json={"status": "dancing"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/agents/{id}/invoke
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invoke_agent(client: AsyncClient):
    """Invoking an agent returns a mock execution response."""
    agent = await _create_agent(client, name="Invoke Agent")
    resp = await client.post(
        f"/api/agents/{agent['id']}/invoke",
        json={"message": "Hello agent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_id"] == agent["id"]
    assert data["status"] == "success"
    assert "Hello agent" in data["response_text"]


@pytest.mark.asyncio
async def test_invoke_updates_agent_stats(client: AsyncClient):
    """Invoking an agent increments total_executions."""
    agent = await _create_agent(client, name="Stats Agent")
    assert agent["total_executions"] == 0

    await client.post(
        f"/api/agents/{agent['id']}/invoke",
        json={"message": "Count me"},
    )

    resp = await client.get(f"/api/agents/{agent['id']}")
    assert resp.json()["total_executions"] == 1


# ---------------------------------------------------------------------------
# GET /api/agents/{id}/executions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_executions(client: AsyncClient):
    """List executions returns paginated results."""
    agent = await _create_agent(client, name="Exec Agent")
    await client.post(f"/api/agents/{agent['id']}/invoke", json={"message": "Run 1"})
    await client.post(f"/api/agents/{agent['id']}/invoke", json={"message": "Run 2"})

    resp = await client.get(f"/api/agents/{agent['id']}/executions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


# ---------------------------------------------------------------------------
# GET /api/agents/executions/{execution_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_execution_by_id(client: AsyncClient):
    """Get a single execution by ID."""
    agent = await _create_agent(client, name="Single Exec Agent")
    invoke_resp = await client.post(
        f"/api/agents/{agent['id']}/invoke",
        json={"message": "Fetch this execution"},
    )
    exec_id = invoke_resp.json()["id"]

    resp = await client.get(f"/api/agents/executions/{exec_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == exec_id


@pytest.mark.asyncio
async def test_get_nonexistent_execution_returns_404(client: AsyncClient):
    """Non-existent execution returns 404."""
    resp = await client.get("/api/agents/executions/fake-exec-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/agents/seed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_seed_creates_prebuilt_agents(client: AsyncClient):
    """Seed creates the 4 prebuilt agents."""
    resp = await client.post("/api/agents/seed")
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == 4
    names = {a["name"] for a in agents}
    assert "@crm-agent" in names
    assert "@meeting-agent" in names
    assert "@github-agent" in names
    assert "@scheduler-agent" in names


@pytest.mark.asyncio
async def test_seed_is_idempotent(client: AsyncClient):
    """Seed is idempotent — running twice returns the same agents."""
    resp1 = await client.post("/api/agents/seed")
    resp2 = await client.post("/api/agents/seed")
    assert len(resp1.json()) == 4
    assert len(resp2.json()) == 4
    # IDs should match
    ids1 = {a["id"] for a in resp1.json()}
    ids2 = {a["id"] for a in resp2.json()}
    assert ids1 == ids2
