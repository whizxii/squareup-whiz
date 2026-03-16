"""Recording repository — data access for CRM call recordings."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse
from app.models.crm_recording import CRMCallRecording
from app.repositories.base import BaseRepository


class RecordingRepository(BaseRepository[CRMCallRecording]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMCallRecording, session)

    async def search(
        self,
        *,
        contact_id: str | None = None,
        deal_id: str | None = None,
        transcription_status: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMCallRecording]:
        """Search recordings with filters and cursor pagination."""
        filters: list[Any] = []

        if contact_id:
            filters.append(CRMCallRecording.contact_id == contact_id)
        if deal_id:
            filters.append(CRMCallRecording.deal_id == deal_id)
        if transcription_status:
            filters.append(CRMCallRecording.transcription_status == transcription_status)

        sort_map = {
            "created_at": CRMCallRecording.created_at,
            "duration_seconds": CRMCallRecording.duration_seconds,
            "title": CRMCallRecording.title,
        }
        sort_col = sort_map.get(sort_by, CRMCallRecording.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(
            filters=filters, cursor=cursor, limit=limit, order_by=order
        )

    async def get_for_contact(
        self,
        contact_id: str,
        *,
        limit: int = 50,
    ) -> Sequence[CRMCallRecording]:
        """Get all recordings for a contact, newest first."""
        result = await self._session.execute(
            select(CRMCallRecording)
            .where(CRMCallRecording.contact_id == contact_id)
            .order_by(CRMCallRecording.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_pending_transcription(
        self,
        *,
        limit: int = 10,
    ) -> Sequence[CRMCallRecording]:
        """Get recordings awaiting transcription."""
        result = await self._session.execute(
            select(CRMCallRecording)
            .where(CRMCallRecording.transcription_status == "pending")
            .order_by(CRMCallRecording.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())
