"""Tests for TaskService — business logic, activity logging, and notifications."""

from __future__ import annotations

import json
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.background import BackgroundTaskManager
from app.core.events import EventBus
from app.core.responses import ApiError
from app.models.tasks import Task
from app.services.task_service import TaskService
from tests.conftest import TEST_USER_ID

OTHER_USER = "other-user-svc-test"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def event_bus() -> EventBus:
    return EventBus()


@pytest.fixture
def background() -> BackgroundTaskManager:
    return BackgroundTaskManager()


@pytest.fixture
def svc(session: AsyncSession, event_bus: EventBus, background: BackgroundTaskManager) -> TaskService:
    return TaskService(session, event_bus, background)


async def _create_task(svc: TaskService, user_id: str = TEST_USER_ID, **kwargs) -> Task:
    data = {"title": "Service Test Task", "priority": "medium", **kwargs}
    return await svc.create_task(user_id, data)


# ---------------------------------------------------------------------------
# create_task
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_task_basic(svc: TaskService):
    """create_task creates a task and returns it."""
    task = await _create_task(svc, title="New Task")
    assert task.id is not None
    assert task.title == "New Task"
    assert task.status == "todo"
    assert task.created_by == TEST_USER_ID
    assert task.assigned_to == TEST_USER_ID


@pytest.mark.asyncio
async def test_create_task_logs_activity(svc: TaskService):
    """create_task writes a 'created' activity log entry."""
    task = await _create_task(svc)
    result = await svc.get_activity(task.id, TEST_USER_ID)
    actions = [a.action for a in result.items]
    assert "created" in actions


@pytest.mark.asyncio
async def test_create_task_emits_event(svc: TaskService, event_bus: EventBus):
    """create_task emits a task.created event."""
    events_received: list[dict] = []
    event_bus.on("task.created", lambda payload: events_received.append(payload))

    await _create_task(svc)
    assert len(events_received) == 1
    assert "task_id" in events_received[0]


@pytest.mark.asyncio
@patch("app.services.task_service.smart_notifications")
async def test_create_task_notifies_assignee(mock_notif, svc: TaskService):
    """create_task sends notification when assigning to another user."""
    mock_notif.deliver = AsyncMock(return_value=True)

    await _create_task(svc, assigned_to=OTHER_USER)
    mock_notif.deliver.assert_called()
    call_args = mock_notif.deliver.call_args[0][0]
    assert call_args.user_id == OTHER_USER
    assert call_args.type == "task_assigned"


@pytest.mark.asyncio
@patch("app.services.task_service.smart_notifications")
async def test_create_task_no_notification_self_assign(mock_notif, svc: TaskService):
    """create_task does NOT notify when self-assigning."""
    mock_notif.deliver = AsyncMock(return_value=True)

    await _create_task(svc)  # defaults to self-assign
    mock_notif.deliver.assert_not_called()


# ---------------------------------------------------------------------------
# update_task
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_task_basic(svc: TaskService):
    """update_task applies changes and returns updated task."""
    task = await _create_task(svc, title="Original")
    updated = await svc.update_task(task.id, TEST_USER_ID, {"title": "Updated"})
    assert updated.title == "Updated"


@pytest.mark.asyncio
async def test_update_task_logs_field_changes(svc: TaskService):
    """update_task logs activity for each changed field."""
    task = await _create_task(svc)
    await svc.update_task(task.id, TEST_USER_ID, {"status": "in_progress", "priority": "high"})

    result = await svc.get_activity(task.id, TEST_USER_ID)
    update_entries = [a for a in result.items if a.action == "updated"]
    changed_fields = {a.field_changed for a in update_entries}
    assert "status" in changed_fields
    assert "priority" in changed_fields


@pytest.mark.asyncio
async def test_complete_task_sets_completed_at(svc: TaskService):
    """Setting status to 'done' auto-sets completed_at."""
    task = await _create_task(svc)
    updated = await svc.update_task(task.id, TEST_USER_ID, {"status": "done"})
    assert updated.completed_at is not None


@pytest.mark.asyncio
async def test_reopen_task_clears_completed_at(svc: TaskService):
    """Changing status from 'done' to something else clears completed_at."""
    task = await _create_task(svc)
    await svc.update_task(task.id, TEST_USER_ID, {"status": "done"})
    reopened = await svc.update_task(task.id, TEST_USER_ID, {"status": "in_progress"})
    assert reopened.completed_at is None


@pytest.mark.asyncio
async def test_complete_task_emits_event(svc: TaskService, event_bus: EventBus):
    """Completing a task emits task.completed event."""
    events_received: list[dict] = []
    event_bus.on("task.completed", lambda payload: events_received.append(payload))

    task = await _create_task(svc)
    await svc.update_task(task.id, TEST_USER_ID, {"status": "done"})
    assert len(events_received) == 1


@pytest.mark.asyncio
async def test_update_task_unauthorized(svc: TaskService, session: AsyncSession):
    """update_task raises 403 for unauthorized user."""
    task = await _create_task(svc, assigned_to=OTHER_USER)

    other_svc = TaskService(session, EventBus(), BackgroundTaskManager())
    with pytest.raises(ApiError) as exc_info:
        await other_svc.update_task(task.id, "rando-user-xyz", {"title": "Hacked"})
    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# delete_task (soft)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_soft_delete(svc: TaskService):
    """delete_task soft-deletes the task."""
    task = await _create_task(svc)
    deleted = await svc.delete_task(task.id, TEST_USER_ID)
    assert deleted.is_deleted is True
    assert deleted.deleted_at is not None


