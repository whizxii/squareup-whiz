"""Tests for TaskRepository, TaskCommentRepository, and TaskActivityRepository."""

from __future__ import annotations

import pytest
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tasks import Task
from app.models.task_comments import TaskComment
from app.models.task_activity import TaskActivity
from app.repositories.task_repository import (
    TaskRepository,
    TaskCommentRepository,
    TaskActivityRepository,
)
from tests.conftest import TEST_USER_ID

OTHER_USER = "other-user-repo-test"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _make_task(
    session: AsyncSession,
    *,
    title: str = "Repo Test Task",
    created_by: str = TEST_USER_ID,
    assigned_to: str = TEST_USER_ID,
    status: str = "todo",
    priority: str = "medium",
    parent_id: str | None = None,
    is_deleted: bool = False,
    due_date: datetime | None = None,
    position: int = 0,
) -> Task:
    repo = TaskRepository(session)
    now = datetime.utcnow()
    task = Task(
        title=title,
        created_by=created_by,
        assigned_to=assigned_to,
        created_by_type="user",
        status=status,
        priority=priority,
        tags="[]",
        parent_id=parent_id,
        is_deleted=is_deleted,
        due_date=due_date,
        position=position,
        created_at=now,
        updated_at=now,
    )
    return await repo.create(task)


# ---------------------------------------------------------------------------
# TaskRepository — find_user_tasks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_find_user_tasks_basic(session: AsyncSession):
    """find_user_tasks returns tasks where user is creator or assignee."""
    await _make_task(session, title="Created by me")
    await _make_task(session, title="Other's task", created_by=OTHER_USER, assigned_to=OTHER_USER)

    repo = TaskRepository(session)
    result = await repo.find_user_tasks(TEST_USER_ID)
    titles = [t.title for t in result.items]
    assert "Created by me" in titles
    assert "Other's task" not in titles


@pytest.mark.asyncio
async def test_find_user_tasks_status_filter(session: AsyncSession):
    """find_user_tasks respects status filter."""
    await _make_task(session, title="Todo", status="todo")
    await _make_task(session, title="Done", status="done")

    repo = TaskRepository(session)
    result = await repo.find_user_tasks(TEST_USER_ID, status="done")
    titles = [t.title for t in result.items]
    assert "Done" in titles
    assert "Todo" not in titles


@pytest.mark.asyncio
async def test_find_user_tasks_priority_filter(session: AsyncSession):
    """find_user_tasks respects priority filter."""
    await _make_task(session, title="High", priority="high")
    await _make_task(session, title="Low", priority="low")

    repo = TaskRepository(session)
    result = await repo.find_user_tasks(TEST_USER_ID, priority="high")
    titles = [t.title for t in result.items]
    assert "High" in titles
    assert "Low" not in titles


@pytest.mark.asyncio
async def test_find_user_tasks_excludes_deleted(session: AsyncSession):
    """find_user_tasks excludes soft-deleted tasks."""
    await _make_task(session, title="Active")
    await _make_task(session, title="Deleted", is_deleted=True)

    repo = TaskRepository(session)
    result = await repo.find_user_tasks(TEST_USER_ID)
    titles = [t.title for t in result.items]
    assert "Active" in titles
    assert "Deleted" not in titles


# ---------------------------------------------------------------------------
# TaskRepository — find_subtasks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_find_subtasks(session: AsyncSession):
    """find_subtasks returns non-deleted children of a parent task."""
    parent = await _make_task(session, title="Parent")
    await _make_task(session, title="Child 1", parent_id=parent.id, position=1)
    await _make_task(session, title="Child 2", parent_id=parent.id, position=0)
    await _make_task(session, title="Deleted Child", parent_id=parent.id, is_deleted=True)

    repo = TaskRepository(session)
    subtasks = await repo.find_subtasks(parent.id)
    titles = [t.title for t in subtasks]

    assert len(subtasks) == 2
    assert "Child 2" == titles[0]  # position=0 comes first
    assert "Child 1" == titles[1]
    assert "Deleted Child" not in titles


