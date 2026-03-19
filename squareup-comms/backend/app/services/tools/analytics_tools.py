"""Analytics built-in tools — aggregate CRM metrics and pipeline summaries."""

from __future__ import annotations

from sqlmodel import select, func

from app.core.db import async_session
from app.models.crm_deal import CRMDeal
from app.models.crm import CRMContact
from app.models.crm_pipeline import CRMPipeline
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def get_deal_metrics(inp: dict, ctx: ToolContext) -> ToolResult:
    """Aggregate deal metrics — total value, counts by status, avg value."""
    status_filter = inp.get("status")  # optional: "open" | "won" | "lost"

    async with async_session() as session:
        base = select(CRMDeal)
        if status_filter:
            base = base.where(CRMDeal.status == status_filter)

        rows = await session.execute(base)
        deals = rows.scalars().all()

        if not deals:
            return ToolResult(success=True, output={
                "total_deals": 0,
                "total_value": 0,
                "average_value": 0,
                "by_status": {},
            })

        total_value = sum(d.value or 0 for d in deals)
        values_present = [d.value for d in deals if d.value is not None]
        avg_value = (total_value / len(values_present)) if values_present else 0

        by_status: dict[str, dict] = {}
        for d in deals:
            entry = by_status.setdefault(d.status, {"count": 0, "value": 0})
            by_status[d.status] = {
                "count": entry["count"] + 1,
                "value": entry["value"] + (d.value or 0),
            }

        return ToolResult(success=True, output={
            "total_deals": len(deals),
            "total_value": total_value,
            "average_value": round(avg_value, 2),
            "by_status": by_status,
        })


async def get_contact_stats(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get total contact count and recent contact additions."""
    days_back = inp.get("days_back", 30)

    async with async_session() as session:
        # Total count
        total_q = await session.execute(select(func.count()).select_from(CRMContact))
        total_count = total_q.scalar_one()

        # Recent count
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        recent_q = await session.execute(
            select(func.count()).select_from(CRMContact).where(CRMContact.created_at >= cutoff)
        )
        recent_count = recent_q.scalar_one()

    return ToolResult(success=True, output={
        "total_contacts": total_count,
        "new_contacts_last_n_days": recent_count,
        "days_back": days_back,
    })


async def get_pipeline_summary(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get a summary of all pipelines with deal counts and total value per stage."""
    pipeline_id = inp.get("pipeline_id")

    async with async_session() as session:
        # Load pipelines
        stmt = select(CRMPipeline).where(CRMPipeline.is_archived == False)  # noqa: E712
        if pipeline_id:
            stmt = stmt.where(CRMPipeline.id == pipeline_id)
        pipe_rows = await session.execute(stmt)
        pipelines = pipe_rows.scalars().all()

        if not pipelines:
            return ToolResult(success=True, output={"pipelines": [], "message": "No pipelines found"})

        result = []
        for p in pipelines:
            # Get open deals in this pipeline
            deals_q = await session.execute(
                select(CRMDeal)
                .where(CRMDeal.pipeline_id == p.id, CRMDeal.status == "open")
            )
            deals = deals_q.scalars().all()

            stage_summary: dict[str, dict] = {}
            for d in deals:
                entry = stage_summary.setdefault(d.stage, {"count": 0, "value": 0})
                stage_summary[d.stage] = {
                    "count": entry["count"] + 1,
                    "value": entry["value"] + (d.value or 0),
                }

            result.append({
                "id": p.id,
                "name": p.name,
                "total_open_deals": len(deals),
                "total_open_value": sum(d.value or 0 for d in deals),
                "stages": stage_summary,
            })

    return ToolResult(success=True, output={"pipelines": result})


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="get_deal_metrics",
        display_name="Deal Metrics",
        description="Get aggregate deal metrics — total count, total value, average value, and breakdown by status (open/won/lost).",
        category="analytics",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["open", "won", "lost"], "description": "Optional: filter to a specific deal status"},
            },
        },
        handler=get_deal_metrics,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_contact_stats",
        display_name="Contact Stats",
        description="Get total contact count and how many new contacts were added in the last N days.",
        category="analytics",
        input_schema={
            "type": "object",
            "properties": {
                "days_back": {"type": "integer", "description": "Number of days to look back for new contacts (default 30)"},
            },
        },
        handler=get_contact_stats,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_pipeline_summary",
        display_name="Pipeline Summary",
        description="Get a summary of sales pipelines with deal counts and total value per stage. Optionally filter to a specific pipeline.",
        category="analytics",
        input_schema={
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string", "description": "Optional: specific pipeline ID to summarize"},
            },
        },
        handler=get_pipeline_summary,
    ))
