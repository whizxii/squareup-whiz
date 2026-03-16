"""Contact repository — data access for CRM contacts."""

from __future__ import annotations

import json
from typing import Any, Sequence

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse, paginate
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_company import CRMCompany
from app.models.crm_note import CRMNote
from app.models.crm_tag import CRMTag, CRMContactTag
from app.repositories.base import BaseRepository


class ContactRepository(BaseRepository[CRMContact]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMContact, session)

    async def search(
        self,
        *,
        query: str | None = None,
        stage: str | None = None,
        company_id: str | None = None,
        source: str | None = None,
        owner_id: str | None = None,
        is_archived: bool = False,
        cursor: str | None = None,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> PaginatedResponse[CRMContact]:
        """Search contacts with filters and cursor pagination."""
        filters: list[Any] = [CRMContact.is_archived == is_archived]

        if stage:
            filters.append(CRMContact.stage == stage)
        if company_id:
            filters.append(CRMContact.company_id == company_id)
        if source:
            filters.append(CRMContact.source == source)
        if owner_id:
            filters.append(CRMContact.owner_id == owner_id)
        if query:
            pattern = f"%{query}%"
            filters.append(
                or_(
                    col(CRMContact.name).ilike(pattern),
                    col(CRMContact.email).ilike(pattern),
                    col(CRMContact.company).ilike(pattern),
                    col(CRMContact.phone).ilike(pattern),
                )
            )

        sort_map = {
            "name": CRMContact.name,
            "created_at": CRMContact.created_at,
            "value": CRMContact.value,
            "lead_score": CRMContact.lead_score,
            "last_activity_at": CRMContact.last_activity_at,
        }
        sort_col = sort_map.get(sort_by, CRMContact.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        return await self.get_paginated(filters=filters, cursor=cursor, limit=limit, order_by=order)

    async def get_with_company(self, contact_id: str) -> tuple[CRMContact | None, CRMCompany | None]:
        """Fetch contact and its associated company."""
        contact = await self.get_by_id(contact_id)
        if contact is None:
            return None, None

        company = None
        if contact.company_id:
            result = await self._session.execute(
                select(CRMCompany).where(CRMCompany.id == contact.company_id)
            )
            company = result.scalars().first()

        return contact, company

    async def get_360(self, contact_id: str) -> dict[str, Any] | None:
        """Aggregate all related data for a contact 360 view."""
        contact = await self.get_by_id(contact_id)
        if contact is None:
            return None

        # Company
        company = None
        if contact.company_id:
            result = await self._session.execute(
                select(CRMCompany).where(CRMCompany.id == contact.company_id)
            )
            company = result.scalars().first()

        # Tags
        tag_result = await self._session.execute(
            select(CRMTag)
            .join(CRMContactTag, CRMContactTag.tag_id == CRMTag.id)
            .where(CRMContactTag.contact_id == contact_id)
        )
        tags = list(tag_result.scalars().all())

        # Recent activities (last 20)
        activity_result = await self._session.execute(
            select(CRMActivity)
            .where(CRMActivity.contact_id == contact_id)
            .order_by(CRMActivity.created_at.desc())
            .limit(20)
        )
        activities = list(activity_result.scalars().all())

        # Notes
        notes_result = await self._session.execute(
            select(CRMNote)
            .where(CRMNote.contact_id == contact_id)
            .order_by(CRMNote.is_pinned.desc(), CRMNote.created_at.desc())
            .limit(50)
        )
        notes = list(notes_result.scalars().all())

        return {
            "contact": contact,
            "company": company,
            "tags": tags,
            "activities": activities,
            "notes": notes,
        }

    async def find_duplicates(
        self, name: str | None = None, email: str | None = None, phone: str | None = None
    ) -> Sequence[CRMContact]:
        """Find potential duplicate contacts by name, email, or phone."""
        conditions = []
        if email:
            conditions.append(col(CRMContact.email).ilike(email))
        if phone:
            conditions.append(CRMContact.phone == phone)
        if name:
            conditions.append(col(CRMContact.name).ilike(f"%{name}%"))

        if not conditions:
            return []

        result = await self._session.execute(
            select(CRMContact)
            .where(or_(*conditions))
            .where(CRMContact.is_archived == False)  # noqa: E712
            .limit(10)
        )
        return list(result.scalars().all())

    async def get_tags_for_contact(self, contact_id: str) -> Sequence[CRMTag]:
        """Get all tags for a contact."""
        result = await self._session.execute(
            select(CRMTag)
            .join(CRMContactTag, CRMContactTag.tag_id == CRMTag.id)
            .where(CRMContactTag.contact_id == contact_id)
        )
        return list(result.scalars().all())

    async def add_tag(self, contact_id: str, tag_id: str) -> None:
        """Link a tag to a contact."""
        link = CRMContactTag(contact_id=contact_id, tag_id=tag_id)
        self._session.add(link)
        await self._session.commit()

    async def remove_tag(self, contact_id: str, tag_id: str) -> None:
        """Unlink a tag from a contact."""
        result = await self._session.execute(
            select(CRMContactTag).where(
                CRMContactTag.contact_id == contact_id,
                CRMContactTag.tag_id == tag_id,
            )
        )
        link = result.scalars().first()
        if link:
            await self._session.delete(link)
            await self._session.commit()
