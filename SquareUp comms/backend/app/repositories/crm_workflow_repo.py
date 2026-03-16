"""Workflow repository — data access for CRM workflows and executions."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse
from app.models.crm_workflow import CRMWorkflow, CRMWorkflowExecution
from app.repositories.base import BaseRepository


class WorkflowRepository(BaseRepository[CRMWorkflow]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMWorkflow, session)

    async def search(
        self,
        *,
        is_active: bool | None = None,
        trigger_type: str | None = None,
        query: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMWorkflow]:
        """Search workflows with filters and cursor pagination."""
        filters: list[Any] = []

        if is_active is not None:
            filters.append(CRMWorkflow.is_active == is_active)
        if query:
            filters.append(col(CRMWorkflow.name).ilike(f"%{query}%"))
        # trigger_type filtering is done in-memory since trigger is JSON

        sort_map = {
            "created_at": CRMWorkflow.created_at,
            "name": CRMWorkflow.name,
            "execution_count": CRMWorkflow.execution_count,
            "last_executed_at": CRMWorkflow.last_executed_at,
        }
        sort_col = sort_map.get(sort_by, CRMWorkflow.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(
            filters=filters, cursor=cursor, limit=limit, order_by=order
        )

    async def get_active_by_trigger(self, trigger_type: str) -> Sequence[CRMWorkflow]:
        """Get all active workflows matching a specific trigger type."""
        result = await self._session.execute(
            select(CRMWorkflow).where(
                CRMWorkflow.is_active == True,  # noqa: E712
            )
        )
        workflows = result.scalars().all()
        # Filter by trigger type (JSON field)
        return [
            w for w in workflows if w.trigger.get("type") == trigger_type
        ]


class WorkflowExecutionRepository(BaseRepository[CRMWorkflowExecution]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMWorkflowExecution, session)

    async def get_for_workflow(
        self,
        workflow_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[CRMWorkflowExecution]:
        """Get execution history for a specific workflow."""
        filters = [CRMWorkflowExecution.workflow_id == workflow_id]
        return await self.get_paginated(
            filters=filters,
            cursor=cursor,
            limit=limit,
            order_by=CRMWorkflowExecution.executed_at.desc(),
        )

    async def get_recent(
        self, workflow_id: str, limit: int = 10
    ) -> Sequence[CRMWorkflowExecution]:
        """Get the most recent executions."""
        result = await self._session.execute(
            select(CRMWorkflowExecution)
            .where(CRMWorkflowExecution.workflow_id == workflow_id)
            .order_by(CRMWorkflowExecution.executed_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
