"""CRM Smart Lists API — CRUD, members, refresh, lookalike generation."""

from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_smart_list_service
from app.services.crm_smart_list_service import SmartListService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-smart-lists"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SmartListCriteriaBody(BaseModel):
    field: str
    operator: str = "equals"
    value: Any = None
    conjunction: str = "and"


class SmartListCreateBody(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    criteria: List[SmartListCriteriaBody] = Field(default_factory=list)
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    columns: List[str] = Field(default_factory=lambda: ["name", "email", "company", "stage"])
    is_shared: bool = False
    auto_refresh: bool = True


class SmartListUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    criteria: Optional[List[SmartListCriteriaBody]] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    columns: Optional[List[str]] = None
    is_shared: Optional[bool] = None
    auto_refresh: Optional[bool] = None


class SmartListResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    criteria: list[dict[str, Any]] = []
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    columns: list[str] = []
    is_shared: bool = False
    auto_refresh: bool = True
    member_count: int = 0
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, sl: Any) -> "SmartListResponse":
        return cls(
            id=sl.id,
            name=sl.name,
            description=sl.description,
            criteria=sl.criteria or [],
            sort_by=sl.sort_by,
            sort_order=sl.sort_order or "desc",
            columns=sl.columns or [],
            is_shared=sl.is_shared,
            auto_refresh=sl.auto_refresh,
            member_count=sl.member_count,
            created_by=sl.created_by,
            created_at=sl.created_at.isoformat() if sl.created_at else None,
            updated_at=sl.updated_at.isoformat() if sl.updated_at else None,
        )


class ContactResponse(BaseModel):
    """Minimal contact representation for smart list members."""
    id: str
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    stage: Optional[str] = None
    lead_score: Optional[int] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, c: Any) -> "ContactResponse":
        return cls(
            id=c.id,
            name=c.name,
            first_name=c.first_name,
            last_name=c.last_name,
            email=c.email,
            phone=c.phone,
            company=c.company,
            title=c.title,
            stage=c.stage,
            lead_score=c.lead_score,
            created_at=c.created_at.isoformat() if c.created_at else None,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/smart-lists", status_code=status.HTTP_201_CREATED)
async def create_smart_list(
    body: SmartListCreateBody,
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new smart list with criteria-based membership."""
    data = body.model_dump()
    data["criteria"] = [c.model_dump() for c in body.criteria]
    smart_list = await svc.create_smart_list(data, user_id)
    return success_response(SmartListResponse.from_model(smart_list))


@router.get("/smart-lists")
async def list_smart_lists(
    is_shared: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """List smart lists with optional filters."""
    page = await svc.list_smart_lists(
        is_shared=is_shared, query=search, cursor=cursor, limit=limit
    )
    return success_response({
        "items": [SmartListResponse.from_model(sl).model_dump(mode="json") for sl in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/smart-lists/{list_id}")
async def get_smart_list(
    list_id: str,
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single smart list by ID."""
    smart_list = await svc.get_smart_list(list_id)
    if not smart_list:
        raise ApiError(status_code=404, detail="Smart list not found")
    return success_response(SmartListResponse.from_model(smart_list))


@router.put("/smart-lists/{list_id}")
async def update_smart_list(
    list_id: str,
    body: SmartListUpdateBody,
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Update a smart list."""
    data = body.model_dump(exclude_unset=True)
    if "criteria" in data and body.criteria:
        data["criteria"] = [c.model_dump() for c in body.criteria]
    smart_list = await svc.update_smart_list(list_id, data)
    return success_response(SmartListResponse.from_model(smart_list))


@router.delete("/smart-lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_smart_list(
    list_id: str,
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Delete a smart list."""
    deleted = await svc.delete_smart_list(list_id)
    if not deleted:
        raise ApiError(status_code=404, detail="Smart list not found")


@router.get("/smart-lists/{list_id}/members")
async def get_smart_list_members(
    list_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Get contacts matching the smart list criteria (paginated)."""
    page = await svc.get_members(list_id, cursor=cursor, limit=limit)
    return success_response({
        "items": [ContactResponse.from_model(c).model_dump(mode="json") for c in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.post("/smart-lists/{list_id}/refresh")
async def refresh_smart_list(
    list_id: str,
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Force re-evaluation of smart list membership count."""
    smart_list = await svc.refresh_member_count(list_id)
    return success_response(SmartListResponse.from_model(smart_list))


@router.post("/smart-lists/{list_id}/lookalike")
async def generate_lookalike(
    list_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    svc: SmartListService = Depends(get_smart_list_service),
    user_id: str = Depends(get_current_user),
):
    """Generate lookalike contacts based on smart list member traits."""
    contacts = await svc.generate_lookalike(list_id, limit=limit)
    return success_response({
        "items": [ContactResponse.from_model(c).model_dump(mode="json") for c in contacts],
        "count": len(contacts),
    })
