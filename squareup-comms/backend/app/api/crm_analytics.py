"""CRM Analytics API — KPIs, pipeline, revenue, activity, win/loss, sources."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.auth import get_current_user
from app.core.responses import success_response
from app.api.deps import get_analytics_service
from app.services.crm_analytics_service import AnalyticsService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-analytics"])


@router.get("/analytics/overview")
async def analytics_overview(
    period: str = Query(default="30d", regex="^(7d|30d|90d|ytd)$"),
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Dashboard KPI summary: contacts, pipeline, win rate, avg deal size."""
    data = await svc.get_overview(period=period)
    return success_response(data)


@router.get("/analytics/pipeline")
async def analytics_pipeline(
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Pipeline stage analysis: counts, values, conversion rates, avg time."""
    data = await svc.get_pipeline_analytics()
    return success_response(data)


@router.get("/analytics/revenue")
async def analytics_revenue(
    period: str = Query(default="30d", regex="^(7d|30d|90d|ytd)$"),
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Revenue actuals vs forecast, by source, by period."""
    data = await svc.get_revenue_analytics(period=period)
    return success_response(data)


@router.get("/analytics/activity")
async def analytics_activity(
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Activity volume breakdown by type and daily trend (last 30d)."""
    data = await svc.get_activity_analytics()
    return success_response(data)


@router.get("/analytics/win-loss")
async def analytics_win_loss(
    period: str = Query(default="30d", regex="^(7d|30d|90d|ytd)$"),
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Win/loss analysis with reasons and cycle time comparison."""
    data = await svc.get_win_loss_analytics(period=period)
    return success_response(data)


@router.get("/analytics/stage-duration")
async def analytics_stage_duration(
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Average time deals spend in each pipeline stage."""
    data = await svc.get_stage_duration()
    return success_response(data)


@router.get("/analytics/deal-velocity")
async def analytics_deal_velocity(
    period: str = Query(default="30d", regex="^(7d|30d|90d|ytd)$"),
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Pipeline velocity: deals created, closed, win rate, cycle time."""
    data = await svc.get_deal_velocity(period=period)
    return success_response(data)


@router.get("/analytics/lead-sources")
async def analytics_lead_sources(
    period: str = Query(default="30d", regex="^(7d|30d|90d|ytd)$"),
    svc: AnalyticsService = Depends(get_analytics_service),
    user_id: str = Depends(get_current_user),
):
    """Lead source performance: contacts, deals, revenue, conversion rates."""
    data = await svc.get_lead_source_analytics(period=period)
    return success_response(data)
