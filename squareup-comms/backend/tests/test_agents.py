"""Tests for /api/agents endpoints.

Covers: CRUD, authorization, invoke (mocked engine), confirmation flow,
execution listing, seed idempotency.
"""

import json
from typing import Optional
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agents import Agent, AgentExecution
from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_agent(
    client: AsyncClient,
    name: str = "Test Agent",
    **kwargs,
) -> dict:
    """Create an agent via API and return the response JSON."""
    payload = {
        "name": name,
        "system_prompt": "You are a test agent.",
        "tools": ["tool_a"],
        **kwargs,
    }
    resp = await client.post("/api/agents/", json=payload)
    assert resp.status_code == 201
    return resp.json()


def _mock_invoke_result(**overrides):
    """Build a mock InvokeResult for testing invoke/confirm endpoints."""
    from app.services.agent_engine import InvokeResult

    defaults = {
        "response_text": "Mock response",
        "tool_calls_log": [],
        "input_tokens": 10,
        "output_tokens": 20,
        "total_cost_usd": 0.001,
        "duration_ms": 500,
        "status": "success",
        "error_message": None,
        "execution_id": None,
        "pending_confirmation": None,
    }
    defaults.update(overrides)
    return InvokeResult(**defaults)


async def _insert_agent_via_db(
    session: AsyncSession,
    name: str = "DB Agent",
    created_by: Optional[str] = None,
    **kwargs,
) -> Agent:
    """Insert an agent directly into the DB (bypassing API auth)."""
    agent = Agent(
        name=name,
        system_prompt=kwargs.pop("system_prompt", "System prompt."),
        created_by=created_by,
        **kwargs,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


# ---------------------------------------------------------------------------
# POST /api/agents/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_agent(client: AsyncClient):
    """Creating an agent returns 201 with correct fields."""
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

    await client.delete(f"/api/agents/{deactivated['id']}")

    resp = await client.get("/api/agents/")
    assert resp.status_code == 200
    ids = [a["id"] for a in resp.json()]
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
    """Updating agent fields by the owner."""
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
# POST /api/agents/{id}/invoke  (mocked engine)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invoke_agent(client: AsyncClient):
    """Invoking an agent returns a success response."""
    agent = await _create_agent(client, name="Invoke Agent")

    mock_result = _mock_invoke_result(
        response_text="I processed your message: Hello agent",
    )
    with patch(
        "app.api.agents.invoke_agent_sync",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        resp = await client.post(
            f"/api/agents/{agent['id']}/invoke",
            json={"message": "Hello agent"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "Hello agent" in data["response_text"]


@pytest.mark.asyncio
async def test_invoke_returns_tool_info(client: AsyncClient):
    """Invoke response includes tool call information."""
    agent = await _create_agent(client, name="Tool Agent")

    mock_result = _mock_invoke_result(
        response_text="Found 5 contacts",
        tool_calls_log=[
            {"name": "crm_search_contacts", "input": {"query": "test"}, "success": True},
        ],
    )
    with patch(
        "app.api.agents.invoke_agent_sync",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        resp = await client.post(
            f"/api/agents/{agent['id']}/invoke",
            json={"message": "Search contacts"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["num_tool_calls"] == 1
    tools = json.loads(data["tools_called"])
    assert tools[0]["name"] == "crm_search_contacts"


@pytest.mark.asyncio
async def test_invoke_awaiting_confirmation(client: AsyncClient):
    """Invoke returns pending_confirmation when a tool requires approval."""
    agent = await _create_agent(client, name="Confirm Agent")

    mock_result = _mock_invoke_result(
        response_text="I'd like to create a contact, but it requires your approval first.",
        status="awaiting_confirmation",
        execution_id="exec-123",
        pending_confirmation={
            "tool_name": "crm_create_contact",
            "tool_display_name": "Create Contact",
            "tool_input": {"name": "Sarah", "email": "sarah@example.com"},
            "tool_use_id": "tu-456",
        },
    )
    with patch(
        "app.api.agents.invoke_agent_sync",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        resp = await client.post(
            f"/api/agents/{agent['id']}/invoke",
            json={"message": "Add Sarah to CRM"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "awaiting_confirmation"
    assert data["execution_id"] == "exec-123"
    assert data["pending_confirmation"]["tool_name"] == "crm_create_contact"
    assert data["pending_confirmation"]["tool_input"]["name"] == "Sarah"


# ---------------------------------------------------------------------------
# POST /api/agents/{id}/executions/{execution_id}/confirm
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_confirm_approve(client: AsyncClient, session: AsyncSession):
    """Approving a confirmation-required tool resumes execution."""
    agent = await _create_agent(client, name="Confirm Approve")
    agent_id = agent["id"]

    execution = AgentExecution(
        id="exec-confirm-1",
        agent_id=agent_id,
        conversation_messages=json.dumps({"messages": [], "tool_use_blocks": []}),
        tools_called="[]",
        status="awaiting_confirmation",
        num_tool_calls=0,
    )
    session.add(execution)
    await session.commit()

    mock_result = _mock_invoke_result(
        response_text="Done! Created contact Sarah.",
        execution_id="exec-confirm-1",
    )
    with patch(
        "app.api.agents.resume_after_confirmation",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        resp = await client.post(
            f"/api/agents/{agent_id}/executions/exec-confirm-1/confirm",
            json={"approved": True},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "Created contact" in data["response_text"]


@pytest.mark.asyncio
async def test_confirm_reject(client: AsyncClient, session: AsyncSession):
    """Rejecting a tool execution returns rejection result."""
    agent = await _create_agent(client, name="Confirm Reject")
    agent_id = agent["id"]

    execution = AgentExecution(
        id="exec-confirm-2",
        agent_id=agent_id,
        conversation_messages=json.dumps({"messages": []}),
        tools_called="[]",
        status="awaiting_confirmation",
        num_tool_calls=0,
    )
    session.add(execution)
    await session.commit()

    mock_result = _mock_invoke_result(
        response_text="Understood, I won't create that contact.",
    )
    with patch(
        "app.api.agents.resume_after_confirmation",
        new_callable=AsyncMock,
        return_value=mock_result,
    ):
        resp = await client.post(
            f"/api/agents/{agent_id}/executions/exec-confirm-2/confirm",
            json={"approved": False},
        )

    assert resp.status_code == 200
    assert "won't create" in resp.json()["response_text"]


@pytest.mark.asyncio
async def test_confirm_with_edited_input(client: AsyncClient, session: AsyncSession):
    """Approving with edited_input passes through to resume function."""
    agent = await _create_agent(client, name="Confirm Edit")
    agent_id = agent["id"]

    execution = AgentExecution(
        id="exec-confirm-edit",
        agent_id=agent_id,
        conversation_messages=json.dumps({"messages": []}),
        tools_called="[]",
        status="awaiting_confirmation",
        num_tool_calls=0,
    )
    session.add(execution)
    await session.commit()

    mock_result = _mock_invoke_result(response_text="Created with edited email.")
    mock_fn = AsyncMock(return_value=mock_result)
    with patch("app.api.agents.resume_after_confirmation", mock_fn):
        resp = await client.post(
            f"/api/agents/{agent_id}/executions/exec-confirm-edit/confirm",
            json={
                "approved": True,
                "edited_input": {"name": "Sarah", "email": "new@example.com"},
            },
        )

    assert resp.status_code == 200
    # Verify the edited_input was forwarded
    call_kwargs = mock_fn.call_args.kwargs
    assert call_kwargs["edited_input"] == {"name": "Sarah", "email": "new@example.com"}
    assert call_kwargs["approved"] is True


@pytest.mark.asyncio
async def test_confirm_wrong_status_returns_409(
    client: AsyncClient, session: AsyncSession,
):
    """Confirming an execution not awaiting confirmation returns 409."""
    agent = await _create_agent(client, name="Already Done")
    agent_id = agent["id"]

    execution = AgentExecution(
        id="exec-done-1",
        agent_id=agent_id,
        status="success",
        num_tool_calls=0,
    )
    session.add(execution)
    await session.commit()

    resp = await client.post(
        f"/api/agents/{agent_id}/executions/exec-done-1/confirm",
        json={"approved": True},
    )
    assert resp.status_code == 409
    assert "not awaiting confirmation" in resp.json()["error"]


@pytest.mark.asyncio
async def test_confirm_nonexistent_execution_returns_404(client: AsyncClient):
    """Confirming a non-existent execution returns 404."""
    agent = await _create_agent(client, name="No Exec")
    resp = await client.post(
        f"/api/agents/{agent['id']}/executions/fake-exec-id/confirm",
        json={"approved": True},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_confirm_wrong_agent_returns_404(
    client: AsyncClient, session: AsyncSession,
):
    """Confirming with the wrong agent_id returns 404."""
    agent_a = await _create_agent(client, name="Agent A")
    agent_b = await _create_agent(client, name="Agent B")

    execution = AgentExecution(
        id="exec-wrong-agent",
        agent_id=agent_a["id"],
        status="awaiting_confirmation",
        num_tool_calls=0,
    )
    session.add(execution)
    await session.commit()

    resp = await client.post(
        f"/api/agents/{agent_b['id']}/executions/exec-wrong-agent/confirm",
        json={"approved": True},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/agents/{id}/executions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_executions(client: AsyncClient, session: AsyncSession):
    """List executions returns paginated results."""
    agent = await _create_agent(client, name="Exec Agent")
    agent_id = agent["id"]

    for i in range(3):
        session.add(AgentExecution(
            id=f"exec-list-{i}",
            agent_id=agent_id,
            response_text=f"Response {i}",
            status="success",
            num_tool_calls=0,
        ))
    await session.commit()

    resp = await client.get(f"/api/agents/{agent_id}/executions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3


@pytest.mark.asyncio
async def test_list_executions_pagination(
    client: AsyncClient, session: AsyncSession,
):
    """Pagination limit and offset are respected."""
    agent = await _create_agent(client, name="Paginate Agent")
    agent_id = agent["id"]

    for i in range(5):
        session.add(AgentExecution(
            id=f"exec-page-{i}",
            agent_id=agent_id,
            response_text=f"Response {i}",
            status="success",
            num_tool_calls=0,
        ))
    await session.commit()

    resp = await client.get(
        f"/api/agents/{agent_id}/executions?offset=1&limit=2",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
    assert data["offset"] == 1
    assert data["limit"] == 2


# ---------------------------------------------------------------------------
# GET /api/agents/executions/{execution_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_execution_by_id(client: AsyncClient, session: AsyncSession):
    """Get a single execution by ID."""
    agent = await _create_agent(client, name="Single Exec")

    session.add(AgentExecution(
        id="exec-single-1",
        agent_id=agent["id"],
        response_text="Test execution",
        status="success",
        num_tool_calls=1,
    ))
    await session.commit()

    resp = await client.get("/api/agents/executions/exec-single-1")
    assert resp.status_code == 200
    assert resp.json()["id"] == "exec-single-1"
    assert resp.json()["status"] == "success"


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
    """Seed creates the 5 prebuilt agents."""
    resp = await client.post("/api/agents/seed")
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == 5
    names = {a["name"] for a in agents}
    assert "@donna" in names
    assert "@crm-agent" in names
    assert "@meeting-agent" in names
    assert "@research-agent" in names
    assert "@scheduler-agent" in names


@pytest.mark.asyncio
async def test_seed_is_idempotent(client: AsyncClient):
    """Seed is idempotent — running twice returns the same agents."""
    resp1 = await client.post("/api/agents/seed")
    resp2 = await client.post("/api/agents/seed")
    assert len(resp1.json()) == 5
    assert len(resp2.json()) == 5
    ids1 = {a["id"] for a in resp1.json()}
    ids2 = {a["id"] for a in resp2.json()}
    assert ids1 == ids2


# ---------------------------------------------------------------------------
# Authorization — system agents
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_system_agent_cannot_be_deactivated(
    client: AsyncClient, session: AsyncSession,
):
    """System agents (created_by=None) cannot be deactivated."""
    agent = await _insert_agent_via_db(session, name="System Bot", created_by=None)

    resp = await client.delete(f"/api/agents/{agent.id}")
    assert resp.status_code == 403
    assert "System agents cannot be deactivated" in resp.json()["error"]


@pytest.mark.asyncio
async def test_system_agent_tag_cannot_be_deactivated(
    client: AsyncClient, session: AsyncSession,
):
    """System agents (created_by='system') cannot be deactivated."""
    agent = await _insert_agent_via_db(
        session, name="System Bot 2", created_by="system",
    )

    resp = await client.delete(f"/api/agents/{agent.id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_system_agent_can_be_updated_by_any_user(
    client: AsyncClient, session: AsyncSession,
):
    """System agents are shared — any team member can update them."""
    agent = await _insert_agent_via_db(
        session, name="Shared Bot", created_by=None,
    )

    resp = await client.put(
        f"/api/agents/{agent.id}",
        json={"description": "Updated by team member"},
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated by team member"


@pytest.mark.asyncio
async def test_system_agent_status_can_be_updated_by_any_user(
    client: AsyncClient, session: AsyncSession,
):
    """System agents allow any user to update status."""
    agent = await _insert_agent_via_db(
        session, name="Status Shared", created_by="system",
    )

    resp = await client.put(
        f"/api/agents/{agent.id}/status",
        json={"status": "working", "current_task": "Team task"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "working"


# ---------------------------------------------------------------------------
# Authorization — non-owner blocked
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_non_owner_cannot_update_user_agent(
    client: AsyncClient, session: AsyncSession,
):
    """A user cannot update another user's agent."""
    agent = await _insert_agent_via_db(
        session, name="Other User Agent", created_by="other-user-999",
    )

    resp = await client.put(
        f"/api/agents/{agent.id}",
        json={"name": "Hijacked!"},
    )
    assert resp.status_code == 403
    assert "Only the agent's creator" in resp.json()["error"]


@pytest.mark.asyncio
async def test_non_owner_cannot_deactivate_user_agent(
    client: AsyncClient, session: AsyncSession,
):
    """A user cannot deactivate another user's agent."""
    agent = await _insert_agent_via_db(
        session, name="Protected Agent", created_by="other-user-999",
    )

    resp = await client.delete(f"/api/agents/{agent.id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_owner_cannot_update_status_user_agent(
    client: AsyncClient, session: AsyncSession,
):
    """A user cannot update the status of another user's agent."""
    agent = await _insert_agent_via_db(
        session, name="Status Protected", created_by="other-user-999",
    )

    resp = await client.put(
        f"/api/agents/{agent.id}/status",
        json={"status": "working"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Authorization — owner allowed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_owner_can_update_own_agent(client: AsyncClient):
    """An agent's creator can update it."""
    agent = await _create_agent(client, name="My Agent")
    resp = await client.put(
        f"/api/agents/{agent['id']}",
        json={"name": "My Updated Agent"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "My Updated Agent"


@pytest.mark.asyncio
async def test_owner_can_deactivate_own_agent(client: AsyncClient):
    """An agent's creator can deactivate it."""
    agent = await _create_agent(client, name="Deletable")
    resp = await client.delete(f"/api/agents/{agent['id']}")
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Agent deactivated"


@pytest.mark.asyncio
async def test_owner_can_update_own_agent_status(client: AsyncClient):
    """An agent's creator can update its status."""
    agent = await _create_agent(client, name="My Status Agent")
    resp = await client.put(
        f"/api/agents/{agent['id']}/status",
        json={"status": "idle"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "idle"
