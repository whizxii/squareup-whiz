"""CRM Analytics Service — KPI computation, pipeline velocity, revenue intelligence.

Uses TTLCache for expensive aggregate queries. All methods return plain dicts
suitable for direct JSON serialisation via the API layer.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, case, and_, or_, extract
from sqlalchemy.future import select

from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.crm_pipeline import CRMPipeline
from app.services.base import BaseService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PERIOD_DAYS = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "ytd": None,  # handled specially
}


def _period_start(period: str) -> datetime:
    """Return the UTC datetime marking the start of the requested period."""
    now = datetime.now(timezone.utc)
    if period == "ytd":
        return datetime(now.year, 1, 1, tzinfo=timezone.utc)
    days = _PERIOD_DAYS.get(period, 30)
    return now - timedelta(days=days)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class AnalyticsService(BaseService):
    """Computes CRM analytics with transparent caching."""

    # ----- Overview KPIs ------------------------------------------------

    async def get_overview(self, period: str = "30d") -> dict[str, Any]:
        """Dashboard KPI summary: contacts, deals, pipeline, win rate."""
        cache_key = f"analytics:overview:{period}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        start = _period_start(period)
        now = datetime.now(timezone.utc)

        # Contact counts
        total_contacts = (
            await self.session.execute(
                select(func.count(CRMContact.id)).where(CRMContact.is_archived.is_(False))
            )
        ).scalar_one()

        new_contacts = (
            await self.session.execute(
                select(func.count(CRMContact.id)).where(
                    CRMContact.is_archived.is_(False),
                    CRMContact.created_at >= start,
                )
            )
        ).scalar_one()

        # Pipeline value (open deals)
        pipeline_q = select(
            func.count(CRMDeal.id).label("deal_count"),
            func.coalesce(func.sum(CRMDeal.value), 0).label("total_value"),
            func.coalesce(
                func.sum(CRMDeal.value * CRMDeal.probability / 100.0), 0
            ).label("weighted_value"),
        ).where(CRMDeal.status == "open")
        pipeline_row = (await self.session.execute(pipeline_q)).one()

        # Won deals in period
        won_q = select(
            func.count(CRMDeal.id).label("won_count"),
            func.coalesce(func.sum(CRMDeal.value), 0).label("won_value"),
        ).where(CRMDeal.status == "won", CRMDeal.actual_close_date >= start)
        won_row = (await self.session.execute(won_q)).one()

        # Lost deals in period
        lost_count = (
            await self.session.execute(
                select(func.count(CRMDeal.id)).where(
                    CRMDeal.status == "lost",
                    CRMDeal.actual_close_date >= start,
                )
            )
        ).scalar_one()

        closed_total = won_row.won_count + lost_count
        win_rate = round((won_row.won_count / closed_total * 100) if closed_total else 0, 1)
        avg_deal_size = round(
            (won_row.won_value / won_row.won_count) if won_row.won_count else 0, 2
        )

        # Avg days to close (won deals)
        avg_cycle_q = select(
            func.avg(
                func.julianday(CRMDeal.actual_close_date) - func.julianday(CRMDeal.created_at)
            )
        ).where(CRMDeal.status == "won", CRMDeal.actual_close_date.isnot(None))
        avg_days_raw = (await self.session.execute(avg_cycle_q)).scalar_one()
        avg_days_to_close = round(avg_days_raw, 1) if avg_days_raw else 0

        result: dict[str, Any] = {
            "period": period,
            "total_contacts": total_contacts,
            "new_contacts": new_contacts,
            "total_pipeline_value": float(pipeline_row.total_value),
            "weighted_pipeline_value": float(pipeline_row.weighted_value),
            "open_deals": pipeline_row.deal_count,
            "deals_won": won_row.won_count,
            "deals_lost": lost_count,
            "won_value": float(won_row.won_value),
            "win_rate": win_rate,
            "avg_deal_size": avg_deal_size,
            "avg_days_to_close": avg_days_to_close,
        }
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result

    # ----- Pipeline Analytics -------------------------------------------

    async def get_pipeline_analytics(self) -> dict[str, Any]:
        """Stage-by-stage pipeline analysis: counts, values, conversion rates."""
        cache_key = "analytics:pipeline"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        # Get default pipeline stages
        pipeline_row = await self.session.execute(
            select(CRMPipeline).where(CRMPipeline.is_default.is_(True)).limit(1)
        )
        pipeline = pipeline_row.scalars().first()
        stages_config = json.loads(pipeline.stages) if pipeline else []

        # Deal counts & values per stage
        stage_q = (
            select(
                CRMDeal.stage,
                func.count(CRMDeal.id).label("count"),
                func.coalesce(func.sum(CRMDeal.value), 0).label("value"),
                func.avg(
                    func.julianday(func.datetime("now"))
                    - func.julianday(CRMDeal.stage_entered_at)
                ).label("avg_days_in_stage"),
            )
            .where(CRMDeal.status == "open")
            .group_by(CRMDeal.stage)
        )
        rows = (await self.session.execute(stage_q)).all()
        stage_map = {r.stage: r for r in rows}

        stages = []
        prev_count: Optional[int] = None
        for sc in stages_config:
            sid = sc.get("id", sc.get("label", ""))
            row = stage_map.get(sid)
            count = row.count if row else 0
            value = float(row.value) if row else 0
            avg_days = round(row.avg_days_in_stage, 1) if row and row.avg_days_in_stage else 0
            conversion = (
                round((count / prev_count) * 100, 1) if prev_count and prev_count > 0 else None
            )
            stages.append({
                "id": sid,
                "label": sc.get("label", sid),
                "color": sc.get("color", "#6B7280"),
                "count": count,
                "value": value,
                "avg_days_in_stage": avg_days,
                "conversion_rate": conversion,
            })
            prev_count = count

        # Overall pipeline stats
        total_open = sum(s["count"] for s in stages)
        total_value = sum(s["value"] for s in stages)

        result: dict[str, Any] = {
            "stages": stages,
            "total_open_deals": total_open,
            "total_pipeline_value": total_value,
        }
        self.cache.set(cache_key, result, ttl_seconds=60)
        return result

    # ----- Revenue Analytics --------------------------------------------

    async def get_revenue_analytics(self, period: str = "30d") -> dict[str, Any]:
        """Revenue by period with actual vs forecast data points."""
        cache_key = f"analytics:revenue:{period}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        start = _period_start(period)

        # Monthly revenue (won deals grouped by month)
        monthly_q = (
            select(
                extract("year", CRMDeal.actual_close_date).label("yr"),
                extract("month", CRMDeal.actual_close_date).label("mo"),
                func.coalesce(func.sum(CRMDeal.value), 0).label("revenue"),
                func.count(CRMDeal.id).label("deal_count"),
            )
            .where(
                CRMDeal.status == "won",
                CRMDeal.actual_close_date >= start,
                CRMDeal.actual_close_date.isnot(None),
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
        )
        monthly_rows = (await self.session.execute(monthly_q)).all()

        actuals = [
            {
                "period": f"{int(r.yr)}-{int(r.mo):02d}",
                "revenue": float(r.revenue),
                "deal_count": r.deal_count,
            }
            for r in monthly_rows
        ]

        # Forecast: weighted pipeline by expected close month
        forecast_q = (
            select(
                extract("year", CRMDeal.expected_close_date).label("yr"),
                extract("month", CRMDeal.expected_close_date).label("mo"),
                func.coalesce(
                    func.sum(CRMDeal.value * CRMDeal.probability / 100.0), 0
                ).label("forecast"),
            )
            .where(
                CRMDeal.status == "open",
                CRMDeal.expected_close_date.isnot(None),
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
        )
        forecast_rows = (await self.session.execute(forecast_q)).all()

        forecasts = [
            {
                "period": f"{int(r.yr)}-{int(r.mo):02d}",
                "forecast": float(r.forecast),
            }
            for r in forecast_rows
        ]

        # Revenue by source
        by_source_q = (
            select(
                CRMContact.source,
                func.coalesce(func.sum(CRMDeal.value), 0).label("revenue"),
                func.count(CRMDeal.id).label("deal_count"),
            )
            .join(CRMContact, CRMDeal.contact_id == CRMContact.id)
            .where(CRMDeal.status == "won", CRMDeal.actual_close_date >= start)
            .group_by(CRMContact.source)
        )
        source_rows = (await self.session.execute(by_source_q)).all()

        by_source = [
            {
                "source": r.source or "Unknown",
                "revenue": float(r.revenue),
                "deal_count": r.deal_count,
            }
            for r in source_rows
        ]

        result: dict[str, Any] = {
            "period": period,
            "actuals": actuals,
            "forecasts": forecasts,
            "by_source": by_source,
            "total_actual": sum(a["revenue"] for a in actuals),
            "total_forecast": sum(f["forecast"] for f in forecasts),
        }
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result

    # ----- Activity Analytics -------------------------------------------

    async def get_activity_analytics(self) -> dict[str, Any]:
        """Activity volume breakdown by type and time."""
        cache_key = "analytics:activity"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        # By type
        by_type_q = (
            select(
                CRMActivity.type,
                func.count(CRMActivity.id).label("count"),
            )
            .where(CRMActivity.created_at >= thirty_days_ago)
            .group_by(CRMActivity.type)
            .order_by(func.count(CRMActivity.id).desc())
        )
        type_rows = (await self.session.execute(by_type_q)).all()

        by_type = [{"type": r.type, "count": r.count} for r in type_rows]

        # Daily volume (last 30 days)
        daily_q = (
            select(
                func.date(CRMActivity.created_at).label("day"),
                func.count(CRMActivity.id).label("count"),
            )
            .where(CRMActivity.created_at >= thirty_days_ago)
            .group_by("day")
            .order_by("day")
        )
        daily_rows = (await self.session.execute(daily_q)).all()

        daily = [{"date": str(r.day), "count": r.count} for r in daily_rows]

        # Total activities
        total = sum(d["count"] for d in daily)
        avg_per_day = round(total / 30, 1) if total else 0

        result: dict[str, Any] = {
            "by_type": by_type,
            "daily": daily,
            "total_30d": total,
            "avg_per_day": avg_per_day,
        }
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result

    # ----- Win/Loss Analysis --------------------------------------------

    async def get_win_loss_analytics(self, period: str = "30d") -> dict[str, Any]:
        """Win/loss breakdown with reasons and cycle time comparison."""
        cache_key = f"analytics:winloss:{period}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        start = _period_start(period)

        # Win/loss counts
        wl_q = (
            select(
                CRMDeal.status,
                func.count(CRMDeal.id).label("count"),
                func.coalesce(func.sum(CRMDeal.value), 0).label("value"),
                func.avg(
                    func.julianday(CRMDeal.actual_close_date) - func.julianday(CRMDeal.created_at)
                ).label("avg_cycle"),
            )
            .where(
                CRMDeal.status.in_(["won", "lost"]),
                CRMDeal.actual_close_date >= start,
            )
            .group_by(CRMDeal.status)
        )
        wl_rows = (await self.session.execute(wl_q)).all()
        status_map = {r.status: r for r in wl_rows}

        won = status_map.get("won")
        lost = status_map.get("lost")

        # Loss reasons breakdown
        loss_reasons_q = (
            select(
                CRMDeal.loss_reason,
                func.count(CRMDeal.id).label("count"),
            )
            .where(
                CRMDeal.status == "lost",
                CRMDeal.actual_close_date >= start,
                CRMDeal.loss_reason.isnot(None),
            )
            .group_by(CRMDeal.loss_reason)
            .order_by(func.count(CRMDeal.id).desc())
        )
        reason_rows = (await self.session.execute(loss_reasons_q)).all()

        result: dict[str, Any] = {
            "period": period,
            "won": {
                "count": won.count if won else 0,
                "value": float(won.value) if won else 0,
                "avg_cycle_days": round(won.avg_cycle, 1) if won and won.avg_cycle else 0,
            },
            "lost": {
                "count": lost.count if lost else 0,
                "value": float(lost.value) if lost else 0,
                "avg_cycle_days": round(lost.avg_cycle, 1) if lost and lost.avg_cycle else 0,
            },
            "loss_reasons": [
                {"reason": r.loss_reason, "count": r.count} for r in reason_rows
            ],
        }
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result

    # ----- Stage Duration -----------------------------------------------

    async def get_stage_duration(self) -> dict[str, Any]:
        """Average time deals spend in each pipeline stage."""
        cache_key = "analytics:stage_duration"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        # Get pipeline stages config
        pipeline_row = await self.session.execute(
            select(CRMPipeline).where(CRMPipeline.is_default.is_(True)).limit(1)
        )
        pipeline = pipeline_row.scalars().first()
        stages_config = json.loads(pipeline.stages) if pipeline else []
        sla_map = {s.get("id", s.get("label", "")): s.get("sla_days") for s in stages_config}

        # Avg days in current stage for open deals
        stage_q = (
            select(
                CRMDeal.stage,
                func.count(CRMDeal.id).label("count"),
                func.avg(
                    func.julianday(func.datetime("now"))
                    - func.julianday(CRMDeal.stage_entered_at)
                ).label("avg_days"),
                func.max(
                    func.julianday(func.datetime("now"))
                    - func.julianday(CRMDeal.stage_entered_at)
                ).label("max_days"),
            )
            .where(CRMDeal.status == "open")
            .group_by(CRMDeal.stage)
        )
        rows = (await self.session.execute(stage_q)).all()

        stages = []
        for r in rows:
            sla = sla_map.get(r.stage)
            avg_d = round(r.avg_days, 1) if r.avg_days else 0
            stages.append({
                "stage": r.stage,
                "deal_count": r.count,
                "avg_days": avg_d,
                "max_days": round(r.max_days, 1) if r.max_days else 0,
                "sla_days": sla,
                "exceeds_sla": avg_d > sla if sla else False,
            })

        result: dict[str, Any] = {"stages": stages}
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result

    # ----- Deal Velocity ------------------------------------------------

    async def get_deal_velocity(self, period: str = "30d") -> dict[str, Any]:
        """How fast deals move through the pipeline."""
        cache_key = f"analytics:velocity:{period}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        start = _period_start(period)

        # Deals created in period
        created_q = select(func.count(CRMDeal.id)).where(CRMDeal.created_at >= start)
        created_count = (await self.session.execute(created_q)).scalar_one()

        # Deals closed in period
        closed_q = select(func.count(CRMDeal.id)).where(
            CRMDeal.status.in_(["won", "lost"]),
            CRMDeal.actual_close_date >= start,
        )
        closed_count = (await self.session.execute(closed_q)).scalar_one()

        # Average value of created deals
        avg_created_value = (
            await self.session.execute(
                select(func.coalesce(func.avg(CRMDeal.value), 0)).where(
                    CRMDeal.created_at >= start
                )
            )
        ).scalar_one()

        # Pipeline velocity = (deals * win_rate * avg_value) / avg_cycle
        won_count = (
            await self.session.execute(
                select(func.count(CRMDeal.id)).where(
                    CRMDeal.status == "won", CRMDeal.actual_close_date >= start
                )
            )
        ).scalar_one()

        win_rate = (won_count / closed_count) if closed_count else 0
        avg_cycle_raw = (
            await self.session.execute(
                select(
                    func.avg(
                        func.julianday(CRMDeal.actual_close_date)
                        - func.julianday(CRMDeal.created_at)
                    )
                ).where(
                    CRMDeal.status == "won",
                    CRMDeal.actual_close_date >= start,
                    CRMDeal.actual_close_date.isnot(None),
                )
            )
        ).scalar_one()
        avg_cycle = avg_cycle_raw if avg_cycle_raw else 1

        velocity = round(
            (created_count * win_rate * float(avg_created_value)) / avg_cycle, 2
        )

        result: dict[str, Any] = {
            "period": period,
            "deals_created": created_count,
            "deals_closed": closed_count,
            "win_rate": round(win_rate * 100, 1),
            "avg_deal_value": round(float(avg_created_value), 2),
            "avg_cycle_days": round(avg_cycle, 1),
            "velocity": velocity,
        }
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result

    # ----- Lead Source Performance --------------------------------------

    async def get_lead_source_analytics(self, period: str = "30d") -> dict[str, Any]:
        """Performance comparison by lead source."""
        cache_key = f"analytics:sources:{period}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        start = _period_start(period)

        source_q = (
            select(
                CRMContact.source,
                func.count(CRMContact.id).label("contacts"),
            )
            .where(
                CRMContact.is_archived.is_(False),
                CRMContact.source.isnot(None),
                CRMContact.created_at >= start,
            )
            .group_by(CRMContact.source)
        )
        source_rows = (await self.session.execute(source_q)).all()

        # For each source, get deal conversion
        sources = []
        for sr in source_rows:
            won_q = (
                select(
                    func.count(CRMDeal.id).label("won"),
                    func.coalesce(func.sum(CRMDeal.value), 0).label("value"),
                )
                .join(CRMContact, CRMDeal.contact_id == CRMContact.id)
                .where(CRMContact.source == sr.source, CRMDeal.status == "won")
            )
            won_row = (await self.session.execute(won_q)).one()

            total_deals_q = (
                select(func.count(CRMDeal.id))
                .join(CRMContact, CRMDeal.contact_id == CRMContact.id)
                .where(CRMContact.source == sr.source)
            )
            total_deals = (await self.session.execute(total_deals_q)).scalar_one()

            sources.append({
                "source": sr.source,
                "contacts": sr.contacts,
                "total_deals": total_deals,
                "won_deals": won_row.won,
                "revenue": float(won_row.value),
                "conversion_rate": round(
                    (won_row.won / total_deals * 100) if total_deals else 0, 1
                ),
                "avg_deal_value": round(
                    (float(won_row.value) / won_row.won) if won_row.won else 0, 2
                ),
            })

        sources.sort(key=lambda s: s["revenue"], reverse=True)

        result: dict[str, Any] = {"period": period, "sources": sources}
        self.cache.set(cache_key, result, ttl_seconds=300)
        return result
