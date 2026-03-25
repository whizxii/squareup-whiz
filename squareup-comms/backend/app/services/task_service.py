"""Task service — business logic for tasks, comments, activity, and notifications."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from app.core.pagination import PaginatedResponse
from app.core.responses import ApiError
from app.models.notifications import Notification
from app.models.task_activity import TaskActivity
from app.models.task_comments import TaskComment
from app.models.tasks import Task
from app.repositories.task_repository import (
    TaskActivityRepository,
    TaskCommentRepository,
    TaskRepository,
)
from app.services.base import BaseService
from app.services.smart_notifications import Notification as SmartNotification
from app.services.smart_notifications import smart_notifications

logger = logging.getLogger(__name__)


class TaskService(BaseService):
    """Business logic for task operations with activity logging and notifications."""

    @property
    def repo(self) -> TaskRepository:
        return TaskRepository(self.session)

    @property
    def comment_repo(self) -> TaskCommentRepository:
        return TaskCommentRepository(self.session)

    @property
    def activity_repo(self) -> TaskActivityRepository:
        return TaskActivityRepository(self.session)

    # ------------------------------------------------------------------
    # Core CRUD
    # ------------------------------------------------------------------

    async def create_task(
        self,
        user_id: str,
        data: dict[str, Any],
    ) -> Task:
        """Create a task with activity logging and optional notification."""
        now = datetime.utcnow()
        due_date = _parse_datetime(data.get("due_date")) if data.get("due_date") else None

        task = Task(
            title=data["title"],
            description=data.get("description"),
            assigned_to=data.get("assigned_to") or user_id,
            created_by=user_id,
            created_by_type="user",
            status="todo",
            priority=data.get("priority", "medium"),
            due_date=due_date,
            tags=json.dumps(data.get("tags") or []),
            parent_id=data.get("parent_id"),
            workspace_id=data.get("workspace_id"),
            estimated_minutes=data.get("estimated_minutes"),
            created_at=now,
            updated_at=now,
        )
        task = await self.repo.create(task)

        await self._log_activity(task.id, user_id, "created")
        await self.events.emit("task.created", {
            "task_id": task.id,
            "user_id": user_id,
        })

        if task.assigned_to != user_id:
            await self._notify_assignee(task, user_id, "task_assigned")

        return task

    async def get_task(self, task_id: str, user_id: str) -> Task:
        """Get a task with ownership check. Raises ApiError(403) if unauthorized."""
        return await self._get_authorized_task(task_id, user_id)

    async def list_tasks(
        self,
        user_id: str,
        *,
        status: str | None = None,
        priority: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[Task]:
        """List tasks scoped to user (creator or assignee)."""
        return await self.repo.find_user_tasks(
            user_id, status=status, priority=priority, cursor=cursor, limit=limit,
        )

    async def update_task(
        self,
        task_id: str,
        user_id: str,
        updates: dict[str, Any],
    ) -> Task:
        """Update task fields with activity logging and event emission."""
        task = await self._get_authorized_task(task_id, user_id)

        # Capture old values before mutation
        old_values: dict[str, Any] = {}
        for field in updates:
            if field == "tags":
                old_values[field] = task.tags
            elif field == "due_date":
                old_values[field] = str(task.due_date) if task.due_date else None
            else:
                old_values[field] = getattr(task, field, None)

        # Apply updates
        for field, value in updates.items():
            if field == "tags":
                task.tags = json.dumps(value or [])
            elif field == "due_date":
                task.due_date = _parse_datetime(value) if value else None
            else:
                setattr(task, field, value)

        # Auto-set completed_at when status changes to done
        if updates.get("status") == "done" and not task.completed_at:
            task.completed_at = datetime.utcnow()
        elif updates.get("status") and updates["status"] != "done":
            task.completed_at = None

        task.updated_at = datetime.utcnow()
        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(task)

        # Log activity for each changed field
        for field, new_value in updates.items():
            old_val = old_values.get(field)
            new_str = json.dumps(new_value) if isinstance(new_value, (list, dict)) else str(new_value)
            old_str = str(old_val) if old_val is not None else None
            if old_str != new_str:
                await self._log_activity(
                    task.id, user_id, "updated",
                    field_changed=field, old_value=old_str, new_value=new_str,
                )

        # Emit targeted events
        if updates.get("status") == "done":
            await self.events.emit("task.completed", {"task_id": task.id, "user_id": user_id})
            if task.created_by and task.created_by != user_id:
                await self._notify_creator_completed(task, user_id)

        if "assigned_to" in updates and updates["assigned_to"] != old_values.get("assigned_to"):
            await self.events.emit("task.assigned", {
                "task_id": task.id,
                "assigned_to": updates["assigned_to"],
                "assigned_by": user_id,
            })
            await self._notify_assignee(task, user_id, "task_assigned")

        await self.events.emit("task.updated", {"task_id": task.id, "user_id": user_id})
        return task

    async def delete_task(self, task_id: str, user_id: str) -> Task:
        """Soft-delete a task."""
        task = await self._get_authorized_task(task_id, user_id)
        deleted = await self.repo.soft_delete(task_id)
        if deleted is None:
            raise ApiError(status_code=500, detail="Failed to delete task")

        await self._log_activity(task.id, user_id, "deleted")
        await self.events.emit("task.deleted", {"task_id": task.id, "user_id": user_id})
        return deleted

    # ------------------------------------------------------------------
    # Subtasks
    # ------------------------------------------------------------------

    async def create_subtask(
        self,
        parent_id: str,
        user_id: str,
        data: dict[str, Any],
    ) -> Task:
        """Create a subtask under a parent task."""
        # Verify access to parent
        await self._get_authorized_task(parent_id, user_id)
        data_with_parent = {**data, "parent_id": parent_id}
        return await self.create_task(user_id, data_with_parent)

    async def get_subtasks(self, parent_id: str, user_id: str) -> list[Task]:
        """List subtasks of a parent task."""
        await self._get_authorized_task(parent_id, user_id)
        subtasks = await self.repo.find_subtasks(parent_id)
        return list(subtasks)

    # ------------------------------------------------------------------
    # Comments
    # ------------------------------------------------------------------

    async def add_comment(
        self,
        task_id: str,
        user_id: str,
        content: str,
        mentions: list[dict[str, str]] | None = None,
    ) -> TaskComment:
        """Add a comment to a task with notifications for mentions."""
        await self._get_authorized_task(task_id, user_id)

        now = datetime.utcnow()
        comment = TaskComment(
            task_id=task_id,
            user_id=user_id,
            content=content,
            mentions=json.dumps(mentions or []),
            created_at=now,
            updated_at=now,
        )
        comment = await self.comment_repo.create(comment)

        await self._log_activity(task_id, user_id, "commented")
        await self.events.emit("task.commented", {
            "task_id": task_id,
            "comment_id": comment.id,
            "user_id": user_id,
        })

        # Notify task owner/assignee about the comment
        task = await self.repo.get_by_id(task_id)
        if task:
            await self._notify_comment(task, user_id, content)

        # Notify mentioned users
        for mention in (mentions or []):
            mentioned_id = mention.get("id")
            if mentioned_id and mentioned_id != user_id:
                await smart_notifications.deliver(SmartNotification(
                    user_id=mentioned_id,
                    type="task_mention",
                    title="You were mentioned in a task comment",
                    body=content[:200],
                    priority="high",
                    entity_id=task_id,
                    entity_type="task",
                ))

        return comment

    async def get_comments(
        self,
        task_id: str,
        user_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[TaskComment]:
        """List comments for a task (newest first)."""
        await self._get_authorized_task(task_id, user_id)
        return await self.comment_repo.find_by_task(
            task_id, cursor=cursor, limit=limit,
        )

    async def update_comment(
        self,
        task_id: str,
        comment_id: str,
        user_id: str,
        content: str,
    ) -> TaskComment:
        """Edit a comment — only the author can edit."""
        await self._get_authorized_task(task_id, user_id)
        comment = await self.comment_repo.get_by_id(comment_id)
        if comment is None:
            raise ApiError(status_code=404, detail="Comment not found")
        if comment.user_id != user_id:
            raise ApiError(status_code=403, detail="Only the comment author can edit")

        comment.content = content
        comment.updated_at = datetime.utcnow()
        self.session.add(comment)
        await self.session.commit()
        await self.session.refresh(comment)
        return comment

    async def delete_comment(
        self,
        task_id: str,
        comment_id: str,
        user_id: str,
    ) -> TaskComment:
        """Soft-delete a comment — only the author can delete."""
        await self._get_authorized_task(task_id, user_id)
        comment = await self.comment_repo.get_by_id(comment_id)
        if comment is None:
            raise ApiError(status_code=404, detail="Comment not found")
        if comment.user_id != user_id:
            raise ApiError(status_code=403, detail="Only the comment author can delete")

        comment.is_deleted = True
        comment.updated_at = datetime.utcnow()
        self.session.add(comment)
        await self.session.commit()
        await self.session.refresh(comment)
        return comment

    # ------------------------------------------------------------------
    # Activity
    # ------------------------------------------------------------------

    async def get_activity(
        self,
        task_id: str,
        user_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[TaskActivity]:
        """List activity entries for a task (newest first)."""
        await self._get_authorized_task(task_id, user_id)
        return await self.activity_repo.find_by_task(
            task_id, cursor=cursor, limit=limit,
        )

    # ------------------------------------------------------------------
    # Reorder & Bulk
    # ------------------------------------------------------------------

    async def reorder_task(
        self,
        task_id: str,
        user_id: str,
        new_position: int,
        status: str,
    ) -> Task:
        """Move a task to a new position/status column."""
        await self._get_authorized_task(task_id, user_id)
        task = await self.repo.reorder(task_id, new_position, status)
        if task is None:
            raise ApiError(status_code=500, detail="Failed to reorder task")

        await self.events.emit("task.updated", {"task_id": task.id, "user_id": user_id})
        return task

    async def bulk_update(
        self,
        task_ids: list[str],
        user_id: str,
        updates: dict[str, Any],
    ) -> list[Task]:
        """Bulk-update multiple tasks. Returns updated tasks."""
        results: list[Task] = []
        for tid in task_ids:
            task = await self.update_task(tid, user_id, updates)
            results.append(task)
        return results

    # ------------------------------------------------------------------
    # Search & Stats
    # ------------------------------------------------------------------

    async def search_tasks(
        self,
        user_id: str,
        query: str,
        *,
        limit: int = 20,
    ) -> list[Task]:
        """Search task titles and descriptions."""
        results = await self.repo.search(user_id, query, limit=limit)
        return list(results)

    async def count_by_status(self, user_id: str) -> dict[str, int]:
        """Count tasks grouped by status."""
        return await self.repo.count_by_status(user_id)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _get_authorized_task(self, task_id: str, user_id: str) -> Task:
        """Get task with ownership check. Raises ApiError if not found/unauthorized."""
        task = await self.repo.get_by_id(task_id)
        if task is None:
            raise ApiError(status_code=404, detail="Task not found")
        if task.is_deleted:
            raise ApiError(status_code=404, detail="Task not found")
        if task.created_by != user_id and task.assigned_to != user_id:
            raise ApiError(status_code=403, detail="Not authorized to access this task")
        return task

    async def _log_activity(
        self,
        task_id: str,
        user_id: str,
        action: str,
        *,
        field_changed: str | None = None,
        old_value: str | None = None,
        new_value: str | None = None,
        extra_data: str | None = None,
    ) -> TaskActivity:
        """Write an activity log entry for a task."""
        entry = TaskActivity(
            task_id=task_id,
            user_id=user_id,
            action=action,
            field_changed=field_changed,
            old_value=old_value,
            new_value=new_value,
            extra_data=extra_data or "{}",
        )
        entry = await self.activity_repo.create(entry)
        return entry

    async def _notify_assignee(
        self,
        task: Task,
        actor_user_id: str,
        notification_type: str,
    ) -> None:
        """Send a notification to the task assignee."""
        if task.assigned_to == actor_user_id:
            return  # Don't notify yourself

        # Persist notification in DB
        notif = Notification(
            user_id=task.assigned_to,
            type=notification_type,
            tier="high",
            title=f"Task assigned: {task.title[:80]}",
            body=task.description[:200] if task.description else None,
            task_id=task.id,
        )
        self.session.add(notif)
        await self.session.commit()

        # Push via WebSocket
        await smart_notifications.deliver(SmartNotification(
            user_id=task.assigned_to,
            type=notification_type,
            title=f"Task assigned: {task.title[:80]}",
            body=task.description[:200] if task.description else None,
            priority="high",
            entity_id=task.id,
            entity_type="task",
        ))

    async def _notify_creator_completed(
        self,
        task: Task,
        completer_user_id: str,
    ) -> None:
        """Notify the task creator that the task was completed."""
        if not task.created_by or task.created_by == completer_user_id:
            return

        notif = Notification(
            user_id=task.created_by,
            type="task_completed",
            tier="normal",
            title=f"Task completed: {task.title[:80]}",
            body=f"'{task.title}' has been marked as done.",
            task_id=task.id,
        )
        self.session.add(notif)
        await self.session.commit()

        await smart_notifications.deliver(SmartNotification(
            user_id=task.created_by,
            type="task_completed",
            title=f"Task completed: {task.title[:80]}",
            body=f"'{task.title}' has been marked as done.",
            priority="medium",
            entity_id=task.id,
            entity_type="task",
        ))

    async def _notify_comment(
        self,
        task: Task,
        commenter_user_id: str,
        content: str,
    ) -> None:
        """Notify task owner/assignee about a new comment."""
        recipients = {task.created_by, task.assigned_to} - {None, commenter_user_id}
        for recipient_id in recipients:
            notif = Notification(
                user_id=recipient_id,
                type="task_commented",
                tier="normal",
                title=f"New comment on: {task.title[:80]}",
                body=content[:200],
                task_id=task.id,
            )
            self.session.add(notif)

        if recipients:
            await self.session.commit()

        for recipient_id in recipients:
            await smart_notifications.deliver(SmartNotification(
                user_id=recipient_id,
                type="task_commented",
                title=f"New comment on: {task.title[:80]}",
                body=content[:200],
                priority="medium",
                entity_id=task.id,
                entity_type="task",
            ))


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