# ---------------------------------------------------------------------------
# TaskRepository — find_overdue
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_find_overdue(session: AsyncSession):
    """find_overdue returns non-completed tasks past their due date."""
    yesterday = datetime.utcnow() - timedelta(days=1)
    tomorrow = datetime.utcnow() + timedelta(days=1)

    await _make_task(session, title="Overdue", due_date=yesterday, status="todo")
    await _make_task(session, title="Not overdue", due_date=tomorrow, status="todo")
    await _make_task(session, title="Done overdue", due_date=yesterday, status="done")

    repo = TaskRepository(session)
    overdue = await repo.find_overdue(TEST_USER_ID)
    titles = [t.title for t in overdue]

    assert "Overdue" in titles
    assert "Not overdue" not in titles
    assert "Done overdue" not in titles


# ---------------------------------------------------------------------------
# TaskRepository — reorder
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reorder(session: AsyncSession):
    """reorder changes position and status."""
    task = await _make_task(session, title="Reorder Me", position=0, status="todo")

    repo = TaskRepository(session)
    updated = await repo.reorder(task.id, 5, "in_progress")

    assert updated is not None
    assert updated.position == 5
    assert updated.status == "in_progress"


# ---------------------------------------------------------------------------
# TaskRepository — soft_delete
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_soft_delete(session: AsyncSession):
    """soft_delete marks task as deleted."""
    task = await _make_task(session, title="Delete Me")

    repo = TaskRepository(session)
    deleted = await repo.soft_delete(task.id)

    assert deleted is not None
    assert deleted.is_deleted is True
    assert deleted.deleted_at is not None


# ---------------------------------------------------------------------------
# TaskRepository — search
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search(session: AsyncSession):
    """search finds tasks by title/description pattern."""
    await _make_task(session, title="Deploy to production")
    await _make_task(session, title="Unrelated task")

    repo = TaskRepository(session)
    results = await repo.search(TEST_USER_ID, "deploy")
    titles = [t.title for t in results]

    assert "Deploy to production" in titles
    assert "Unrelated task" not in titles


# ---------------------------------------------------------------------------
# TaskRepository — count_by_status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_count_by_status(session: AsyncSession):
    """count_by_status returns correct counts grouped by status."""
    await _make_task(session, title="T1", status="todo")
    await _make_task(session, title="T2", status="todo")
    await _make_task(session, title="T3", status="done")
    await _make_task(session, title="T4", status="done", is_deleted=True)

    repo = TaskRepository(session)
    counts = await repo.count_by_status(TEST_USER_ID)

    assert counts.get("todo") == 2
    assert counts.get("done") == 1  # deleted one excluded


# ---------------------------------------------------------------------------
# TaskCommentRepository
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_comment_find_by_task(session: AsyncSession):
    """find_by_task returns non-deleted comments for a task."""
    task = await _make_task(session, title="Commented Task")

    comment_repo = TaskCommentRepository(session)
    now = datetime.utcnow()
    c1 = TaskComment(task_id=task.id, user_id=TEST_USER_ID, content="Hello", created_at=now, updated_at=now)
    c2 = TaskComment(task_id=task.id, user_id=TEST_USER_ID, content="Deleted", is_deleted=True, created_at=now, updated_at=now)
    await comment_repo.create(c1)
    await comment_repo.create(c2)

    result = await comment_repo.find_by_task(task.id)
    contents = [c.content for c in result.items]

    assert "Hello" in contents
    assert "Deleted" not in contents


# ---------------------------------------------------------------------------
# TaskActivityRepository
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_activity_find_by_task(session: AsyncSession):
    """find_by_task returns activity entries for a task."""
    task = await _make_task(session, title="Activity Task")

    activity_repo = TaskActivityRepository(session)
    now = datetime.utcnow()
    a1 = TaskActivity(task_id=task.id, user_id=TEST_USER_ID, action="created", created_at=now)
    a2 = TaskActivity(task_id=task.id, user_id=TEST_USER_ID, action="updated", field_changed="status", created_at=now)
    await activity_repo.create(a1)
    await activity_repo.create(a2)

    result = await activity_repo.find_by_task(task.id)
    actions = [a.action for a in result.items]

    assert "created" in actions
    assert "updated" in actions
    assert len(result.items) == 2
