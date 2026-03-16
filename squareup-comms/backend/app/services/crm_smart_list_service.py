"""Smart list service — dynamic contact segments with criteria evaluation.

Evaluates criteria against the contacts table. Supports operators:
equals, not_equals, contains, gt, lt, gte, lte, is_empty, is_not_empty,
in_list, not_in_list, date_before, date_after, date_in_last_days.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Sequence

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse
from app.models.crm import CRMContact
from app.models.crm_smart_list import CRMSmartList
from app.repositories.crm_smart_list_repo import SmartListRepository
from app.services.base import BaseService

logger = logging.getLogger(__name__)

# ─── Criterion → SQLAlchemy filter ───────────────────────────────

# Fields that can be queried on CRMContact
CONTACT_FIELD_MAP: dict[str, Any] = {
    "name": CRMContact.name,
    "email": CRMContact.email,
    "phone": CRMContact.phone,
    "company": CRMContact.company,
    "title": CRMContact.title,
    "stage": CRMContact.stage,
    "lifecycle_stage": CRMContact.lifecycle_stage,
    "source": CRMContact.source,
    "owner_id": CRMContact.owner_id,
    "lead_score": CRMContact.lead_score,
    "created_at": CRMContact.created_at,
    "updated_at": CRMContact.updated_at,
    "last_activity_at": CRMContact.last_activity_at,
}


def _build_criterion_filter(criterion: dict[str, Any]) -> Any | None:
    """Convert a single criterion dict to a SQLAlchemy filter expression."""
    field_name = criterion.get("field", "")
    operator = criterion.get("operator", "equals")
    value = criterion.get("value")

    column = CONTACT_FIELD_MAP.get(field_name)
    if column is None:
        logger.warning("Unknown smart list field: %s", field_name)
        return None

    if operator == "equals":
        return column == value
    elif operator == "not_equals":
        return column != value
    elif operator == "contains":
        return col(column).ilike(f"%{value}%") if isinstance(value, str) else None
    elif operator == "gt":
        return column > value
    elif operator == "lt":
        return column < value
    elif operator == "gte":
        return column >= value
    elif operator == "lte":
        return column <= value
    elif operator == "is_empty":
        return or_(column == None, column == "")  # noqa: E711
    elif operator == "is_not_empty":
        return and_(column != None, column != "")  # noqa: E711
    elif operator == "in_list":
        return column.in_(value) if isinstance(value, list) else None
    elif operator == "not_in_list":
        return ~column.in_(value) if isinstance(value, list) else None
    elif operator == "date_before":
        return column < value
    elif operator == "date_after":
        return column > value
    elif operator == "date_in_last_days":
        try:
            days = int(value)
        except (TypeError, ValueError):
            return None
        threshold = datetime.now(timezone.utc) - timedelta(days=days)
        return column >= threshold
    else:
        logger.warning("Unknown operator: %s", operator)
        return None


def build_criteria_filters(criteria: list[dict[str, Any]]) -> list[Any]:
    """Convert a list of criteria into SQLAlchemy filter expressions.

    Currently treats all criteria as AND-ed together.
    OR conjunction support can be added in a future iteration.
    """
    filters: list[Any] = []
    for criterion in criteria:
        f = _build_criterion_filter(criterion)
        if f is not None:
            filters.append(f)
    return filters


# ─── Smart List Service ──────────────────────────────────────────


class SmartListService(BaseService):
    """Business logic for smart list operations."""

    @property
    def repo(self) -> SmartListRepository:
        return SmartListRepository(self.session)

    # ─── CRUD ────────────────────────────────────────────────────

    async def create_smart_list(
        self, data: dict[str, Any], user_id: str
    ) -> CRMSmartList:
        """Create a new smart list and compute initial member count."""
        now = datetime.now(timezone.utc)
        smart_list = CRMSmartList(
            name=data["name"],
            description=data.get("description"),
            criteria=data.get("criteria", []),
            sort_by=data.get("sort_by"),
            sort_order=data.get("sort_order", "desc"),
            columns=data.get("columns", ["name", "email", "company", "stage"]),
            is_shared=data.get("is_shared", False),
            auto_refresh=data.get("auto_refresh", True),
            member_count=0,
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        smart_list = await self.repo.create(smart_list)

        # Compute initial member count
        count = await self._count_members(smart_list.criteria)
        await self.repo.update(smart_list, {"member_count": count})

        await self.events.emit("smart_list.created", {
            "smart_list_id": smart_list.id,
            "name": smart_list.name,
        })
        return smart_list

    async def update_smart_list(
        self, list_id: str, data: dict[str, Any]
    ) -> CRMSmartList:
        """Update smart list and recompute member count if criteria changed."""
        smart_list = await self.repo.get_by_id(list_id)
        if not smart_list:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Smart list not found")

        updates = {
            k: v for k, v in data.items()
            if k in (
                "name", "description", "criteria", "sort_by",
                "sort_order", "columns", "is_shared", "auto_refresh",
            )
            and v is not None
        }
        updates["updated_at"] = datetime.now(timezone.utc)

        smart_list = await self.repo.update(smart_list, updates)

        # Recompute if criteria changed
        if "criteria" in data:
            count = await self._count_members(smart_list.criteria)
            smart_list = await self.repo.update(smart_list, {"member_count": count})

        return smart_list

    async def get_smart_list(self, list_id: str) -> CRMSmartList | None:
        return await self.repo.get_by_id(list_id)

    async def list_smart_lists(
        self,
        *,
        is_shared: bool | None = None,
        query: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ):
        return await self.repo.search(
            is_shared=is_shared, query=query, cursor=cursor, limit=limit
        )

    async def delete_smart_list(self, list_id: str) -> bool:
        return await self.repo.delete(list_id)

    # ─── Member operations ───────────────────────────────────────

    async def get_members(
        self,
        list_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[CRMContact]:
        """Get contacts matching the smart list criteria."""
        from app.repositories.base import BaseRepository

        smart_list = await self.repo.get_by_id(list_id)
        if not smart_list:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Smart list not found")

        filters = build_criteria_filters(smart_list.criteria)

        # Determine sort
        sort_col = CONTACT_FIELD_MAP.get(
            smart_list.sort_by or "created_at", CRMContact.created_at
        )
        order = (
            sort_col.asc()
            if smart_list.sort_order == "asc"
            else sort_col.desc()
        )

        contact_repo = BaseRepository(CRMContact, self.session)
        return await contact_repo.get_paginated(
            filters=filters, cursor=cursor, limit=limit, order_by=order
        )

    async def refresh_member_count(self, list_id: str) -> CRMSmartList:
        """Force re-evaluation of member count."""
        smart_list = await self.repo.get_by_id(list_id)
        if not smart_list:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Smart list not found")

        count = await self._count_members(smart_list.criteria)
        now = datetime.now(timezone.utc)
        return await self.repo.update(smart_list, {
            "member_count": count,
            "updated_at": now,
        })

    async def generate_lookalike(
        self, list_id: str, limit: int = 20
    ) -> Sequence[CRMContact]:
        """Find contacts similar to smart list members but not in the list.

        Analyzes common traits (stage, company, source) of current members
        and finds similar contacts.
        """
        smart_list = await self.repo.get_by_id(list_id)
        if not smart_list:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Smart list not found")

        criteria_filters = build_criteria_filters(smart_list.criteria)

        # Get common traits from current members
        member_query = select(CRMContact)
        for f in criteria_filters:
            member_query = member_query.where(f)
        member_result = await self.session.execute(member_query.limit(100))
        members = list(member_result.scalars().all())

        if not members:
            return []

        # Find common stages and sources
        member_ids = {m.id for m in members}
        common_stages = {m.stage for m in members if m.stage}
        common_sources = {m.source for m in members if m.source}

        # Build lookalike query — NOT in current list
        lookalike_filters: list[Any] = [~CRMContact.id.in_(member_ids)]

        # Match similar traits with OR logic
        trait_conditions = []
        if common_stages:
            trait_conditions.append(CRMContact.stage.in_(common_stages))
        if common_sources:
            trait_conditions.append(CRMContact.source.in_(common_sources))

        if trait_conditions:
            lookalike_filters.append(or_(*trait_conditions))

        result = await self.session.execute(
            select(CRMContact)
            .where(*lookalike_filters)
            .order_by(CRMContact.lead_score.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # ─── Helpers ─────────────────────────────────────────────────

    async def _count_members(self, criteria: list[dict[str, Any]]) -> int:
        """Count contacts matching criteria."""
        filters = build_criteria_filters(criteria)
        query = select(func.count()).select_from(CRMContact)
        for f in filters:
            query = query.where(f)
        result = await self.session.execute(query)
        return result.scalar() or 0
