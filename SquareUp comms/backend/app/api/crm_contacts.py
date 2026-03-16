"""CRM Contacts API — new service-backed contact endpoints."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.api.deps import get_contact_service
from app.services.crm_contact_service import ContactService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-contacts"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ContactCreateBody(BaseModel):
    name: str = Field(..., max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    company_id: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=200)
    stage: Optional[str] = Field(default="lead", max_length=50)
    lifecycle_stage: Optional[str] = Field(default="lead", max_length=50)
    value: Optional[float] = None
    currency: Optional[str] = Field(default="INR", max_length=3)
    source: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = None
    owner_id: Optional[str] = None


class ContactUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    company_id: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=200)
    stage: Optional[str] = Field(default=None, max_length=50)
    lifecycle_stage: Optional[str] = Field(default=None, max_length=50)
    value: Optional[float] = None
    currency: Optional[str] = Field(default=None, max_length=3)
    source: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    owner_id: Optional[str] = None
    avatar_url: Optional[str] = None
    last_contacted_at: Optional[datetime] = None
    next_follow_up_at: Optional[datetime] = None
    follow_up_note: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    company_id: Optional[str] = None
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    stage: str
    lifecycle_stage: Optional[str] = None
    stage_changed_at: Optional[datetime] = None
    value: Optional[float] = None
    currency: str = "INR"
    source: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    owner_id: Optional[str] = None
    lead_score: int = 0
    relationship_strength: int = 0
    activity_count: int = 0
    last_activity_at: Optional[datetime] = None
    is_archived: bool = False
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, contact: Any) -> "ContactResponse":
        tags_list: List[str] = []
        if contact.tags:
            try:
                tags_list = json.loads(contact.tags)
            except (json.JSONDecodeError, TypeError):
                tags_list = []
        return cls(
            id=contact.id,
            name=contact.name,
            email=contact.email,
            phone=contact.phone,
            company=contact.company,
            company_id=contact.company_id,
            title=contact.title,
            avatar_url=contact.avatar_url,
            stage=contact.stage,
            lifecycle_stage=contact.lifecycle_stage,
            stage_changed_at=contact.stage_changed_at,
            value=contact.value,
            currency=contact.currency or "INR",
            source=contact.source,
            tags=tags_list,
            notes=contact.notes,
            owner_id=contact.owner_id,
            lead_score=contact.lead_score or 0,
            relationship_strength=contact.relationship_strength or 0,
            activity_count=contact.activity_count or 0,
            last_activity_at=contact.last_activity_at,
            is_archived=contact.is_archived or False,
            created_by=contact.created_by,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/contacts",
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(
    body: ContactCreateBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new CRM contact with audit logging."""
    data = body.model_dump(exclude_unset=True)
    contact = await svc.create_contact(data, user_id)
    return success_response(ContactResponse.from_model(contact))


@router.get("/contacts")
async def list_contacts(
    stage: Optional[str] = Query(default=None),
    company_id: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    owner_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    is_archived: bool = Query(default=False),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """List contacts with filters, search, sorting, and cursor pagination."""
    page = await svc.repo.search(
        query=search,
        stage=stage,
        company_id=company_id,
        source=source,
        owner_id=owner_id,
        is_archived=is_archived,
        cursor=cursor,
        limit=limit,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return success_response({
        "items": [ContactResponse.from_model(c).model_dump(mode="json") for c in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/contacts/{contact_id}")
async def get_contact(
    contact_id: str,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single contact."""
    contact = await svc.repo.get_by_id(contact_id)
    if contact is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(ContactResponse.from_model(contact))


@router.get("/contacts/{contact_id}/360")
async def get_contact_360(
    contact_id: str,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Full Contact 360 — contact + company + tags + activities + notes."""
    data = await svc.get_360(contact_id)
    if data is None:
        raise ApiError(status_code=404, detail="Contact not found")

    result: dict[str, Any] = {
        "contact": ContactResponse.from_model(data["contact"]).model_dump(mode="json"),
    }

    if data.get("company"):
        from app.api.crm_companies import CompanyResponse
        result["company"] = CompanyResponse.from_model(data["company"]).model_dump(mode="json")
    else:
        result["company"] = None

    result["tags"] = [{"id": t.id, "name": t.name, "color": t.color} for t in data.get("tags", [])]
    result["activities"] = [
        {
            "id": a.id,
            "type": a.type,
            "title": a.title,
            "content": a.content,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "performed_by": a.performed_by,
        }
        for a in data.get("activities", [])
    ]
    result["notes"] = [
        {
            "id": n.id,
            "content": n.content,
            "is_pinned": n.is_pinned,
            "created_by": n.created_by,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in data.get("notes", [])
    ]
    return success_response(result)


@router.put("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdateBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Update a contact with audit logging."""
    updates = body.model_dump(exclude_unset=True)
    contact = await svc.update_contact(contact_id, updates, user_id)
    if contact is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(ContactResponse.from_model(contact))


@router.delete(
    "/contacts/{contact_id}",
    status_code=status.HTTP_200_OK,
)
async def archive_contact(
    contact_id: str,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Soft-delete (archive) a contact."""
    ok = await svc.archive_contact(contact_id, user_id)
    if not ok:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response({"archived": True})


@router.post("/contacts/{contact_id}/restore")
async def restore_contact(
    contact_id: str,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Unarchive a contact."""
    contact = await svc.restore_contact(contact_id, user_id)
    if contact is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(ContactResponse.from_model(contact))


@router.get("/contacts/{contact_id}/duplicates")
async def find_duplicates(
    contact_id: str,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Find potential duplicate contacts for a given contact."""
    contact = await svc.repo.get_by_id(contact_id)
    if contact is None:
        raise ApiError(status_code=404, detail="Contact not found")

    dupes = await svc.find_duplicates(
        name=contact.name,
        email=contact.email,
        phone=contact.phone,
    )
    # Exclude the source contact from results
    dupes = [d for d in dupes if d.id != contact_id]
    return success_response([ContactResponse.from_model(d).model_dump(mode="json") for d in dupes])


@router.get("/search")
async def unified_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50),
    svc: ContactService = Depends(get_contact_service),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Unified search across contacts and companies."""
    from app.repositories.crm_company_repo import CompanyRepository
    from app.api.crm_companies import CompanyResponse

    contacts_page = await svc.repo.search(query=q, limit=limit)
    company_repo = CompanyRepository(session)
    companies_page = await company_repo.search(query=q, limit=limit)

    return success_response({
        "contacts": [ContactResponse.from_model(c).model_dump(mode="json") for c in contacts_page.items],
        "companies": [CompanyResponse.from_model(c).model_dump(mode="json") for c in companies_page.items],
    })
