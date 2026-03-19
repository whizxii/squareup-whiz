"""Automation API — logs, pending reviews, and review actions."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user_id
from app.services.automation_review import (
    approve_review,
    count_pending_reviews,
    get_automation_logs,
    get_pending_reviews,
    reject_review,
)

router = APIRouter(prefix="/api/automation", tags=["automation"])


class ReviewAction(BaseModel):
    notes: Optional[str] = None


@router.get("/logs")
async def list_automation_logs(
    status: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user_id: str = get_current_user_id,
):
    """List all automation logs with optional filtering."""
    logs = await get_automation_logs(
        status=status,
        entity_type=entity_type,
        limit=min(limit, 200),
        offset=offset,
    )
    return {"logs": [_log_to_dict(log) for log in logs], "count": len(logs)}


@router.get("/pending-review")
async def list_pending_reviews(
    limit: int = 50,
    user_id: str = get_current_user_id,
):
    """Return pending automation actions that need human review."""
    logs = await get_pending_reviews(user_id=user_id, limit=min(limit, 100))
    return {"pending": [_log_to_dict(log) for log in logs], "total": len(logs)}


@router.get("/pending-count")
async def get_pending_count(user_id: str = get_current_user_id):
    """Return the count of pending reviews (for badge display)."""
    count = await count_pending_reviews()
    return {"count": count}


@router.post("/review/{log_id}/approve")
async def approve_automation(
    log_id: str,
    body: ReviewAction,
    user_id: str = get_current_user_id,
):
    """Approve a pending automation action and execute it."""
    log = await approve_review(log_id, reviewer_id=user_id, notes=body.notes)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found or not in pending_review state")
    return _log_to_dict(log)


@router.post("/review/{log_id}/reject")
async def reject_automation(
    log_id: str,
    body: ReviewAction,
    user_id: str = get_current_user_id,
):
    """Reject a pending automation action."""
    log = await reject_review(log_id, reviewer_id=user_id, notes=body.notes)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found or not in pending_review state")
    return _log_to_dict(log)


def _log_to_dict(log) -> dict:
    return {
        "id": log.id,
        "action_type": log.action_type,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "entity_name": log.entity_name,
        "confidence": log.confidence,
        "status": log.status,
        "performed_by": log.performed_by,
        "result": log.result,
        "review_notes": log.review_notes,
        "ai_reasoning": log.ai_reasoning,
        "source_event": log.source_event,
        "created_at": log.created_at.isoformat() if log.created_at else None,
        "reviewed_at": log.reviewed_at.isoformat() if log.reviewed_at else None,
        "reviewed_by": log.reviewed_by,
    }
