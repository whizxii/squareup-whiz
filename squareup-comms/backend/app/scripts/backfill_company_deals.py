"""One-time backfill script: link contacts → companies and create missing deals.

Finds all contacts that have a company name but no company_id, then:
1. Finds or creates a CRMCompany by name (case-insensitive).
2. Sets contact.company_id.
3. Creates a CRMDeal if no deal exists for that contact.

Usage:
    python3 -m app.scripts.backfill_company_deals
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import func, select

from app.core.db import async_session
from app.models.crm import CRMContact
from app.models.crm_company import CRMCompany
from app.models.crm_deal import CRMDeal
from app.models.crm_pipeline import CRMPipeline


async def backfill() -> None:
    async with async_session() as session:
        # Find default pipeline
        pipeline_result = await session.execute(
            select(CRMPipeline).where(
                CRMPipeline.is_default == True,  # noqa: E712
                CRMPipeline.is_archived == False,  # noqa: E712
            ).limit(1)
        )
        default_pipeline = pipeline_result.scalars().first()
        if not default_pipeline:
            print("WARNING: No default pipeline found. Deals will NOT be created.")

        # Find contacts with company text but no company_id
        result = await session.execute(
            select(CRMContact).where(
                CRMContact.company.isnot(None),
                CRMContact.company != "",
                CRMContact.company_id.is_(None),
                CRMContact.is_archived == False,  # noqa: E712
            )
        )
        contacts = list(result.scalars().all())
        print(f"Found {len(contacts)} contacts with company text but no company_id")

        if not contacts:
            print("Nothing to backfill.")
            return

        now = datetime.utcnow()
        companies_created = 0
        companies_linked = 0
        deals_created = 0

        # Cache: lowercase company name → CRMCompany
        company_cache: dict[str, CRMCompany] = {}

        for contact in contacts:
            company_name = (contact.company or "").strip()
            if not company_name:
                continue

            key = company_name.lower()

            # Find or create company
            if key not in company_cache:
                existing = await session.execute(
                    select(CRMCompany).where(
                        func.lower(CRMCompany.name) == key,
                        CRMCompany.is_archived == False,  # noqa: E712
                    ).limit(1)
                )
                company = existing.scalars().first()
                if not company:
                    company = CRMCompany(
                        id=str(uuid.uuid4()),
                        name=company_name,
                        created_by=contact.created_by or "backfill",
                        created_at=now,
                        updated_at=now,
                    )
                    session.add(company)
                    await session.flush()
                    companies_created += 1
                company_cache[key] = company

            company = company_cache[key]
            contact.company_id = company.id
            contact.updated_at = now
            companies_linked += 1

            # Create deal if none exists for this contact
            if default_pipeline:
                deal_check = await session.execute(
                    select(CRMDeal.id).where(
                        CRMDeal.contact_id == contact.id
                    ).limit(1)
                )
                if not deal_check.scalars().first():
                    deal = CRMDeal(
                        id=str(uuid.uuid4()),
                        title=f"Deal — {contact.name}",
                        contact_id=contact.id,
                        company_id=company.id,
                        pipeline_id=default_pipeline.id,
                        stage=contact.stage or "lead",
                        status="open",
                        owner_id=contact.owner_id or contact.created_by,
                        created_by=contact.created_by or "backfill",
                        created_at=now,
                        updated_at=now,
                        stage_entered_at=now,
                    )
                    session.add(deal)
                    deals_created += 1

        await session.commit()
        print(f"Done! Companies created: {companies_created}, "
              f"Contacts linked: {companies_linked}, "
              f"Deals created: {deals_created}")


if __name__ == "__main__":
    asyncio.run(backfill())
