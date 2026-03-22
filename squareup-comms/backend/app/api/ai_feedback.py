"""AI Feedback API — submit, query, and view accuracy metrics."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.services.ai_feedback_service import (
    get_accuracy_metrics,
    get_feedback_for_source,
    submit_feedback,
    update_outcome,
)

router = APIRouter(prefix="/api/ai-feedback", tags=["ai-feedback"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class SubmitFeedbackRequest(BaseModel):
    source_type: str  # "automation_log" | "insight" | "lead_score" | "deal_risk" | "copilot"
    source_id: str
    rating: str  # "thumbs_up" | "thumbs_down"
    feedback_text: Optional[str] = None
    ai_confidence: Optional[float] = None
    action_type: Optional[str] = None


class UpdateOutcomeRequest(BaseModel):
    outcome: str  # "correct" | "incorrect" | "partially_correct"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("")
async def create_feedback(
    body: SubmitFeedbackRequest,
    user_id: str = Depends(get_current_user),
):
    """Submit thumbs-up/down feedback on an AI output."""
    try:
        fb = await submit_feedback(
            source_type=body.source_type,
            source_id=body.source_id,
            user_id=user_id,
            rating=body.rating,
            feedback_text=body.feedback_text,
            ai_confidence=body.ai_confidence,
            action_type=body.action_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return _feedback_to_dict(fb)


@router.patch("/{feedback_id}/outcome")
async def set_outcome(
    feedback_id: str,
    body: UpdateOutcomeRequest,
    user_id: str = Depends(get_current_user),
):
    """Update the ground-truth outcome of a feedback entry."""
    try:
        fb = await update_outcome(feedback_id, body.outcome)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if fb is None:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return _feedback_to_dict(fb)


@router.get("/for/{source_type}/{source_id}")
async def list_feedback_for_source(
    source_type: str,
    source_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get all feedback entries for a specific AI output."""
    entries = await get_feedback_for_source(source_type, source_id)
    return {"feedback": [_feedback_to_dict(f) for f in entries]}


@router.get("/metrics")
async def accuracy_metrics(
    days: int = Query(30, ge=1, le=365),
    source_type: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
):
    """Return aggregated accuracy metrics (approval rate, trends, breakdowns)."""
    return await get_accuracy_metrics(
        days=days,
        source_type=source_type,
        action_type=action_type,
    )


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------

def _feedback_to_dict(fb) -> dict:
    return {
        "id": fb.id,
        "source_type": fb.source_type,
        "source_id": fb.source_id,
        "user_id": fb.user_id,
        "rating": fb.rating,
        "outcome": fb.outcome,
        "feedback_text": fb.feedback_text,
        "ai_confidence": fb.ai_confidence,
        "action_type": fb.action_type,
        "created_at": fb.created_at.isoformat() if fb.created_at else None,
    }
