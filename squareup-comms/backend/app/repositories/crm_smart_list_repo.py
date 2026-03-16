"""Smart list repository — data access for CRM smart lists."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse
from app.models.crm_smart_list import CRMSmartList
from app.repositories.base import BaseRepository


class SmartListRepository(BaseRepository[CRMSmartList]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMSmartList, session)

    async def search(
        self,
        *,
        is_shared: bool | None = None,
        query: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMSmartList]:
        """Search smart lists with filters and cursor pagination."""
        filters: list[Any] = []

        if is_shared is not None:
            filters.append(CRMSmartList.is_shared == is_shared)
        if query:
            filters.append(col(CRMSmartList.name).ilike(f"%{query}%"))

        sort_map = {
            "created_at": CRMSmartList.created_at,
            "name": CRMSmartList.name,
            "member_count": CRMSmartList.member_count,
            "updated_at": CRMSmartList.updated_at,
        }
        sort_col = sort_map.get(sort_by, CRMSmartList.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(
            filters=filters, cursor=cursor, limit=limit, order_by=order
        )
