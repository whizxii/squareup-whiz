"""CRM Relationship Graph API — returns nodes & edges for graph visualization."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import success_response
from app.models.crm import CRMContact
from app.models.crm_company import CRMCompany
from app.models.crm_deal import CRMDeal

router = APIRouter(prefix="/api/crm/v2", tags=["crm-graph"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _contact_health(contact: CRMContact) -> str:
    """Derive health label from relationship strength."""
    strength = contact.relationship_strength or 0
    if strength >= 7:
        return "good"
    if strength >= 4:
        return "warning"
    return "at_risk"


def _deal_health(deal: CRMDeal) -> str:
    """Map deal_health to a simplified health label."""
    raw = (deal.deal_health or "").lower()
    if raw in ("healthy", "good"):
        return "good"
    if raw in ("at_risk", "at-risk", "at risk"):
        return "at_risk"
    return "warning"


def _contact_node(contact: CRMContact) -> dict[str, Any]:
    return {
        "id": f"contact:{contact.id}",
        "type": "contact",
        "label": contact.name,
        "value": contact.lead_score or 0,
        "health": _contact_health(contact),
        "metadata": {
            "email": contact.email,
            "title": contact.title,
            "stage": contact.stage,
            "company": contact.company,
            "relationship_strength": contact.relationship_strength or 0,
            "lead_score": contact.lead_score or 0,
            "activity_count": contact.activity_count or 0,
        },
    }


def _company_node(company: CRMCompany, contact_count: int = 0) -> dict[str, Any]:
    return {
        "id": f"company:{company.id}",
        "type": "company",
        "label": company.name,
        "value": contact_count,
        "health": "good",
        "metadata": {
            "domain": company.domain,
            "industry": company.industry,
            "contact_count": contact_count,
        },
    }


def _deal_node(deal: CRMDeal) -> dict[str, Any]:
    return {
        "id": f"deal:{deal.id}",
        "type": "deal",
        "label": deal.title,
        "value": deal.value or 0,
        "health": _deal_health(deal),
        "metadata": {
            "stage": deal.stage,
            "value": deal.value,
            "currency": deal.currency or "INR",
            "probability": deal.probability or 0,
            "status": deal.status,
            "days_in_stage": (datetime.utcnow() - deal.stage_entered_at).days if deal.stage_entered_at else 0,
        },
    }


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.get("/graph")
async def get_relationship_graph(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
    limit: int = Query(default=100, ge=1, le=500),
    company_id: Optional[str] = Query(default=None),
):
    """Build a relationship graph from contacts, companies, and deals.

    Returns ``{nodes: [...], links: [...]}`` suitable for graph visualization.
    Optional ``company_id`` filter to scope the graph to a single company.
    """

    # ── Fetch contacts ────────────────────────────────────────────
    contact_stmt = (
        select(CRMContact)
        .where(CRMContact.is_archived == False)  # noqa: E712
        .order_by(CRMContact.activity_count.desc())
        .limit(limit)
    )
    if company_id:
        contact_stmt = contact_stmt.where(CRMContact.company_id == company_id)
    contacts = (await session.execute(contact_stmt)).scalars().all()

    # Collect company IDs referenced by contacts
    company_ids: set[str] = set()
    for c in contacts:
        if c.company_id:
            company_ids.add(c.company_id)
    if company_id:
        company_ids.add(company_id)

    # ── Fetch companies ───────────────────────────────────────────
    companies: list[CRMCompany] = []
    if company_ids:
        company_stmt = select(CRMCompany).where(CRMCompany.id.in_(list(company_ids)))
        companies = list((await session.execute(company_stmt)).scalars().all())

    # Count contacts per company
    company_contact_counts: dict[str, int] = {}
    for c in contacts:
        if c.company_id:
            company_contact_counts[c.company_id] = (
                company_contact_counts.get(c.company_id, 0) + 1
            )

    # ── Fetch deals ───────────────────────────────────────────────
    contact_ids = [c.id for c in contacts]
    deals: list[CRMDeal] = []
    if contact_ids:
        deal_stmt = (
            select(CRMDeal)
            .where(CRMDeal.contact_id.in_(contact_ids))
            .where(CRMDeal.status != "lost")
            .limit(limit)
        )
        deals = list((await session.execute(deal_stmt)).scalars().all())

    # ── Build nodes ───────────────────────────────────────────────
    nodes: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for company in companies:
        nid = f"company:{company.id}"
        if nid not in seen_ids:
            nodes.append(
                _company_node(company, company_contact_counts.get(company.id, 0))
            )
            seen_ids.add(nid)

    for contact in contacts:
        nid = f"contact:{contact.id}"
        if nid not in seen_ids:
            nodes.append(_contact_node(contact))
            seen_ids.add(nid)

    for deal in deals:
        nid = f"deal:{deal.id}"
        if nid not in seen_ids:
            nodes.append(_deal_node(deal))
            seen_ids.add(nid)

    # ── Build links ───────────────────────────────────────────────
    links: list[dict[str, Any]] = []

    for contact in contacts:
        if contact.company_id and f"company:{contact.company_id}" in seen_ids:
            links.append(
                {
                    "source": f"contact:{contact.id}",
                    "target": f"company:{contact.company_id}",
                    "type": "works_at",
                    "strength": contact.relationship_strength or 5,
                }
            )

    for deal in deals:
        if deal.contact_id and f"contact:{deal.contact_id}" in seen_ids:
            links.append(
                {
                    "source": f"deal:{deal.id}",
                    "target": f"contact:{deal.contact_id}",
                    "type": "involved_in",
                    "strength": 7,
                }
            )
        if deal.company_id and f"company:{deal.company_id}" in seen_ids:
            links.append(
                {
                    "source": f"deal:{deal.id}",
                    "target": f"company:{deal.company_id}",
                    "type": "belongs_to",
                    "strength": 6,
                }
            )

    return success_response({"nodes": nodes, "links": links})
