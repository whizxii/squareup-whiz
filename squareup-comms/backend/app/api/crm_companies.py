"""CRM Companies API — company CRUD with service layer."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_company_service, get_deal_service
from app.services.crm_company_service import CompanyService
from app.services.crm_deal_service import DealService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-companies"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CompanyCreateBody(BaseModel):
    name: str = Field(..., max_length=200)
    domain: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=100)
    size: Optional[str] = Field(default=None, max_length=20)
    website: Optional[str] = Field(default=None, max_length=500)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    social_profiles: Optional[dict] = Field(default_factory=dict)
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None
    enrichment_data: Optional[dict] = Field(default_factory=dict)


class CompanyUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    domain: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=100)
    size: Optional[str] = Field(default=None, max_length=20)
    website: Optional[str] = Field(default=None, max_length=500)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    social_profiles: Optional[dict] = None
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None
    enrichment_data: Optional[dict] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    social_profiles: dict = {}
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None
    enrichment_data: dict = {}
    is_archived: bool = False
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, company: Any) -> "CompanyResponse":
        social: dict = {}
        if company.social_profiles:
            try:
                social = json.loads(company.social_profiles)
            except (json.JSONDecodeError, TypeError):
                social = {}

        enrichment: dict = {}
        if company.enrichment_data:
            try:
                enrichment = json.loads(company.enrichment_data)
            except (json.JSONDecodeError, TypeError):
                enrichment = {}

        return cls(
            id=company.id,
            name=company.name,
            domain=company.domain,
            industry=company.industry,
            size=company.size,
            website=company.website,
            logo_url=company.logo_url,
            description=company.description,
            social_profiles=social,
            annual_revenue=company.annual_revenue,
            employee_count=company.employee_count,
            enrichment_data=enrichment,
            is_archived=company.is_archived or False,
            created_by=company.created_by,
            created_at=company.created_at,
            updated_at=company.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/companies",
    status_code=status.HTTP_201_CREATED,
)
async def create_company(
    body: CompanyCreateBody,
    svc: CompanyService = Depends(get_company_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new CRM company."""
    data = body.model_dump(exclude_unset=True)
    company = await svc.create_company(data, user_id)
    return success_response(CompanyResponse.from_model(company))


@router.get("/companies")
async def list_companies(
    search: Optional[str] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    is_archived: bool = Query(default=False),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: CompanyService = Depends(get_company_service),
    user_id: str = Depends(get_current_user),
):
    """List companies with filters and cursor pagination."""
    page = await svc.repo.search(
        query=search,
        industry=industry,
        is_archived=is_archived,
        cursor=cursor,
        limit=limit,
    )
    return success_response({
        "items": [CompanyResponse.from_model(c).model_dump(mode="json") for c in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/companies/{company_id}")
async def get_company(
    company_id: str,
    svc: CompanyService = Depends(get_company_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single company."""
    company = await svc.repo.get_by_id(company_id)
    if company is None:
        raise ApiError(status_code=404, detail="Company not found")
    return success_response(CompanyResponse.from_model(company))


@router.get("/companies/{company_id}/contacts")
async def get_company_contacts(
    company_id: str,
    svc: CompanyService = Depends(get_company_service),
    user_id: str = Depends(get_current_user),
):
    """Get a company with all associated contacts."""
    company, contacts = await svc.get_with_contacts(company_id)
    if company is None:
        raise ApiError(status_code=404, detail="Company not found")

    from app.api.crm_contacts import ContactResponse

    return success_response({
        "company": CompanyResponse.from_model(company).model_dump(mode="json"),
        "contacts": [ContactResponse.from_model(c).model_dump(mode="json") for c in contacts],
    })


@router.put("/companies/{company_id}")
async def update_company(
    company_id: str,
    body: CompanyUpdateBody,
    svc: CompanyService = Depends(get_company_service),
    user_id: str = Depends(get_current_user),
):
    """Update a company with audit logging."""
    updates = body.model_dump(exclude_unset=True)
    company = await svc.update_company(company_id, updates, user_id)
    if company is None:
        raise ApiError(status_code=404, detail="Company not found")
    return success_response(CompanyResponse.from_model(company))


@router.delete(
    "/companies/{company_id}",
    status_code=status.HTTP_200_OK,
)
async def archive_company(
    company_id: str,
    svc: CompanyService = Depends(get_company_service),
    user_id: str = Depends(get_current_user),
):
    """Soft-delete (archive) a company."""
    ok = await svc.archive_company(company_id, user_id)
    if not ok:
        raise ApiError(status_code=404, detail="Company not found")
    return success_response({"archived": True})


# ---------------------------------------------------------------------------
# Company Deals
# ---------------------------------------------------------------------------


@router.get("/companies/{company_id}/deals")
async def get_company_deals(
    company_id: str,
    svc: CompanyService = Depends(get_company_service),
    deal_svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get all deals associated with a company."""
    company = await svc.repo.get_by_id(company_id)
    if company is None:
        raise ApiError(status_code=404, detail="Company not found")

    from app.api.crm_deals import DealResponse

    page = await deal_svc.repo.search(company_id=company_id, limit=200)
    return success_response([
        DealResponse.from_model(d).model_dump(mode="json") for d in page.items
    ])


# ---------------------------------------------------------------------------
# Company 360 — aggregated intelligence view
# ---------------------------------------------------------------------------


@router.get("/companies/{company_id}/360")
async def get_company_360(
    company_id: str,
    svc: CompanyService = Depends(get_company_service),
    deal_svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get full company intelligence: company + contacts + deals + pipeline summary."""
    company, contacts = await svc.get_with_contacts(company_id)
    if company is None:
        raise ApiError(status_code=404, detail="Company not found")

    from app.api.crm_contacts import ContactResponse
    from app.api.crm_deals import DealResponse

    page = await deal_svc.repo.search(company_id=company_id, limit=200)
    deals = page.items

    # Pipeline summary
    open_deals = [d for d in deals if d.status == "open"]
    won_deals = [d for d in deals if d.status == "won"]
    lost_deals = [d for d in deals if d.status == "lost"]

    total_pipeline_value = sum(d.value or 0 for d in open_deals)
    total_won_value = sum(d.value or 0 for d in won_deals)
    avg_deal_value = (
        total_pipeline_value / len(open_deals) if open_deals else 0
    )

    pipeline_summary = {
        "total_pipeline_value": total_pipeline_value,
        "total_won_value": total_won_value,
        "avg_deal_value": round(avg_deal_value, 2),
        "open_count": len(open_deals),
        "won_count": len(won_deals),
        "lost_count": len(lost_deals),
        "total_count": len(deals),
        "win_rate": (
            round(len(won_deals) / (len(won_deals) + len(lost_deals)) * 100, 1)
            if (won_deals or lost_deals)
            else 0
        ),
    }

    # Contact summary
    contact_count = len(contacts)
    avg_lead_score = (
        round(
            sum(c.lead_score or 0 for c in contacts) / contact_count, 1
        )
        if contact_count
        else 0
    )

    return success_response({
        "company": CompanyResponse.from_model(company).model_dump(mode="json"),
        "contacts": [
            ContactResponse.from_model(c).model_dump(mode="json")
            for c in contacts
        ],
        "deals": [
            DealResponse.from_model(d).model_dump(mode="json") for d in deals
        ],
        "pipeline_summary": pipeline_summary,
        "contact_summary": {
            "total_count": contact_count,
            "avg_lead_score": avg_lead_score,
        },
    })
