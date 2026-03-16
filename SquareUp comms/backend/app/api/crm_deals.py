"""CRM Deals API — deal CRUD, stage management, pipeline views."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_deal_service
from app.services.crm_deal_service import DealService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-deals"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class DealCreateBody(BaseModel):
    title: str = Field(..., max_length=300)
    contact_id: str
    company_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    stage: Optional[str] = Field(default="lead", max_length=100)
    value: Optional[float] = None
    currency: str = Field(default="INR", max_length=3)
    probability: Optional[int] = Field(default=None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    owner_id: Optional[str] = None


class DealUpdateBody(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = Field(default=None, max_length=3)
    probability: Optional[int] = Field(default=None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    owner_id: Optional[str] = None


class StageChangeBody(BaseModel):
    stage: str = Field(..., max_length=100)


class LoseDealBody(BaseModel):
    reason: str = Field(..., max_length=100)
    detail: Optional[str] = None


class DealResponse(BaseModel):
    id: str
    title: str
    contact_id: str
    company_id: Optional[str] = None
    pipeline_id: str
    stage: str
    value: Optional[float] = None
    currency: str = "INR"
    probability: int = 0
    expected_close_date: Optional[datetime] = None
    actual_close_date: Optional[datetime] = None
    status: str = "open"
    loss_reason: Optional[str] = None
    loss_reason_detail: Optional[str] = None
    owner_id: Optional[str] = None
    stage_entered_at: Optional[datetime] = None
    deal_health: str = "green"
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, deal: Any) -> "DealResponse":
        return cls(
            id=deal.id,
            title=deal.title,
            contact_id=deal.contact_id,
            company_id=deal.company_id,
            pipeline_id=deal.pipeline_id,
            stage=deal.stage,
            value=deal.value,
            currency=deal.currency or "INR",
            probability=deal.probability or 0,
            expected_close_date=deal.expected_close_date,
            actual_close_date=deal.actual_close_date,
            status=deal.status or "open",
            loss_reason=deal.loss_reason,
            loss_reason_detail=deal.loss_reason_detail,
            owner_id=deal.owner_id,
            stage_entered_at=deal.stage_entered_at,
            deal_health=deal.deal_health or "green",
            created_by=deal.created_by,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/deals",
    status_code=status.HTTP_201_CREATED,
)
async def create_deal(
    body: DealCreateBody,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new deal with auto-probability from pipeline stage."""
    data = body.model_dump(exclude_unset=True)
    deal = await svc.create_deal(data, user_id)
    return success_response(DealResponse.from_model(deal))


@router.get("/deals")
async def list_deals(
    pipeline_id: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    owner_id: Optional[str] = Query(default=None),
    contact_id: Optional[str] = Query(default=None),
    company_id: Optional[str] = Query(default=None),
    value_min: Optional[float] = Query(default=None),
    value_max: Optional[float] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """List deals with filters, search, sorting, and cursor pagination."""
    page = await svc.repo.search(
        pipeline_id=pipeline_id,
        stage=stage,
        status=status_filter,
        owner_id=owner_id,
        contact_id=contact_id,
        company_id=company_id,
        value_min=value_min,
        value_max=value_max,
        query=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        cursor=cursor,
        limit=limit,
    )
    return success_response({
        "items": [DealResponse.from_model(d).model_dump(mode="json") for d in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/deals/stale")
async def get_stale_deals(
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get deals past their stage SLA with no recent activity."""
    deals = await svc.get_stale_deals()
    return success_response([
        DealResponse.from_model(d).model_dump(mode="json") for d in deals
    ])


@router.get("/deals/pipeline/{pipeline_id}")
async def get_pipeline_deals(
    pipeline_id: str,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get deals grouped by stage for kanban view."""
    grouped = await svc.get_pipeline_deals(pipeline_id)
    result: dict[str, Any] = {}
    for stage_id, deals in grouped.items():
        result[stage_id] = [DealResponse.from_model(d).model_dump(mode="json") for d in deals]
    return success_response(result)


@router.get("/deals/pipeline/{pipeline_id}/stats")
async def get_pipeline_stats(
    pipeline_id: str,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get aggregate stats for a pipeline."""
    stats = await svc.repo.get_pipeline_stats(pipeline_id)
    return success_response(stats)


@router.get("/deals/{deal_id}")
async def get_deal(
    deal_id: str,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single deal."""
    deal = await svc.repo.get_by_id(deal_id)
    if deal is None:
        raise ApiError(status_code=404, detail="Deal not found")
    return success_response(DealResponse.from_model(deal))


@router.put("/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    body: DealUpdateBody,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Update a deal with audit logging."""
    updates = body.model_dump(exclude_unset=True)
    deal = await svc.update_deal(deal_id, updates, user_id)
    if deal is None:
        raise ApiError(status_code=404, detail="Deal not found")
    return success_response(DealResponse.from_model(deal))


@router.put("/deals/{deal_id}/stage")
async def move_deal_stage(
    deal_id: str,
    body: StageChangeBody,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Move a deal to a new pipeline stage."""
    deal = await svc.move_stage(deal_id, body.stage, user_id)
    if deal is None:
        raise ApiError(status_code=404, detail="Deal not found")
    return success_response(DealResponse.from_model(deal))


@router.put("/deals/{deal_id}/win")
async def win_deal(
    deal_id: str,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Mark a deal as won."""
    deal = await svc.win_deal(deal_id, user_id)
    if deal is None:
        raise ApiError(status_code=404, detail="Deal not found")
    return success_response(DealResponse.from_model(deal))


@router.put("/deals/{deal_id}/lose")
async def lose_deal(
    deal_id: str,
    body: LoseDealBody,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Mark a deal as lost with a reason."""
    deal = await svc.lose_deal(deal_id, body.reason, body.detail, user_id)
    if deal is None:
        raise ApiError(status_code=404, detail="Deal not found")
    return success_response(DealResponse.from_model(deal))


@router.get("/contacts/{contact_id}/deals")
async def get_deals_for_contact(
    contact_id: str,
    svc: DealService = Depends(get_deal_service),
    user_id: str = Depends(get_current_user),
):
    """Get all deals for a contact."""
    deals = await svc.get_deals_for_contact(contact_id)
    return success_response([
        DealResponse.from_model(d).model_dump(mode="json") for d in deals
    ])