@pytest.mark.asyncio
async def test_deleted_task_not_accessible(svc: TaskService):
    """Soft-deleted task raises 404 on get."""
    task = await _create_task(svc)
    await svc.delete_task(task.id, TEST_USER_ID)

    with pytest.raises(ApiError) as exc_info:
        await svc.get_task(task.id, TEST_USER_ID)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Subtasks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_subtask(svc: TaskService):
    """create_subtask sets parent_id correctly."""
    parent = await _create_task(svc, title="Parent")
    child = await svc.create_subtask(parent.id, TEST_USER_ID, {"title": "Child"})
    assert child.parent_id == parent.id


@pytest.mark.asyncio
async def test_get_subtasks(svc: TaskService):
    """get_subtasks returns children of a parent."""
    parent = await _create_task(svc, title="Parent")
    await svc.create_subtask(parent.id, TEST_USER_ID, {"title": "Child 1"})
    await svc.create_subtask(parent.id, TEST_USER_ID, {"title": "Child 2"})

    subtasks = await svc.get_subtasks(parent.id, TEST_USER_ID)
    assert len(subtasks) == 2


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_comment(svc: TaskService):
    """add_comment creates a comment and logs activity."""
    task = await _create_task(svc)
    comment = await svc.add_comment(task.id, TEST_USER_ID, "Nice work!")
    assert comment.content == "Nice work!"
    assert comment.task_id == task.id

    # Check activity log
    result = await svc.get_activity(task.id, TEST_USER_ID)
    actions = [a.action for a in result.items]
    assert "commented" in actions


@pytest.mark.asyncio
async def test_get_comments(svc: TaskService):
    """get_comments returns paginated comments."""
    task = await _create_task(svc)
    await svc.add_comment(task.id, TEST_USER_ID, "Comment 1")
    await svc.add_comment(task.id, TEST_USER_ID, "Comment 2")

    result = await svc.get_comments(task.id, TEST_USER_ID)
    assert len(result.items) == 2


@pytest.mark.asyncio
async def test_update_comment_by_author(svc: TaskService):
    """Author can edit their own comment."""
    task = await _create_task(svc)
    comment = await svc.add_comment(task.id, TEST_USER_ID, "Original")
    updated = await svc.update_comment(task.id, comment.id, TEST_USER_ID, "Edited")
    assert updated.content == "Edited"


@pytest.mark.asyncio
async def test_update_comment_unauthorized(svc: TaskService, session: AsyncSession):
    """Non-author cannot edit a comment."""
    # Create task assigned to both users
    task = await _create_task(svc, assigned_to=OTHER_USER)
    comment = await svc.add_comment(task.id, TEST_USER_ID, "My comment")

    other_svc = TaskService(session, EventBus(), BackgroundTaskManager())
    with pytest.raises(ApiError) as exc_info:
        await other_svc.update_comment(task.id, comment.id, OTHER_USER, "Hacked")
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_delete_comment(svc: TaskService):
    """Author can soft-delete their comment."""
    task = await _create_task(svc)
    comment = await svc.add_comment(task.id, TEST_USER_ID, "Delete me")
    deleted = await svc.delete_comment(task.id, comment.id, TEST_USER_ID)
    assert deleted.is_deleted is True


@pytest.mark.asyncio
@patch("app.services.task_service.smart_notifications")
async def test_comment_mention_triggers_notification(mock_notif, svc: TaskService):
    """@mention in a comment triggers a notification to the mentioned user."""
    mock_notif.deliver = AsyncMock(return_value=True)

    task = await _create_task(svc)
    mentions = [{"id": "mentioned-user-001", "label": "Alice", "type": "user"}]
    await svc.add_comment(task.id, TEST_USER_ID, "Hey @Alice", mentions)

    # Check that deliver was called for the mentioned user
    mention_calls = [
        c for c in mock_notif.deliver.call_args_list
        if c[0][0].type == "task_mention"
    ]
    assert len(mention_calls) >= 1
    assert mention_calls[0][0][0].user_id == "mentioned-user-001"


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_tasks(svc: TaskService):
    """search_tasks finds tasks by title."""
    await _create_task(svc, title="Fix login bug")
    await _create_task(svc, title="Update docs")

    results = await svc.search_tasks(TEST_USER_ID, "login")
    titles = [t.title for t in results]
    assert "Fix login bug" in titles
    assert "Update docs" not in titles


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reorder_task(svc: TaskService):
    """reorder_task changes position and status."""
    task = await _create_task(svc)
    reordered = await svc.reorder_task(task.id, TEST_USER_ID, 3, "in_progress")
    assert reordered.position == 3
    assert reordered.status == "in_progress"


# ---------------------------------------------------------------------------
# Bulk Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_bulk_update(svc: TaskService):
    """bulk_update applies updates to multiple tasks."""
    t1 = await _create_task(svc, title="Bulk 1")
    t2 = await _create_task(svc, title="Bulk 2")

    results = await svc.bulk_update([t1.id, t2.id], TEST_USER_ID, {"priority": "high"})
    assert len(results) == 2
    assert all(t.priority == "high" for t in results)


# ---------------------------------------------------------------------------
# count_by_status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_count_by_status(svc: TaskService):
    """count_by_status returns correct groupings."""
    await _create_task(svc, title="T1")
    await _create_task(svc, title="T2")
    t3 = await _create_task(svc, title="T3")
    await svc.update_task(t3.id, TEST_USER_ID, {"status": "done"})

    counts = await svc.count_by_status(TEST_USER_ID)
    assert counts.get("todo", 0) == 2
    assert counts.get("done", 0) == 1
