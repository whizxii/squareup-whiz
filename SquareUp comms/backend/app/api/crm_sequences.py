"""CRM Sequences API — email sequence CRUD, enrollment engine, and stats."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_sequence_service
from app.services.crm_sequence_service import SequenceService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-sequences"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SequenceStepSchema(BaseModel):
    order: int = 0
    delay_days: int = 0
    delay_hours: int = 0
    template_subject: str = ""
    template_body: str = ""
    send_on_reply: str = Field(default="stop", pattern="^(stop|continue)$")


class SequenceCreateBody(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    steps: List[SequenceStepSchema] = Field(default_factory=list)
    status: str = Field(default="active", max_length=20)


class SequenceUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    steps: Optional[List[SequenceStepSchema]] = None
    status: Optional[str] = Field(default=None, max_length=20)


class EnrollContactBody(BaseModel):
    contact_id: str


class BulkEnrollBody(BaseModel):
    contact_ids: List[str] = Field(..., min_length=1, max_length=200)


class SequenceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    steps: Any = "[]"
    status: str = "active"
    total_enrolled: int = 0
    total_completed: int = 0
    total_replied: int = 0
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, seq: Any) -> "SequenceResponse":
        steps_raw = seq.steps or "[]"
        try:
            steps_parsed = json.loads(steps_raw) if isinstance(steps_raw, str) else steps_raw
        except (json.JSONDecodeError, TypeError):
            steps_parsed = []

        return cls(
            id=seq.id,
            name=seq.name,
            description=seq.description,
            steps=steps_parsed,
            status=seq.status or "active",
            total_enrolled=seq.total_enrolled or 0,
            total_completed=seq.total_completed or 0,
            total_replied=seq.total_replied or 0,
            created_by=seq.created_by,
            created_at=seq.created_at,
            updated_at=seq.updated_at,
        )


class EnrollmentResponse(BaseModel):
    id: str
    sequence_id: str
    contact_id: str
    current_step: int = 0
    status: str = "active"
    enrolled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_send_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, enr: Any) -> "EnrollmentResponse":
        return cls(
            id=enr.id,
            sequence_id=enr.sequence_id,
            contact_id=enr.contact_id,
            current_step=enr.current_step or 0,
            status=enr.status or "active",
            enrolled_at=enr.enrolled_at,
            completed_at=enr.completed_at,
            next_send_at=enr.next_send_at,
            created_at=enr.created_at,
        )


# ---------------------------------------------------------------------------
# Sequence CRUD Routes
# ---------------------------------------------------------------------------


@router.post(
    "/sequences",
    status_code=status.HTTP_201_CREATED,
)
async def create_sequence(
    body: SequenceCreateBody,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new email sequence with steps."""
    data = body.model_dump(exclude_unset=True)
    if "steps" in data:
        data["steps"] = [s if isinstance(s, dict) else s for s in data["steps"]]
    seq = await svc.create_sequence(data, user_id)
    return success_response(SequenceResponse.from_model(seq))


@router.get("/sequences")
async def list_sequences(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """List sequences with filters and cursor pagination."""
    page = await svc.repo.search(
        status=status_filter,
        query=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        cursor=cursor,
        limit=limit,
    )
    return success_response({
        "items": [SequenceResponse.from_model(s).model_dump(mode="json") for s in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/sequences/{sequence_id}")
async def get_sequence(
    sequence_id: str,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single sequence by ID."""
    seq = await svc.get_sequence(sequence_id)
    if seq is None:
        raise ApiError(status_code=404, detail="Sequence not found")
    return success_response(SequenceResponse.from_model(seq))


@router.put("/sequences/{sequence_id}")
async def update_sequence(
    sequence_id: str,
    body: SequenceUpdateBody,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Update a sequence (name, steps, status)."""
    updates = body.model_dump(exclude_unset=True)
    if "steps" in updates:
        updates["steps"] = [s if isinstance(s, dict) else s for s in updates["steps"]]
    seq = await svc.update_sequence(sequence_id, updates, user_id)
    if seq is None:
        raise ApiError(status_code=404, detail="Sequence not found")
    return success_response(SequenceResponse.from_model(seq))


@router.put("/sequences/{sequence_id}/pause")
async def pause_sequence(
    sequence_id: str,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Pause an active sequence."""
    seq = await svc.pause_sequence(sequence_id, user_id)
    if seq is None:
        raise ApiError(status_code=404, detail="Sequence not found")
    return success_response(SequenceResponse.from_model(seq))


@router.put("/sequences/{sequence_id}/activate")
async def activate_sequence(
    sequence_id: str,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Activate a paused sequence."""
    seq = await svc.activate_sequence(sequence_id, user_id)
    if seq is None:
        raise ApiError(status_code=404, detail="Sequence not found")
    return success_response(SequenceResponse.from_model(seq))


# ---------------------------------------------------------------------------
# Enrollment Routes
# ---------------------------------------------------------------------------


@router.post(
    "/sequences/{sequence_id}/enroll",
    status_code=status.HTTP_201_CREATED,
)
async def enroll_contact(
    sequence_id: str,
    body: EnrollContactBody,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Enroll a contact in a sequence."""
    enrollment = await svc.enroll_contact(sequence_id, body.contact_id, user_id)
    if enrollment is None:
        raise ApiError(status_code=400, detail="Sequence not found or not active")
    return success_response(EnrollmentResponse.from_model(enrollment))


@router.post(
    "/sequences/{sequence_id}/enroll/bulk",
    status_code=status.HTTP_201_CREATED,
)
async def bulk_enroll_contacts(
    sequence_id: str,
    body: BulkEnrollBody,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Enroll multiple contacts in a sequence."""
    results: list[dict[str, Any]] = []
    for contact_id in body.contact_ids:
        enrollment = await svc.enroll_contact(sequence_id, contact_id, user_id)
        if enrollment is not None:
            results.append(EnrollmentResponse.from_model(enrollment).model_dump(mode="json"))
    return success_response({"enrolled": results, "count": len(results)})


@router.delete("/sequences/enrollments/{enrollment_id}")
async def unenroll_contact(
    enrollment_id: str,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Unenroll a contact from a sequence."""
    enrollment = await svc.unenroll_contact(enrollment_id, user_id)
    if enrollment is None:
        raise ApiError(status_code=404, detail="Enrollment not found")
    return success_response(EnrollmentResponse.from_model(enrollment))


@router.get("/sequences/{sequence_id}/stats")
async def get_sequence_stats(
    sequence_id: str,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Get enrollment statistics for a sequence."""
    stats = await svc.get_sequence_stats(sequence_id)
    return success_response(stats)


@router.get("/sequences/{sequence_id}/enrollments")
async def get_sequence_enrollments(
    sequence_id: str,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Get enrollments for a sequence with optional status filter."""
    page = await svc.enrollment_repo.get_for_sequence(
        sequence_id=sequence_id,
        status=status_filter,
        cursor=cursor,
        limit=limit,
    )
    return success_response({
        "items": [EnrollmentResponse.from_model(e).model_dump(mode="json") for e in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/contacts/{contact_id}/enrollments")
async def get_enrollments_for_contact(
    contact_id: str,
    svc: SequenceService = Depends(get_sequence_service),
    user_id: str = Depends(get_current_user),
):
    """Get all sequence enrollments for a contact."""
    enrollments = await svc.get_enrollments_for_contact(contact_id)
    return success_response([
        EnrollmentResponse.from_model(e).model_dump(mode="json") for e in enrollments
    ])
