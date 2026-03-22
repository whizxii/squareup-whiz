"""Repository for CRM tags with contact-tag association queries."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm_tag import CRMContactTag, CRMTag
from app.repositories.base import BaseRepository


class TagRepository(BaseRepository[CRMTag]):
    """Data-access layer for CRM tags."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMTag, session)

    async def list_all_sorted(self) -> list[CRMTag]:
        """List all tags sorted by name."""
        stmt = select(CRMTag).order_by(CRMTag.name.asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_contact_tags(self, contact_id: str) -> list[CRMTag]:
        """Get all tags for a contact."""
        stmt = (
            select(CRMTag)
            .join(CRMContactTag, CRMContactTag.tag_id == CRMTag.id)
            .where(CRMContactTag.contact_id == contact_id)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_contact_tag_link(
        self, contact_id: str, tag_id: str
    ) -> CRMContactTag | None:
        """Find a specific contact-tag association."""
        stmt = select(CRMContactTag).where(
            CRMContactTag.contact_id == contact_id,
            CRMContactTag.tag_id == tag_id,
        )
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def delete_all_associations(self, tag_id: str) -> None:
        """Remove all contact-tag associations for a tag."""
        stmt = select(CRMContactTag).where(CRMContactTag.tag_id == tag_id)
        result = await self._session.execute(stmt)
        for assoc in result.scalars().all():
            await self._session.delete(assoc)
