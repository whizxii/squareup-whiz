"""Deal repository — data access for CRM deals."""

from __future__ import annotations

import json
from collections import defaultdict
from typing import Any, Sequence

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse
from app.models.crm_deal import CRMDeal
from app.models.crm_pipeline import CRMPipeline
from app.repositories.base import BaseRepository


class DealRepository(BaseRepository[CRMDeal]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMDeal, session)

    async def search(
        self,
        *,
        pipeline_id: str | None = None,
        stage: str | None = None,
        status: str | None = None,
        owner_id: str | None = None,
        contact_id: str | None = None,
        company_id: str | None = None,
        value_min: float | None = None,
        value_max: float | None = None,
        query: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMDeal]:
        """Search deals with filters and cursor pagination."""
        filters: list[Any] = []

        if pipeline_id:
            filters.append(CRMDeal.pipeline_id == pipeline_id)
        if stage:
            filters.append(CRMDeal.stage == stage)
        if status:
            filters.append(CRMDeal.status == status)
        if owner_id:
            filters.append(CRMDeal.owner_id == owner_id)
        if contact_id:
            filters.append(CRMDeal.contact_id == contact_id)
        if company_id:
            filters.append(CRMDeal.company_id == company_id)
        if value_min is not None:
            filters.append(CRMDeal.value >= value_min)
        if value_max is not None:
            filters.append(CRMDeal.value <= value_max)
        if query:
            filters.append(col(CRMDeal.title).ilike(f"%{query}%"))

        sort_map = {
            "created_at": CRMDeal.created_at,
            "value": CRMDeal.value,
            "probability": CRMDeal.probability,
            "expected_close_date": CRMDeal.expected_close_date,
            "stage_entered_at": CRMDeal.stage_entered_at,
            "title": CRMDeal.title,
        }
        sort_col = sort_map.get(sort_by, CRMDeal.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(filters=filters, cursor=cursor, limit=limit, order_by=order)

    async def get_by_pipeline_grouped(self, pipeline_id: str) -> dict[str, list[CRMDeal]]:
        """Get all open deals for a pipeline grouped by stage."""
        result = await self._session.execute(
            select(CRMDeal)
            .where(
                or_(CRMDeal.pipeline_id == pipeline_id, CRMDeal.pipeline_id.is_(None)),
                CRMDeal.status == "open",
            )
            .order_by(CRMDeal.created_at.desc())
        )
        deals = result.scalars().all()

        grouped: dict[str, list[CRMDeal]] = defaultdict(list)
        for deal in deals:
            grouped[deal.stage].append(deal)
        return dict(grouped)

    async def get_for_contact(self, contact_id: str) -> Sequence[CRMDeal]:
        """Get all deals for a specific contact."""
        result = await self._session.execute(
            select(CRMDeal)
            .where(CRMDeal.contact_id == contact_id)
            .order_by(CRMDeal.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_stale_deals(self, sla_days: int = 7) -> Sequence[CRMDeal]:
        """Get open deals with no stage change past the SLA threshold."""
        from datetime import datetime, timedelta

        threshold = datetime.utcnow() - timedelta(days=sla_days)
        result = await self._session.execute(
            select(CRMDeal)
            .where(
                CRMDeal.status == "open",
                CRMDeal.stage_entered_at < threshold,
            )
            .order_by(CRMDeal.stage_entered_at.asc())
        )
        return list(result.scalars().all())

    async def get_pipeline_stats(self, pipeline_id: str) -> dict[str, Any]:
        """Get aggregate stats for a pipeline: total value, count, weighted value."""
        result = await self._session.execute(
            select(
                func.count(CRMDeal.id),
                func.coalesce(func.sum(CRMDeal.value), 0),
            )
            .where(
                CRMDeal.pipeline_id == pipeline_id,
                CRMDeal.status == "open",
            )
        )
        row = result.one()
        return {
            "deal_count": row[0],
            "total_value": float(row[1]),
        }
