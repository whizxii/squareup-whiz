"""Intelligence report tools — weekly workspace reports and catch-up summaries."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlmodel import select, func, col

from app.core.db import async_session
from app.models.crm import CRMContact
from app.models.crm_deal import CRMDeal
from app.models.crm_company import CRMCompany
from app.models.tasks import Task
from app.models.agents import AgentExecution
from app.models.chat import Message
from app.services.tools.registry import (
    ToolDefinition,
    ToolResult,
    ToolContext,
    ToolRegistry,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _gather_period_stats(since: datetime) -> dict:
    """Gather cross-module stats for a given time window."""
    async with async_session() as session:
        # --- Contacts ---
        new_contacts_q = await session.execute(
            select(func.count())
            .select_from(CRMContact)
            .where(col(CRMContact.created_at) >= since)
        )
        new_contacts = new_contacts_q.scalar_one()

        total_contacts_q = await session.execute(
            select(func.count()).select_from(CRMContact)
        )
        total_contacts = total_contacts_q.scalar_one()

        # --- Deals ---
        new_deals_q = await session.execute(
            select(CRMDeal).where(col(CRMDeal.created_at) >= since)
        )
        new_deals = list(new_deals_q.scalars().all())

        won_deals_q = await session.execute(
            select(CRMDeal).where(
                col(CRMDeal.status) == "won",
                col(CRMDeal.actual_close_date) >= since,
            )
        )
        won_deals = list(won_deals_q.scalars().all())

        lost_deals_q = await session.execute(
            select(CRMDeal).where(
                col(CRMDeal.status) == "lost",
                col(CRMDeal.updated_at) >= since,
            )
        )
        lost_deals = list(lost_deals_q.scalars().all())

        # Open pipeline
        open_deals_q = await session.execute(
            select(CRMDeal).where(col(CRMDeal.status) == "open")
        )
        open_deals = list(open_deals_q.scalars().all())

        # Stale deals (open, stage not changed in 7+ days)
        stale_cutoff = datetime.utcnow() - timedelta(days=7)
        stale_deals = [
            d for d in open_deals
            if d.stage_entered_at and d.stage_entered_at < stale_cutoff
        ]

        # Deal health breakdown
        health_counts: dict[str, int] = {}
        for d in open_deals:
            health_counts[d.deal_health] = health_counts.get(d.deal_health, 0) + 1

        # Stage breakdown
        stage_breakdown: dict[str, dict] = {}
        for d in open_deals:
            entry = stage_breakdown.get(d.stage, {"count": 0, "value": 0.0})
            stage_breakdown[d.stage] = {
                "count": entry["count"] + 1,
                "value": entry["value"] + (d.value or 0),
            }

        # --- Tasks ---
        tasks_created_q = await session.execute(
            select(func.count())
            .select_from(Task)
            .where(col(Task.created_at) >= since)
        )
        tasks_created = tasks_created_q.scalar_one()

        tasks_completed_q = await session.execute(
            select(func.count())
            .select_from(Task)
            .where(col(Task.status) == "done", col(Task.updated_at) >= since)
        )
        tasks_completed = tasks_completed_q.scalar_one()

        overdue_tasks_q = await session.execute(
            select(func.count())
            .select_from(Task)
            .where(
                col(Task.status) != "done",
                col(Task.due_date) < datetime.utcnow(),
            )
        )
        overdue_tasks = overdue_tasks_q.scalar_one()

        # --- Companies ---
        new_companies_q = await session.execute(
            select(func.count())
            .select_from(CRMCompany)
            .where(col(CRMCompany.created_at) >= since)
        )
        new_companies = new_companies_q.scalar_one()

        # --- Agent activity ---
        agent_runs_q = await session.execute(
            select(func.count())
            .select_from(AgentExecution)
            .where(col(AgentExecution.created_at) >= since)
        )
        agent_runs = agent_runs_q.scalar_one()

        agent_cost_q = await session.execute(
            select(func.coalesce(func.sum(AgentExecution.total_cost_usd), 0))
            .where(col(AgentExecution.created_at) >= since)
        )
        agent_cost = float(agent_cost_q.scalar_one())

        # --- Messages ---
        messages_q = await session.execute(
            select(func.count())
            .select_from(Message)
            .where(col(Message.created_at) >= since)
        )
        message_count = messages_q.scalar_one()

    return {
        "period_start": since.isoformat(),
        "period_end": datetime.utcnow().isoformat(),
        "contacts": {
            "total": total_contacts,
            "new": new_contacts,
        },
        "deals": {
            "new": len(new_deals),
            "new_value": sum(d.value or 0 for d in new_deals),
            "won": len(won_deals),
            "won_value": sum(d.value or 0 for d in won_deals),
            "lost": len(lost_deals),
            "lost_value": sum(d.value or 0 for d in lost_deals),
            "open_total": len(open_deals),
            "open_total_value": sum(d.value or 0 for d in open_deals),
            "stale_count": len(stale_deals),
            "stale_deals": [
                {"title": d.title, "stage": d.stage, "value": d.value}
                for d in stale_deals[:5]
            ],
            "health": health_counts,
            "pipeline_by_stage": stage_breakdown,
        },
        "tasks": {
            "created": tasks_created,
            "completed": tasks_completed,
            "overdue": overdue_tasks,
        },
        "companies": {
            "new": new_companies,
        },
        "agent_activity": {
            "total_runs": agent_runs,
            "total_cost_usd": round(agent_cost, 4),
        },
        "messages": {
            "total": message_count,
        },
    }


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def generate_weekly_report(inp: dict, ctx: ToolContext) -> ToolResult:
    """Generate a comprehensive weekly intelligence report.

    Aggregates CRM deals, contacts, tasks, agent activity, and messages
    from the past 7 days into a structured report suitable for LLM
    summarisation.
    """
    days = inp.get("days", 7)
    since = datetime.utcnow() - timedelta(days=max(days, 1))

    try:
        stats = await _gather_period_stats(since)
        stats["report_type"] = "weekly_intelligence"
        stats["days_covered"] = days
        return ToolResult(success=True, output=stats)
    except Exception as exc:
        logger.exception("weekly report generation failed")
        return ToolResult(success=False, error=str(exc))


async def catch_up_summary(inp: dict, ctx: ToolContext) -> ToolResult:
    """Generate a 'what did I miss' catch-up summary.

    Designed for users returning after being away. Gathers recent
    activity, highlights, and action items.
    """
    hours = inp.get("hours", 24)
    since = datetime.utcnow() - timedelta(hours=max(hours, 1))

    try:
        stats = await _gather_period_stats(since)

        # Add recent high-priority tasks assigned to requesting user
        async with async_session() as session:
            urgent_tasks_q = await session.execute(
                select(Task)
                .where(
                    col(Task.assigned_to) == ctx.user_id,
                    col(Task.status) != "done",
                    col(Task.priority).in_(["high", "urgent"]),
                )
                .order_by(col(Task.due_date).asc())
                .limit(10)
            )
            urgent_tasks = list(urgent_tasks_q.scalars().all())

            # Recent won deals (celebrate!)
            recent_wins_q = await session.execute(
                select(CRMDeal)
                .where(
                    col(CRMDeal.status) == "won",
                    col(CRMDeal.actual_close_date) >= since,
                )
                .limit(5)
            )
            recent_wins = list(recent_wins_q.scalars().all())

        stats["report_type"] = "catch_up"
        stats["hours_covered"] = hours
        stats["your_urgent_tasks"] = [
            {
                "title": t.title,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "status": t.status,
            }
            for t in urgent_tasks
        ]
        stats["recent_wins"] = [
            {
                "title": d.title,
                "value": d.value,
                "close_date": d.actual_close_date.isoformat() if d.actual_close_date else None,
            }
            for d in recent_wins
        ]

        return ToolResult(success=True, output=stats)
    except Exception as exc:
        logger.exception("catch-up summary generation failed")
        return ToolResult(success=False, error=str(exc))


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="generate_weekly_report",
        display_name="Weekly Intelligence Report",
        description=(
            "Generate a comprehensive weekly intelligence report covering "
            "deal pipeline movement, new contacts, task completion rates, "
            "agent activity, stale deals, and workspace health. Use this "
            "for Friday wrap-ups or Monday planning sessions."
        ),
        category="analytics",
        input_schema={
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Number of days to cover (default 7)",
                },
            },
        },
        handler=generate_weekly_report,
    ))

    registry.register_builtin(ToolDefinition(
        name="catch_up_summary",
        display_name="Catch-Up Summary",
        description=(
            "Generate a 'what did I miss' summary for a returning user. "
            "Covers recent CRM changes, new messages, completed tasks, "
            "deal wins, and urgent items needing attention. Use when "
            "someone says 'what did I miss' or returns after being away."
        ),
        category="analytics",
        input_schema={
            "type": "object",
            "properties": {
                "hours": {
                    "type": "integer",
                    "description": "How many hours to look back (default 24)",
                },
            },
        },
        handler=catch_up_summary,
    ))
