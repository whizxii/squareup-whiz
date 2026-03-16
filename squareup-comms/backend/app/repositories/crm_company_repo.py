"""Company repository — data access for CRM companies."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.pagination import PaginatedResponse
from app.models.crm import CRMContact
from app.models.crm_company import CRMCompany
from app.repositories.base import BaseRepository


class CompanyRepository(BaseRepository[CRMCompany]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMCompany, session)

    async def search(
        self,
        *,
        query: str | None = None,
        industry: str | None = None,
        is_archived: bool = False,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[CRMCompany]:
        """Search companies with filters and cursor pagination."""
        filters: list[Any] = [CRMCompany.is_archived == is_archived]

        if industry:
            filters.append(CRMCompany.industry == industry)
        if query:
            pattern = f"%{query}%"
            filters.append(
                or_(
                    col(CRMCompany.name).ilike(pattern),
                    col(CRMCompany.domain).ilike(pattern),
                )
            )

        return await self.get_paginated(filters=filters, cursor=cursor, limit=limit)

    async def get_with_contacts(self, company_id: str) -> tuple[CRMCompany | None, Sequence[CRMContact]]:
        """Fetch company and all associated contacts."""
        company = await self.get_by_id(company_id)
        if company is None:
            return None, []

        result = await self._session.execute(
            select(CRMContact)
            .where(CRMContact.company_id == company_id, CRMContact.is_archived == False)  # noqa: E712
            .order_by(CRMContact.name.asc())
        )
        contacts = list(result.scalars().all())
        return company, contacts

    async def search_by_domain(self, domain: str) -> CRMCompany | None:
        """Find a company by its domain (exact match, case-insensitive)."""
        result = await self._session.execute(
            select(CRMCompany).where(col(CRMCompany.domain).ilike(domain))
        )
        return result.scalars().first()
