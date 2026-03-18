"""Calendar event repository — data access for CRM calendar events."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse
from app.models.crm_calendar import CRMCalendarEvent
from app.repositories.base import BaseRepository


class CalendarEventRepository(BaseRepository[CRMCalendarEvent]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMCalendarEvent, session)

    async def search(
        self,
        *,
        contact_id: str | None = None,
        deal_id: str | None = None,
        event_type: str | None = None,
        status: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "start_at",
        sort_dir: str = "asc",
    ) -> PaginatedResponse[CRMCalendarEvent]:
        """Search calendar events with filters and cursor pagination."""
        filters: list[Any] = []

        if contact_id:
            filters.append(CRMCalendarEvent.contact_id == contact_id)
        if deal_id:
            filters.append(CRMCalendarEvent.deal_id == deal_id)
        if event_type:
            filters.append(CRMCalendarEvent.event_type == event_type)
        if status:
            filters.append(CRMCalendarEvent.status == status)
        if start_date:
            filters.append(CRMCalendarEvent.start_at >= start_date)
        if end_date:
            filters.append(CRMCalendarEvent.end_at <= end_date)

        sort_map = {
            "start_at": CRMCalendarEvent.start_at,
            "end_at": CRMCalendarEvent.end_at,
            "created_at": CRMCalendarEvent.created_at,
            "title": CRMCalendarEvent.title,
        }
        sort_col = sort_map.get(sort_by, CRMCalendarEvent.start_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(
            filters=filters, cursor=cursor, limit=limit, order_by=order
        )

    async def get_upcoming(
        self,
        *,
        limit: int = 20,
    ) -> Sequence[CRMCalendarEvent]:
        """Get upcoming events (scheduled, starting from now)."""
        now = datetime.utcnow()
        result = await self._session.execute(
            select(CRMCalendarEvent)
            .where(
                CRMCalendarEvent.start_at >= now,
                CRMCalendarEvent.status == "scheduled",
            )
            .order_by(CRMCalendarEvent.start_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_overdue_follow_ups(
        self,
        *,
        limit: int = 50,
    ) -> Sequence[CRMCalendarEvent]:
        """Get overdue follow-ups (scheduled events past their start_at)."""
        now = datetime.utcnow()
        result = await self._session.execute(
            select(CRMCalendarEvent)
            .where(
                CRMCalendarEvent.start_at < now,
                CRMCalendarEvent.status == "scheduled",
                CRMCalendarEvent.event_type == "follow_up",
            )
            .order_by(CRMCalendarEvent.start_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_for_contact(
        self,
        contact_id: str,
        *,
        limit: int = 50,
    ) -> Sequence[CRMCalendarEvent]:
        """Get all events for a contact, newest first."""
        result = await self._session.execute(
            select(CRMCalendarEvent)
            .where(CRMCalendarEvent.contact_id == contact_id)
            .order_by(CRMCalendarEvent.start_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_external_id(
        self,
        external_event_id: str,
    ) -> CRMCalendarEvent | None:
        """Find an event by its external (Google Calendar) event ID."""
        result = await self._session.execute(
            select(CRMCalendarEvent).where(
                CRMCalendarEvent.external_event_id == external_event_id
            )
        )
        return result.scalars().first()
