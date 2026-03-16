"""Email repository — data access for CRM emails."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse
from app.models.crm_email import CRMEmail
from app.repositories.base import BaseRepository


class EmailRepository(BaseRepository[CRMEmail]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMEmail, session)

    async def search(
        self,
        *,
        contact_id: str | None = None,
        deal_id: str | None = None,
        direction: str | None = None,
        status: str | None = None,
        thread_id: str | None = None,
        sequence_id: str | None = None,
        query: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMEmail]:
        """Search emails with filters and cursor pagination."""
        filters: list[Any] = []

        if contact_id:
            filters.append(CRMEmail.contact_id == contact_id)
        if deal_id:
            filters.append(CRMEmail.deal_id == deal_id)
        if direction:
            filters.append(CRMEmail.direction == direction)
        if status:
            filters.append(CRMEmail.status == status)
        if thread_id:
            filters.append(CRMEmail.thread_id == thread_id)
        if sequence_id:
            filters.append(CRMEmail.sequence_id == sequence_id)
        if query:
            filters.append(col(CRMEmail.subject).ilike(f"%{query}%"))

        sort_map = {
            "created_at": CRMEmail.created_at,
            "sent_at": CRMEmail.sent_at,
            "received_at": CRMEmail.received_at,
            "subject": CRMEmail.subject,
        }
        sort_col = sort_map.get(sort_by, CRMEmail.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(filters=filters, cursor=cursor, limit=limit, order_by=order)

    async def get_for_contact(self, contact_id: str) -> Sequence[CRMEmail]:
        """Get all emails for a specific contact, newest first."""
        result = await self._session.execute(
            select(CRMEmail)
            .where(CRMEmail.contact_id == contact_id)
            .order_by(CRMEmail.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_thread(self, thread_id: str) -> Sequence[CRMEmail]:
        """Get all emails in a thread, oldest first."""
        result = await self._session.execute(
            select(CRMEmail)
            .where(CRMEmail.thread_id == thread_id)
            .order_by(CRMEmail.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_for_sequence(self, sequence_id: str) -> Sequence[CRMEmail]:
        """Get all emails sent by a specific sequence."""
        result = await self._session.execute(
            select(CRMEmail)
            .where(CRMEmail.sequence_id == sequence_id)
            .order_by(CRMEmail.created_at.desc())
        )
        return list(result.scalars().all())
