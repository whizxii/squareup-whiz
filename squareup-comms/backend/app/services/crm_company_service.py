"""Company service — business logic for CRM companies."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Sequence

from app.models.crm import CRMContact
from app.models.crm_audit import CRMAuditLog
from app.models.crm_company import CRMCompany
from app.repositories.crm_company_repo import CompanyRepository
from app.services.base import BaseService


class CompanyService(BaseService):
    """Business logic for company operations."""

    @property
    def repo(self) -> CompanyRepository:
        return CompanyRepository(self.session)

    async def create_company(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMCompany:
        """Create a new company with audit logging."""
        now = datetime.now(timezone.utc)

        social = data.pop("social_profiles", {})
        enrichment = data.pop("enrichment_data", {})

        company = CRMCompany(
            name=data["name"],
            domain=data.get("domain"),
            industry=data.get("industry"),
            size=data.get("size"),
            website=data.get("website"),
            logo_url=data.get("logo_url"),
            description=data.get("description"),
            social_profiles=json.dumps(social) if social else "{}",
            annual_revenue=data.get("annual_revenue"),
            employee_count=data.get("employee_count"),
            enrichment_data=json.dumps(enrichment) if enrichment else "{}",
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        company = await self.repo.create(company)

        audit = CRMAuditLog(
            entity_type="company",
            entity_id=company.id,
            action="create",
            changes=json.dumps({"name": company.name}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("company.created", {
            "company_id": company.id,
            "name": company.name,
        })

        return company

    async def update_company(
        self,
        company_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMCompany | None:
        """Update a company with audit logging."""
        company = await self.repo.get_by_id(company_id)
        if company is None:
            return None

        now = datetime.now(timezone.utc)
        changes: dict[str, dict[str, Any]] = {}

        # Convert nested dicts to JSON strings
        for json_field in ("social_profiles", "enrichment_data"):
            if json_field in updates and isinstance(updates[json_field], dict):
                updates[json_field] = json.dumps(updates[json_field])

        for field, value in updates.items():
            old_value = getattr(company, field, None)
            if old_value != value:
                changes[field] = {"old": str(old_value), "new": str(value)}

        updates["updated_at"] = now
        company = await self.repo.update(company, updates)

        if changes:
            audit = CRMAuditLog(
                entity_type="company",
                entity_id=company_id,
                action="update",
                changes=json.dumps(changes),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        await self.events.emit("company.updated", {"company_id": company_id})
        return company

    async def archive_company(self, company_id: str, user_id: str) -> bool:
        """Soft-delete a company."""
        company = await self.repo.get_by_id(company_id)
        if company is None:
            return False

        await self.repo.update(company, {
            "is_archived": True,
            "updated_at": datetime.now(timezone.utc),
        })

        audit = CRMAuditLog(
            entity_type="company",
            entity_id=company_id,
            action="delete",
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()
        return True

    async def get_with_contacts(self, company_id: str) -> tuple[CRMCompany | None, Sequence[CRMContact]]:
        """Get company with all associated contacts."""
        return await self.repo.get_with_contacts(company_id)
