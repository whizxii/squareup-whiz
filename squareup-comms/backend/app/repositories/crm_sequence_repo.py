"""Sequence repository — data access for email sequences and enrollments."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse
from app.models.crm_sequence import CRMEmailSequence, CRMSequenceEnrollment
from app.repositories.base import BaseRepository


class SequenceRepository(BaseRepository[CRMEmailSequence]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMEmailSequence, session)

    async def search(
        self,
        *,
        status: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMEmailSequence]:
        """Search sequences with filters and cursor pagination."""
        filters: list[Any] = []
        if status:
            filters.append(CRMEmailSequence.status == status)

        sort_map = {
            "created_at": CRMEmailSequence.created_at,
            "name": CRMEmailSequence.name,
            "total_enrolled": CRMEmailSequence.total_enrolled,
        }
        sort_col = sort_map.get(sort_by, CRMEmailSequence.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(filters=filters, cursor=cursor, limit=limit, order_by=order)


class EnrollmentRepository(BaseRepository[CRMSequenceEnrollment]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMSequenceEnrollment, session)

    async def get_for_sequence(
        self,
        sequence_id: str,
        *,
        status: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[CRMSequenceEnrollment]:
        """Get enrollments for a sequence with optional status filter."""
        filters: list[Any] = [CRMSequenceEnrollment.sequence_id == sequence_id]
        if status:
            filters.append(CRMSequenceEnrollment.status == status)

        return await self.get_paginated(
            filters=filters,
            cursor=cursor,
            limit=limit,
            order_by=CRMSequenceEnrollment.enrolled_at.desc(),
        )

    async def get_for_contact(self, contact_id: str) -> Sequence[CRMSequenceEnrollment]:
        """Get all enrollments for a contact."""
        result = await self._session.execute(
            select(CRMSequenceEnrollment)
            .where(CRMSequenceEnrollment.contact_id == contact_id)
            .order_by(CRMSequenceEnrollment.enrolled_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_for_contact(
        self, sequence_id: str, contact_id: str
    ) -> CRMSequenceEnrollment | None:
        """Check if a contact is already actively enrolled in a sequence."""
        result = await self._session.execute(
            select(CRMSequenceEnrollment).where(
                CRMSequenceEnrollment.sequence_id == sequence_id,
                CRMSequenceEnrollment.contact_id == contact_id,
                CRMSequenceEnrollment.status == "active",
            )
        )
        return result.scalars().first()

    async def get_due_enrollments(self) -> Sequence[CRMSequenceEnrollment]:
        """Get enrollments with next_send_at in the past (ready to send)."""
        from datetime import datetime

        now = datetime.utcnow()
        result = await self._session.execute(
            select(CRMSequenceEnrollment)
            .where(
                CRMSequenceEnrollment.status == "active",
                CRMSequenceEnrollment.next_send_at <= now,
            )
            .order_by(CRMSequenceEnrollment.next_send_at.asc())
        )
        return list(result.scalars().all())

    async def get_sequence_stats(self, sequence_id: str) -> dict[str, int]:
        """Get enrollment stats for a sequence."""
        result = await self._session.execute(
            select(
                CRMSequenceEnrollment.status,
                func.count(CRMSequenceEnrollment.id),
            )
            .where(CRMSequenceEnrollment.sequence_id == sequence_id)
            .group_by(CRMSequenceEnrollment.status)
        )
        stats: dict[str, int] = {"active": 0, "completed": 0, "replied": 0, "unenrolled": 0, "bounced": 0}
        for row in result.all():
            stats[row[0]] = row[1]
        return stats
