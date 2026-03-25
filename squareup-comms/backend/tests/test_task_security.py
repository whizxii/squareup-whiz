"""Security tests for the Tasks API — authorization, scoping, and input validation."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tasks import Task
from tests.conftest import TEST_USER_ID

OTHER_USER_ID = "other-user-999"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unwrap(resp_json: dict) -> dict:
    """Unwrap the success_response envelope → return data."""
    assert resp_json["success"] is True
    return resp_json["data"]


async def _create_task_via_api(
    client: AsyncClient,
    title: str = "Test Task",
    **kwargs,
) -> dict:
    """Create a task via API and return the unwrapped data."""
    payload = {"title": title, **kwargs}
    resp = await client.post("/api/tasks/", json=payload)
    assert resp.status_code == 201, resp.text
    return _unwrap(resp.json())


async def _insert_other_user_task(
    session: AsyncSession,
    *,
    task_id: str = "other-task-001",
    title: str = "Other User Task",
    created_by: str = OTHER_USER_ID,
    assigned_to: str = OTHER_USER_ID,
) -> Task:
    """Insert a task owned by another user directly into the DB."""
    from datetime import datetime

    task = Task(
        id=task_id,
        title=title,
        created_by=created_by,
        assigned_to=assigned_to,
        created_by_type="user",
        status="todo",
        priority="medium",
        tags="[]",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(task)
    await session.commit()
    return task


# ---------------------------------------------------------------------------
# GET /api/tasks/{task_id} — Authorization
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_task_unauthorized(client: AsyncClient, session: AsyncSession):
    """User cannot GET a task they didn't create and aren't assigned to."""
    await _insert_other_user_task(session)
    resp = await client.get("/api/tasks/other-task-001")
    assert resp.status_code == 403
    assert resp.json()["success"] is False


@pytest.mark.asyncio
async def test_get_task_as_creator(client: AsyncClient):
    """Creator can GET their own task."""
    task = await _create_task_via_api(client, title="My Task")
    resp = await client.get(f"/api/tasks/{task['id']}")
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    assert data["title"] == "My Task"


@pytest.mark.asyncio
async def test_get_task_as_assignee(client: AsyncClient, session: AsyncSession):
    """Assignee can GET a task assigned to them by another user."""
    await _insert_other_user_task(
        session,
        task_id="assigned-to-me",
        created_by=OTHER_USER_ID,
        assigned_to=TEST_USER_ID,
    )
    resp = await client.get("/api/tasks/assigned-to-me")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_nonexistent_task_returns_404(client: AsyncClient):
    """GET for a non-existent task returns 404."""
    resp = await client.get("/api/tasks/does-not-exist")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/tasks/ — Scoping
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_tasks_scoped_to_user(client: AsyncClient, session: AsyncSession):
    """List only returns tasks where user is creator or assignee."""
    # Create a task as TEST_USER (via API)
    my_task = await _create_task_via_api(client, title="My Task")

    # Insert a task by another user (not assigned to us)
    await _insert_other_user_task(session)

    resp = await client.get("/api/tasks/")
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    task_ids = {t["id"] for t in data}
    assert my_task["id"] in task_ids
    assert "other-task-001" not in task_ids


@pytest.mark.asyncio
async def test_list_tasks_includes_assigned(client: AsyncClient, session: AsyncSession):
    """List includes tasks assigned to the user by someone else."""
    await _insert_other_user_task(
        session,
        task_id="assigned-task",
        created_by=OTHER_USER_ID,
        assigned_to=TEST_USER_ID,
    )
    resp = await client.get("/api/tasks/")
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    task_ids = {t["id"] for t in data}
    assert "assigned-task" in task_ids


@pytest.mark.asyncio
async def test_list_tasks_status_filter(client: AsyncClient):
    """Status filter works correctly."""
    await _create_task_via_api(client, title="Todo Task")
    resp = await client.get("/api/tasks/?status=in_progress")
    assert resp.status_code == 200
    data = _unwrap(resp.json())
    # All returned tasks should have in_progress status (none, since we created a todo)
    assert all(t["status"] == "in_progress" for t in data)


# ---------------------------------------------------------------------------
# PATCH /api/tasks/{task_id} — Authorization
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_task_unauthorized(client: AsyncClient, session: AsyncSession):
    """User cannot update a task they don't own or aren't assigned to."""
    await _insert_other_user_task(session)
    resp = await client.patch(
        "/api/tasks/other-task-001",
        json={"title": "Hacked Title"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_task_as_assignee(client: AsyncClient, session: AsyncSession):
    """Assignee can update a task assigned to them."""
    await _insert_other_user_task(
        session,
        task_id="can-update",
        created_by=OTHER_USER_ID,
        assigned_to=TEST_USER_ID,
    )
    resp = await client.patch(
        "/api/tasks/can-update",
        json={"status": "in_progress"},
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# DELETE /api/tasks/{task_id} — Authorization
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_task_unauthorized(client: AsyncClient, session: AsyncSession):
    """User cannot delete a task they don't own or aren't assigned to."""
    await _insert_other_user_task(session)
    resp = await client.delete("/api/tasks/other-task-001")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Input Validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_empty_title_rejected(client: AsyncClient):
    """Creating a task with empty title is rejected."""
    resp = await client.post("/api/tasks/", json={"title": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_blank_title_rejected(client: AsyncClient):
    """Creating a task with whitespace-only title is rejected."""
    resp = await client.post("/api/tasks/", json={"title": "   "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_priority_rejected(client: AsyncClient):
    """Creating a task with invalid priority is rejected."""
    resp = await client.post(
        "/api/tasks/",
        json={"title": "Valid Title", "priority": "critical"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_status_rejected(client: AsyncClient):
    """Updating a task with invalid status is rejected."""
    task = await _create_task_via_api(client, title="My Task")
    resp = await client.patch(
        f"/api/tasks/{task['id']}",
        json={"status": "cancelled"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_title_whitespace_stripped(client: AsyncClient):
    """Title leading/trailing whitespace is stripped."""
    task = await _create_task_via_api(client, title="  Trimmed Title  ")
    assert task["title"] == "Trimmed Title"
