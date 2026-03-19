"""AI Insights API routes — daily briefs, deal coaching, and insight management."""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, col

from app.core.auth import get_current_user
from app.core.background import BackgroundTaskManager
from app.core.db import get_session
from app.core.events import EventBus
from app.models.ai_insight import AIInsight
from app.services.ai.insights_engine import AIInsightsEngine, _serialize_insight

router = APIRouter(prefix="/api/insights", tags=["ai-insights"])


def _get_engine(session: AsyncSession) -> AIInsightsEngine:
    return AIInsightsEngine(
        session=session,
        events=EventBus(),
        background=BackgroundTaskManager(),
    )


# ---------------------------------------------------------------------------
# Daily Brief
# ---------------------------------------------------------------------------

@router.get("/daily-brief")
async def get_daily_brief(
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate (or return today's cached) daily brief for the current user."""
    from datetime import datetime, timedelta

    # Check for a brief generated today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    stmt = (
        select(AIInsight)
        .where(
            AIInsight.type == "daily_brief",
            AIInsight.target_user_id == user,
            AIInsight.created_at >= today_start,
        )
        .order_by(col(AIInsight.created_at).desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()

    if existing:
        return _serialize_insight(existing)

    # Generate a fresh brief
    engine = _get_engine(session)
    return await engine.generate_daily_brief(user)


# ---------------------------------------------------------------------------
# Deal Coaching
# ---------------------------------------------------------------------------

@router.get("/deal/{deal_id}/coaching")
async def get_deal_coaching(
    deal_id: str,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate AI coaching for a specific deal."""
    engine = _get_engine(session)
    result = await engine.generate_deal_coaching(deal_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return result


# ---------------------------------------------------------------------------
# Pipeline Risk
# ---------------------------------------------------------------------------

@router.get("/pipeline-risk")
async def get_pipeline_risk(
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate a global pipeline risk report."""
    engine = _get_engine(session)
    return await engine.generate_pipeline_risk_report()


# ---------------------------------------------------------------------------
# Insight CRUD
# ---------------------------------------------------------------------------

@router.get("")
async def list_insights(
    type: Optional[str] = Query(None),
    is_dismissed: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List AI insights for the current user."""
    stmt = select(AIInsight).where(
        (AIInsight.target_user_id == user) | (AIInsight.target_user_id.is_(None))
    )
    if type:
        stmt = stmt.where(AIInsight.type == type)
    if is_dismissed is not None:
        stmt = stmt.where(AIInsight.is_dismissed == is_dismissed)

    stmt = stmt.order_by(col(AIInsight.created_at).desc()).offset(offset).limit(limit)
    result = await session.execute(stmt)
    insights = result.scalars().all()

    return {"insights": [_serialize_insight(i) for i in insights], "total": len(insights)}


@router.patch("/{insight_id}/dismiss")
async def dismiss_insight(
    insight_id: str,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Mark an insight as dismissed."""
    from datetime import datetime

    insight = await session.get(AIInsight, insight_id)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")

    updated = AIInsight(
        **{
            **insight.__dict__,
            "is_dismissed": True,
            "dismissed_at": datetime.utcnow(),
        }
    )
    # SQLModel update in-place (no mutation of shared state — update via setattr)
    insight.is_dismissed = True
    insight.dismissed_at = datetime.utcnow()
    session.add(insight)
    await session.commit()

    return {"id": insight_id, "dismissed": True}


@router.patch("/{insight_id}/read")
async def mark_insight_read(
    insight_id: str,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Mark an insight as read."""
    from datetime import datetime

    insight = await session.get(AIInsight, insight_id)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    insight.read_at = datetime.utcnow()
    session.add(insight)
    await session.commit()

    return {"id": insight_id, "read": True}
