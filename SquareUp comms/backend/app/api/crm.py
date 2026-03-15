"""CRM API routes — contacts, activities, and pipeline management."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col

from app.core.db import get_session
from app.models.crm import CRMContact, CRMActivity

router = APIRouter(prefix="/api/crm", tags=["crm"])

# ---------------------------------------------------------------------------
# Valid enums
# ---------------------------------------------------------------------------

VALID_ACTIVITY_TYPES = {
    "call",
    "email",
    "meeting",
    "note",
    "deal_update",
    "agent_action",
    "follow_up",
}

PIPELINE_STAGES = [
    "lead",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
    "churned",
]

# ---------------------------------------------------------------------------
# Dev auth dependency
# ---------------------------------------------------------------------------


async def get_current_user_id(
    x_user_id: Optional[str] = Header(default="dev-user-001"),
) -> str:
    """Extract user ID from the X-User-Id header.

    Falls back to 'dev-user-001' during development.
    """
    return x_user_id or "dev-user-001"


# ---------------------------------------------------------------------------
# Request / Response schemas — Contacts
# ---------------------------------------------------------------------------


class ContactCreate(BaseModel):
    name: str = Field(..., max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    title: Optional[str] = Field(default=None, max_length=200)
    stage: Optional[str] = Field(default="lead", max_length=50)
    value: Optional[float] = None
    currency: Optional[str] = Field(default="INR", max_length=3)
    source: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    title: Optional[str] = Field(default=None, max_length=200)
    stage: Optional[str] = Field(default=None, max_length=50)
    value: Optional[float] = None
    currency: Optional[str] = Field(default=None, max_length=3)
    source: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    last_contacted_at: Optional[datetime] = None
    next_follow_up_at: Optional[datetime] = None
    follow_up_note: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    title: Optional[str]
    avatar_url: Optional[str]
    stage: str
    stage_changed_at: datetime
    value: Optional[float]
    currency: str
    source: Optional[str]
    tags: List[str]
    custom_fields: dict
    notes: Optional[str]
    last_contacted_at: Optional[datetime]
    next_follow_up_at: Optional[datetime]
    follow_up_note: Optional[str]
    created_by: Optional[str]
    created_by_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_contact(cls, contact: CRMContact) -> ContactResponse:
        """Build a response from a CRMContact ORM instance, deserialising JSON fields."""
        tags_list: List[str] = []
        if contact.tags:
            try:
                tags_list = json.loads(contact.tags)
            except (json.JSONDecodeError, TypeError):
                tags_list = []

        custom_fields_dict: dict = {}
        if contact.custom_fields:
            try:
                custom_fields_dict = json.loads(contact.custom_fields)
            except (json.JSONDecodeError, TypeError):
                custom_fields_dict = {}

        return cls(
            id=contact.id,
            name=contact.name,
            email=contact.email,
            phone=contact.phone,
            company=contact.company,
            title=contact.title,
            avatar_url=contact.avatar_url,
            stage=contact.stage,
            stage_changed_at=contact.stage_changed_at,
            value=contact.value,
            currency=contact.currency,
            source=contact.source,
            tags=tags_list,
            custom_fields=custom_fields_dict,
            notes=contact.notes,
            last_contacted_at=contact.last_contacted_at,
            next_follow_up_at=contact.next_follow_up_at,
            follow_up_note=contact.follow_up_note,
            created_by=contact.created_by,
            created_by_type=contact.created_by_type,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
        )


class ContactListResponse(BaseModel):
    contacts: List[ContactResponse]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Request / Response schemas — Activities
# ---------------------------------------------------------------------------


class ActivityCreate(BaseModel):
    type: str = Field(..., max_length=30)
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    activity_metadata: Optional[dict] = Field(default_factory=dict)


class ActivityResponse(BaseModel):
    id: str
    contact_id: str
    type: str
    title: Optional[str]
    content: Optional[str]
    activity_metadata: dict
    performed_by: Optional[str]
    performer_type: Optional[str]
    performer_name: Optional[str]
    message_id: Optional[str]
    agent_execution_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_activity(cls, activity: CRMActivity) -> ActivityResponse:
        """Build a response from a CRMActivity ORM instance, deserialising JSON fields."""
        metadata_dict: dict = {}
        if activity.activity_metadata:
            try:
                metadata_dict = json.loads(activity.activity_metadata)
            except (json.JSONDecodeError, TypeError):
                metadata_dict = {}

        return cls(
            id=activity.id,
            contact_id=activity.contact_id,
            type=activity.type,
            title=activity.title,
            content=activity.content,
            activity_metadata=metadata_dict,
            performed_by=activity.performed_by,
            performer_type=activity.performer_type,
            performer_name=activity.performer_name,
            message_id=activity.message_id,
            agent_execution_id=activity.agent_execution_id,
            created_at=activity.created_at,
        )


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Request / Response schemas — Pipeline
# ---------------------------------------------------------------------------


class StageUpdate(BaseModel):
    stage: str = Field(..., max_length=50)


class PipelineStage(BaseModel):
    name: str
    contacts: List[ContactResponse]
    count: int


class PipelineResponse(BaseModel):
    stages: List[PipelineStage]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_contact_or_404(
    session: AsyncSession,
    contact_id: str,
) -> CRMContact:
    """Return a CRMContact or raise 404."""
    contact = await session.get(CRMContact, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )
    return contact


# ---------------------------------------------------------------------------
# Routes — Contacts
# ---------------------------------------------------------------------------


@router.post(
    "/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(
    body: ContactCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ContactResponse:
    """Create a new CRM contact."""
    now = datetime.now(timezone.utc)

    contact = CRMContact(
        name=body.name,
        email=body.email,
        phone=body.phone,
        company=body.company,
        title=body.title,
        stage=body.stage or "lead",
        stage_changed_at=now,
        value=body.value,
        currency=body.currency or "INR",
        source=body.source,
        tags=json.dumps(body.tags or []),
        notes=body.notes,
        created_by=user_id,
        created_by_type="user",
        created_at=now,
        updated_at=now,
    )
    session.add(contact)
    await session.commit()
    await session.refresh(contact)
    return ContactResponse.from_contact(contact)


@router.get("/contacts", response_model=ContactListResponse)
async def list_contacts(
    stage: Optional[str] = Query(default=None, description="Filter by pipeline stage"),
    search: Optional[str] = Query(default=None, description="Text search on name, email, company"),
    sort_by: Optional[str] = Query(
        default="created_at",
        description="Sort field: name, created_at, value, stage_changed_at",
    ),
    sort_dir: Optional[str] = Query(default="desc", description="Sort direction: asc or desc"),
    limit: int = Query(default=50, ge=1, le=200, description="Max contacts to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ContactListResponse:
    """List CRM contacts with filtering, search, sorting, and pagination."""

    # Base query
    stmt = select(CRMContact)
    count_stmt = select(func.count()).select_from(CRMContact)

    # Stage filter
    if stage:
        stmt = stmt.where(CRMContact.stage == stage)
        count_stmt = count_stmt.where(CRMContact.stage == stage)

    # Text search on name, email, company
    if search:
        search_pattern = f"%{search}%"
        search_filter = (
            col(CRMContact.name).ilike(search_pattern)
            | col(CRMContact.email).ilike(search_pattern)
            | col(CRMContact.company).ilike(search_pattern)
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    # Sorting
    sort_column_map = {
        "name": CRMContact.name,
        "created_at": CRMContact.created_at,
        "value": CRMContact.value,
        "stage_changed_at": CRMContact.stage_changed_at,
    }
    sort_column = sort_column_map.get(sort_by or "created_at", CRMContact.created_at)

    if sort_dir == "asc":
        stmt = stmt.order_by(sort_column.asc())
    else:
        stmt = stmt.order_by(sort_column.desc())

    # Get total count
    count_result = await session.execute(count_stmt)
    total = count_result.scalar_one()

    # Pagination
    stmt = stmt.offset(offset).limit(limit)

    result = await session.execute(stmt)
    contacts = list(result.scalars().all())

    return ContactListResponse(
        contacts=[ContactResponse.from_contact(c) for c in contacts],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ContactResponse:
    """Get a single CRM contact by ID."""
    contact = await _get_contact_or_404(session, contact_id)
    return ContactResponse.from_contact(contact)


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ContactResponse:
    """Update fields on an existing CRM contact."""
    contact = await _get_contact_or_404(session, contact_id)
    now = datetime.now(timezone.utc)

    update_data = body.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "tags":
            contact.tags = json.dumps(value if value is not None else [])
        elif field == "stage" and value is not None and value != contact.stage:
            contact.stage = value
            contact.stage_changed_at = now
        else:
            setattr(contact, field, value)

    contact.updated_at = now
    session.add(contact)
    await session.commit()
    await session.refresh(contact)
    return ContactResponse.from_contact(contact)


@router.delete(
    "/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contact(
    contact_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> None:
    """Delete a CRM contact and all associated activities."""
    contact = await _get_contact_or_404(session, contact_id)

    # Delete associated activities first
    activities_stmt = select(CRMActivity).where(CRMActivity.contact_id == contact_id)
    result = await session.execute(activities_stmt)
    activities = result.scalars().all()
    for activity in activities:
        await session.delete(activity)

    await session.delete(contact)
    await session.commit()


# ---------------------------------------------------------------------------
# Routes — Activities
# ---------------------------------------------------------------------------


@router.get(
    "/contacts/{contact_id}/activities",
    response_model=ActivityListResponse,
)
async def list_contact_activities(
    contact_id: str,
    limit: int = Query(default=50, ge=1, le=200, description="Max activities to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ActivityListResponse:
    """Get the activities timeline for a contact (newest first, with pagination)."""
    # Ensure contact exists
    await _get_contact_or_404(session, contact_id)

    # Count total activities
    count_stmt = (
        select(func.count())
        .select_from(CRMActivity)
        .where(CRMActivity.contact_id == contact_id)
    )
    count_result = await session.execute(count_stmt)
    total = count_result.scalar_one()

    # Fetch activities, newest first
    stmt = (
        select(CRMActivity)
        .where(CRMActivity.contact_id == contact_id)
        .order_by(CRMActivity.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    activities = list(result.scalars().all())

    return ActivityListResponse(
        activities=[ActivityResponse.from_activity(a) for a in activities],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/contacts/{contact_id}/activities",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_activity(
    contact_id: str,
    body: ActivityCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ActivityResponse:
    """Log an activity against a contact."""
    # Ensure contact exists
    await _get_contact_or_404(session, contact_id)

    # Validate activity type
    if body.type not in VALID_ACTIVITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid activity type '{body.type}'. "
                   f"Must be one of: {', '.join(sorted(VALID_ACTIVITY_TYPES))}",
        )

    activity = CRMActivity(
        contact_id=contact_id,
        type=body.type,
        title=body.title,
        content=body.content,
        activity_metadata=json.dumps(body.activity_metadata or {}),
        performed_by=user_id,
        performer_type="user",
    )
    session.add(activity)

    # Update last_contacted_at on the contact for interaction types
    if body.type in {"call", "email", "meeting"}:
        contact = await session.get(CRMContact, contact_id)
        if contact:
            contact.last_contacted_at = datetime.now(timezone.utc)
            contact.updated_at = datetime.now(timezone.utc)
            session.add(contact)

    await session.commit()
    await session.refresh(activity)
    return ActivityResponse.from_activity(activity)


# ---------------------------------------------------------------------------
# Routes — Pipeline
# ---------------------------------------------------------------------------


@router.get("/pipeline", response_model=PipelineResponse)
async def get_pipeline(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> PipelineResponse:
    """Get contacts grouped by pipeline stage with counts."""
    stages: List[PipelineStage] = []

    for stage_name in PIPELINE_STAGES:
        stmt = (
            select(CRMContact)
            .where(CRMContact.stage == stage_name)
            .order_by(CRMContact.stage_changed_at.desc())
        )
        result = await session.execute(stmt)
        contacts = list(result.scalars().all())

        stages.append(
            PipelineStage(
                name=stage_name,
                contacts=[ContactResponse.from_contact(c) for c in contacts],
                count=len(contacts),
            )
        )

    return PipelineResponse(stages=stages)


@router.put(
    "/contacts/{contact_id}/stage",
    response_model=ContactResponse,
)
async def update_contact_stage(
    contact_id: str,
    body: StageUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ContactResponse:
    """Move a contact to a new pipeline stage.

    Updates the stage, stage_changed_at timestamp, and logs a deal_update activity.
    """
    contact = await _get_contact_or_404(session, contact_id)
    now = datetime.now(timezone.utc)

    old_stage = contact.stage
    new_stage = body.stage

    if old_stage == new_stage:
        return ContactResponse.from_contact(contact)

    # Update the contact stage
    contact.stage = new_stage
    contact.stage_changed_at = now
    contact.updated_at = now
    session.add(contact)

    # Log a deal_update activity
    activity = CRMActivity(
        contact_id=contact_id,
        type="deal_update",
        title=f"Stage changed: {old_stage} -> {new_stage}",
        content=f"Contact moved from '{old_stage}' to '{new_stage}' stage.",
        activity_metadata=json.dumps({
            "old_stage": old_stage,
            "new_stage": new_stage,
        }),
        performed_by=user_id,
        performer_type="user",
    )
    session.add(activity)

    await session.commit()
    await session.refresh(contact)
    return ContactResponse.from_contact(contact)
