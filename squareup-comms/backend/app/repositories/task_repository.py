"""Task repository — extends BaseRepository with task-specific queries."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse, paginate
from app.models.tasks import Task
from app.models.task_comments import TaskComment
from app.models.task_activity import TaskActivity
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """Task data access with scoping, soft-delete, and subtask support."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Task, session)

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    async def find_user_tasks(
        self,
        user_id: str,
        *,
        status: str | None = None,
        priority: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[Task]:
        """Tasks where user is assignee OR creator, excluding soft-deleted."""
        query = select(Task).where(
            or_(Task.assigned_to == user_id, Task.created_by == user_id),
            Task.is_deleted == False,  # noqa: E712
        )
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        return await paginate(
            self._session,
            Task,
            base_query=query,
            cursor=cursor,
            limit=limit,
            order_by=Task.created_at.desc(),
        )

    async def find_subtasks(self, parent_id: str) -> Sequence[Task]:
        """Return non-deleted subtasks of a parent task, ordered by position."""
        result = await self._session.execute(
            select(Task)
            .where(Task.parent_id == parent_id, Task.is_deleted == False)  # noqa: E712
            .order_by(Task.position, Task.created_at)
        )
        return result.scalars().all()

    async def find_overdue(self, user_id: str) -> Sequence[Task]:
        """Return non-completed, non-deleted tasks past their due date."""
        now = datetime.utcnow()
        result = await self._session.execute(
            select(Task).where(
                or_(Task.assigned_to == user_id, Task.created_by == user_id),
                Task.due_date < now,
                Task.status != "done",
                Task.is_deleted == False,  # noqa: E712
            ).order_by(Task.due_date)
        )
        return result.scalars().all()

    async def reorder(self, task_id: str, new_position: int, status: str) -> Task | None:
        """Move a task to a new position within a status column."""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        task.position = new_position
        task.status = status
        task.updated_at = datetime.utcnow()
        self._session.add(task)
        await self._session.commit()
        await self._session.refresh(task)
        return task

    async def soft_delete(self, task_id: str) -> Task | None:
        """Mark a task as deleted instead of hard-deleting."""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        task.is_deleted = True
        task.deleted_at = datetime.utcnow()
        task.updated_at = datetime.utcnow()
        self._session.add(task)
        await self._session.commit()
        await self._session.refresh(task)
        return task

    async def search(self, user_id: str, query: str, *, limit: int = 20) -> Sequence[Task]:
        """Simple title/description search scoped to user's tasks."""
        pattern = f"%{query}%"
        result = await self._session.execute(
            select(Task).where(
                or_(Task.assigned_to == user_id, Task.created_by == user_id),
                Task.is_deleted == False,  # noqa: E712
                or_(Task.title.ilike(pattern), Task.description.ilike(pattern)),
            ).order_by(Task.created_at.desc()).limit(limit)
        )
        return result.scalars().all()

    async def count_by_status(self, user_id: str) -> dict[str, int]:
        """Count user's non-deleted tasks grouped by status."""
        result = await self._session.execute(
            select(Task.status, func.count(Task.id))
            .where(
                or_(Task.assigned_to == user_id, Task.created_by == user_id),
                Task.is_deleted == False,  # noqa: E712
            )
            .group_by(Task.status)
        )
        return {row[0]: row[1] for row in result.all()}


class TaskCommentRepository(BaseRepository[TaskComment]):
    """Data access for task comments."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(TaskComment, session)

    async def find_by_task(
        self,
        task_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[TaskComment]:
        """Comments for a task, excluding soft-deleted, newest first."""
        query = select(TaskComment).where(
            TaskComment.task_id == task_id,
            TaskComment.is_deleted == False,  # noqa: E712
        )
        return await paginate(
            self._session,
            TaskComment,
            base_query=query,
            cursor=cursor,
            limit=limit,
            order_by=TaskComment.created_at.desc(),
        )


class TaskActivityRepository(BaseRepository[TaskActivity]):
    """Data access for task activity log."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(TaskActivity, session)

    async def find_by_task(
        self,
        task_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[TaskActivity]:
        """Activity entries for a task, newest first."""
        query = select(TaskActivity).where(TaskActivity.task_id == task_id)
        return await paginate(
            self._session,
            TaskActivity,
            base_query=query,
            cursor=cursor,
            limit=limit,
            order_by=TaskActivity.created_at.desc(),
        )
