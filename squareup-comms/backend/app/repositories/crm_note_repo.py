"""Repository for CRM notes with contact-scoped queries."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm_note import CRMNote
from app.repositories.base import BaseRepository


class NoteRepository(BaseRepository[CRMNote]):
    """Data-access layer for CRM notes."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMNote, session)

    async def list_for_contact(
        self,
        contact_id: str,
        *,
        limit: int = 50,
    ) -> list[CRMNote]:
        """List notes for a contact, pinned first then newest."""
        stmt = (
            select(CRMNote)
            .where(CRMNote.contact_id == contact_id)
            .order_by(CRMNote.is_pinned.desc(), CRMNote.created_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
