"""AI Feedback Service — collect, query, and aggregate user feedback on AI outputs.

Provides accuracy metrics and per-action-type performance tracking to enable
confidence threshold tuning and transparency in the AI Activity feed.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import func, select

from app.core.db import async_session
from app.models.ai_feedback import AIFeedback

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Submit feedback
# ---------------------------------------------------------------------------

async def submit_feedback(
    *,
    source_type: str,
    source_id: str,
    user_id: str,
    rating: str,
    feedback_text: Optional[str] = None,
    ai_confidence: Optional[float] = None,
    action_type: Optional[str] = None,
) -> AIFeedback:
    """Record a user's thumbs-up/down feedback on an AI output."""
    if rating not in ("thumbs_up", "thumbs_down"):
        raise ValueError(f"Invalid rating: {rating}")
    if source_type not in ("automation_log", "insight", "lead_score", "deal_risk", "copilot"):
        raise ValueError(f"Invalid source_type: {source_type}")

    feedback = AIFeedback(
        source_type=source_type,
        source_id=source_id,
        user_id=user_id,
        rating=rating,
        feedback_text=feedback_text,
        ai_confidence=ai_confidence,
        action_type=action_type,
    )

    async with async_session() as session:
        session.add(feedback)
        await session.commit()
        await session.refresh(feedback)

    logger.info(
        "Feedback recorded: %s on %s/%s by %s",
        rating, source_type, source_id, user_id,
    )
    return feedback


# ---------------------------------------------------------------------------
# Update outcome (ground truth)
# ---------------------------------------------------------------------------

async def update_outcome(
    feedback_id: str,
    outcome: str,
) -> AIFeedback | None:
    """Set the ground-truth outcome on an existing feedback entry."""
    if outcome not in ("correct", "incorrect", "partially_correct"):
        raise ValueError(f"Invalid outcome: {outcome}")

    async with async_session() as session:
        fb = await session.get(AIFeedback, feedback_id)
        if fb is None:
            return None
        fb.outcome = outcome
        session.add(fb)
        await session.commit()
        await session.refresh(fb)
    return fb


# ---------------------------------------------------------------------------
# Query feedback for a specific source
# ---------------------------------------------------------------------------

async def get_feedback_for_source(
    source_type: str,
    source_id: str,
) -> list[AIFeedback]:
    """Return all feedback entries for a given AI output."""
    async with async_session() as session:
        stmt = (
            select(AIFeedback)
            .where(
                AIFeedback.source_type == source_type,
                AIFeedback.source_id == source_id,
            )
            .order_by(AIFeedback.created_at.desc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Accuracy metrics
# ---------------------------------------------------------------------------

async def get_accuracy_metrics(
    *,
    days: int = 30,
    source_type: Optional[str] = None,
    action_type: Optional[str] = None,
) -> dict:
    """Compute aggregated accuracy metrics over a time window.

    Returns:
        {
            "total": int,
            "thumbs_up": int,
            "thumbs_down": int,
            "approval_rate": float,  # 0.0 – 1.0
            "by_action_type": {
                "create_contact": {"total": 5, "thumbs_up": 4, ...},
                ...
            },
            "by_source_type": {
                "automation_log": {"total": 10, ...},
                ...
            },
            "trend": [  # last N weeks
                {"week": "2025-W12", "approval_rate": 0.85, "total": 12},
                ...
            ]
        }
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    async with async_session() as session:
        # Base filter
        base = select(AIFeedback).where(AIFeedback.created_at >= cutoff)
        if source_type:
            base = base.where(AIFeedback.source_type == source_type)
        if action_type:
            base = base.where(AIFeedback.action_type == action_type)

        result = await session.execute(base.order_by(AIFeedback.created_at.desc()))
        rows = list(result.scalars().all())

    if not rows:
        return {
            "total": 0,
            "thumbs_up": 0,
            "thumbs_down": 0,
            "approval_rate": 0.0,
            "by_action_type": {},
            "by_source_type": {},
            "trend": [],
        }

    total = len(rows)
    thumbs_up = sum(1 for r in rows if r.rating == "thumbs_up")
    thumbs_down = total - thumbs_up

    # Group by action_type
    by_action: dict[str, dict] = {}
    for r in rows:
        key = r.action_type or "unknown"
        bucket = by_action.setdefault(key, {"total": 0, "thumbs_up": 0, "thumbs_down": 0})
        bucket["total"] += 1
        if r.rating == "thumbs_up":
            bucket["thumbs_up"] += 1
        else:
            bucket["thumbs_down"] += 1
    for bucket in by_action.values():
        bucket["approval_rate"] = round(bucket["thumbs_up"] / bucket["total"], 3) if bucket["total"] else 0.0

    # Group by source_type
    by_source: dict[str, dict] = {}
    for r in rows:
        key = r.source_type
        bucket = by_source.setdefault(key, {"total": 0, "thumbs_up": 0, "thumbs_down": 0})
        bucket["total"] += 1
        if r.rating == "thumbs_up":
            bucket["thumbs_up"] += 1
        else:
            bucket["thumbs_down"] += 1
    for bucket in by_source.values():
        bucket["approval_rate"] = round(bucket["thumbs_up"] / bucket["total"], 3) if bucket["total"] else 0.0

    # Weekly trend (last N weeks within the window)
    trend: list[dict] = []
    week_buckets: dict[str, dict] = {}
    for r in rows:
        iso_year, iso_week, _ = r.created_at.isocalendar()
        week_key = f"{iso_year}-W{iso_week:02d}"
        wb = week_buckets.setdefault(week_key, {"total": 0, "thumbs_up": 0})
        wb["total"] += 1
        if r.rating == "thumbs_up":
            wb["thumbs_up"] += 1

    for week_key in sorted(week_buckets.keys()):
        wb = week_buckets[week_key]
        trend.append({
            "week": week_key,
            "total": wb["total"],
            "approval_rate": round(wb["thumbs_up"] / wb["total"], 3) if wb["total"] else 0.0,
        })

    return {
        "total": total,
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "approval_rate": round(thumbs_up / total, 3),
        "by_action_type": by_action,
        "by_source_type": by_source,
        "trend": trend,
    }
