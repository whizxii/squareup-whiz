"""CRM Deduplication API — scan, merge, dismiss duplicates."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_dedup_service, get_contact_service
from app.services.crm_dedup_service import DedupService
from app.services.crm_contact_service import ContactService

router = APIRouter(prefix="/api/crm/v2/dedup", tags=["crm-dedup"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class MergeBody(BaseModel):
    primary_id: str
    secondary_id: str


class DismissBody(BaseModel):
    contact_a_id: str
    contact_b_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/scan")
async def scan_duplicates(
    limit: int = Query(default=100, ge=1, le=500),
    svc: DedupService = Depends(get_dedup_service),
    user_id: str = Depends(get_current_user),
):
    """Find all potential duplicate contact groups."""
    matches = await svc.scan_duplicates(limit=limit)
    return success_response(matches)


@router.post("/merge")
async def merge_duplicates(
    body: MergeBody,
    contact_svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Merge secondary contact into primary, consolidating all data."""
    result = await contact_svc.merge_contacts(
        body.primary_id, body.secondary_id, user_id
    )
    if result is None:
        raise ApiError(status_code=404, detail="One or both contacts not found")
    return success_response({"merged_contact_id": result.id})


@router.post("/dismiss")
async def dismiss_duplicate(
    body: DismissBody,
    svc: DedupService = Depends(get_dedup_service),
    user_id: str = Depends(get_current_user),
):
    """Dismiss a duplicate suggestion."""
    await svc.dismiss_match(body.contact_a_id, body.contact_b_id, user_id)
    return success_response({"dismissed": True})
