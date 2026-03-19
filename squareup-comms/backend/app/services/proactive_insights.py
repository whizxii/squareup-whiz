"""Proactive insights engine — detects deal staleness, missing follow-ups,
upcoming deadlines, and posts actionable suggestions to users."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Sequence

from sqlmodel import select, func, col

from app.core.db import async_session
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.tasks import Task
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration — thresholds for proactive alerts
# ---------------------------------------------------------------------------

_DEAL_STALE_DAYS = 7  # Deal untouched for 7+ days → stale
_DEAL_AT_RISK_DAYS = 14  # Deal untouched for 14+ days → at risk
_CONTACT_COLD_DAYS = 14  # Contact with no activity for 14+ days
_TASK_DUE_SOON_HOURS = 24  # Tasks due within 24 hours
_TASK_OVERDUE_GRACE_HOURS = 0  # Overdue tasks alerted immediately


# ---------------------------------------------------------------------------
# Insight types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Insight:
    """An immutable proactive insight to surface to a user."""
    type: str  # "deal_stale" | "deal_at_risk" | "contact_cold" | "task_due_soon" | "task_overdue" | "missing_follow_up"
    severity: str  # "info" | "warning" | "critical"
    title: str
    description: str
    entity_type: str  # "deal" | "contact" | "task"
    entity_id: str
    entity_name: str
    owner_id: str | None  # User who should see this
    metadata: dict  # Extra context (value, days_stale, etc.)


# ---------------------------------------------------------------------------
# Public API — called from scheduler
# ---------------------------------------------------------------------------

async def run_proactive_insights() -> None:
    """Detect and broadcast all proactive insights.

    Called every scheduler tick (60s), but most checks only produce
    new insights when thresholds are crossed.
    """
    try:
        insights: list[Insight] = []

        stale_deals = await _detect_stale_deals()
        insights.extend(stale_deals)

        cold_contacts = await _detect_cold_contacts()
        insights.extend(cold_contacts)

        task_alerts = await _detect_task_deadlines()
        insights.extend(task_alerts)

        missing_followups = await _detect_missing_follow_ups()
        insights.extend(missing_followups)

        if not insights:
            return

        logger.info("Generated %d proactive insights", len(insights))
        await _broadcast_insights(insights)

    except Exception:
        logger.error("Proactive insights tick failed", exc_info=True)


# ---------------------------------------------------------------------------
# Detectors
# ---------------------------------------------------------------------------

async def _detect_stale_deals() -> list[Insight]:
    """Find open deals that haven't been updated in a while."""
    now = datetime.utcnow()
    stale_cutoff = now - timedelta(days=_DEAL_STALE_DAYS)
    risk_cutoff = now - timedelta(days=_DEAL_AT_RISK_DAYS)

    async with async_session() as session:
        stmt = (
            select(CRMDeal)
            .where(
                CRMDeal.status == "open",
                CRMDeal.updated_at < stale_cutoff,
            )
            .order_by(col(CRMDeal.updated_at).asc())
            .limit(50)
        )
        result = await session.execute(stmt)
        deals = list(result.scalars().all())

    insights: list[Insight] = []
    for deal in deals:
        days_stale = (now - deal.updated_at).days
        is_at_risk = deal.updated_at < risk_cutoff

        severity = "critical" if is_at_risk else "warning"
        insight_type = "deal_at_risk" if is_at_risk else "deal_stale"

        value_str = f" (${deal.value:,.0f})" if deal.value else ""
        title = (
            f"Deal at risk: {deal.title}{value_str}"
            if is_at_risk
            else f"Stale deal: {deal.title}{value_str}"
        )
        description = (
            f"'{deal.title}' has been in the '{deal.stage}' stage for {days_stale} days "
            f"with no updates. "
        )
        if is_at_risk:
            description += "This deal is at serious risk of going cold. Consider reaching out immediately."
        else:
            description += "Consider scheduling a follow-up to keep momentum."

        insights.append(Insight(
            type=insight_type,
            severity=severity,
            title=title,
            description=description,
            entity_type="deal",
            entity_id=deal.id,
            entity_name=deal.title,
            owner_id=deal.owner_id,
            metadata={
                "days_stale": days_stale,
                "stage": deal.stage,
                "value": deal.value,
                "deal_health": deal.deal_health,
                "pipeline_id": deal.pipeline_id,
                "contact_id": deal.contact_id,
            },
        ))

    return insights


async def _detect_cold_contacts() -> list[Insight]:
    """Find contacts with no recent activity."""
    now = datetime.utcnow()
    cold_cutoff = now - timedelta(days=_CONTACT_COLD_DAYS)

    async with async_session() as session:
        stmt = (
            select(CRMContact)
            .where(
                CRMContact.last_activity_at < cold_cutoff,
                CRMContact.lifecycle_stage.in_(["lead", "mql", "sql", "opportunity"]),
            )
            .order_by(col(CRMContact.last_activity_at).asc())
            .limit(50)
        )
        result = await session.execute(stmt)
        contacts = list(result.scalars().all())

    insights: list[Insight] = []
    for contact in contacts:
        days_cold = (now - contact.last_activity_at).days if contact.last_activity_at else 999

        insights.append(Insight(
            type="contact_cold",
            severity="warning",
            title=f"Cold contact: {contact.name}",
            description=(
                f"{contact.name} ({contact.lifecycle_stage}) hasn't had any activity "
                f"in {days_cold} days. Consider reaching out to maintain the relationship."
            ),
            entity_type="contact",
            entity_id=contact.id,
            entity_name=contact.name,
            owner_id=contact.owner_id,
            metadata={
                "days_cold": days_cold,
                "lifecycle_stage": contact.lifecycle_stage,
                "email": contact.email,
                "lead_score": contact.lead_score,
                "relationship_strength": contact.relationship_strength,
            },
        ))

    return insights


async def _detect_task_deadlines() -> list[Insight]:
    """Find tasks that are overdue or due soon."""
    now = datetime.utcnow()
    due_soon_cutoff = now + timedelta(hours=_TASK_DUE_SOON_HOURS)

    async with async_session() as session:
        # Overdue tasks
        overdue_stmt = (
            select(Task)
            .where(
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date.isnot(None),  # type: ignore[union-attr]
                Task.due_date < now,
            )
            .order_by(col(Task.due_date).asc())
            .limit(50)
        )
        overdue_result = await session.execute(overdue_stmt)
        overdue_tasks = list(overdue_result.scalars().all())

        # Due soon tasks
        due_soon_stmt = (
            select(Task)
            .where(
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date.isnot(None),  # type: ignore[union-attr]
                Task.due_date >= now,
                Task.due_date <= due_soon_cutoff,
            )
            .order_by(col(Task.due_date).asc())
            .limit(50)
        )
        due_soon_result = await session.execute(due_soon_stmt)
        due_soon_tasks = list(due_soon_result.scalars().all())

    insights: list[Insight] = []

    for task in overdue_tasks:
        hours_overdue = int((now - task.due_date).total_seconds() / 3600)
        insights.append(Insight(
            type="task_overdue",
            severity="critical",
            title=f"Overdue: {task.title}",
            description=(
                f"Task '{task.title}' ({task.priority} priority) is overdue "
                f"by {hours_overdue} hours. Assigned to user."
            ),
            entity_type="task",
            entity_id=task.id,
            entity_name=task.title,
            owner_id=task.assigned_to,
            metadata={
                "hours_overdue": hours_overdue,
                "priority": task.priority,
                "status": task.status,
                "due_date": task.due_date.isoformat() if task.due_date else None,
            },
        ))

    for task in due_soon_tasks:
        hours_until_due = int((task.due_date - now).total_seconds() / 3600)
        insights.append(Insight(
            type="task_due_soon",
            severity="warning",
            title=f"Due soon: {task.title}",
            description=(
                f"Task '{task.title}' ({task.priority} priority) is due "
                f"in {hours_until_due} hours."
            ),
            entity_type="task",
            entity_id=task.id,
            entity_name=task.title,
            owner_id=task.assigned_to,
            metadata={
                "hours_until_due": hours_until_due,
                "priority": task.priority,
                "status": task.status,
                "due_date": task.due_date.isoformat() if task.due_date else None,
            },
        ))

    return insights


async def _detect_missing_follow_ups() -> list[Insight]:
    """Find contacts with a next_follow_up_at that has passed without activity."""
    now = datetime.utcnow()

    async with async_session() as session:
        stmt = (
            select(CRMContact)
            .where(
                CRMContact.next_follow_up_at.isnot(None),  # type: ignore[union-attr]
                CRMContact.next_follow_up_at < now,
            )
            .order_by(col(CRMContact.next_follow_up_at).asc())
            .limit(50)
        )
        result = await session.execute(stmt)
        contacts = list(result.scalars().all())

    insights: list[Insight] = []
    for contact in contacts:
        hours_overdue = int((now - contact.next_follow_up_at).total_seconds() / 3600)

        # Only alert if the follow-up was actually missed (no activity since)
        if contact.last_activity_at and contact.last_activity_at > contact.next_follow_up_at:
            continue  # Activity happened after follow-up date — not missed

        insights.append(Insight(
            type="missing_follow_up",
            severity="warning" if hours_overdue < 48 else "critical",
            title=f"Missed follow-up: {contact.name}",
            description=(
                f"A follow-up with {contact.name} was scheduled for "
                f"{contact.next_follow_up_at.strftime('%b %d at %I:%M %p')} "
                f"({hours_overdue}h ago) but no activity has been logged."
            ),
            entity_type="contact",
            entity_id=contact.id,
            entity_name=contact.name,
            owner_id=contact.owner_id,
            metadata={
                "hours_overdue": hours_overdue,
                "follow_up_at": contact.next_follow_up_at.isoformat(),
                "email": contact.email,
                "lifecycle_stage": contact.lifecycle_stage,
            },
        ))

    return insights


# ---------------------------------------------------------------------------
# Broadcasting
# ---------------------------------------------------------------------------

async def _broadcast_insights(insights: Sequence[Insight]) -> None:
    """Send insights to relevant users via WebSocket."""
    # Group insights by owner_id for efficient delivery
    by_owner: dict[str | None, list[Insight]] = {}
    for insight in insights:
        owner = insight.owner_id or "__global__"
        by_owner.setdefault(owner, []).append(insight)

    for owner_id, owner_insights in by_owner.items():
        payload = {
            "type": "proactive.insights",
            "insights": [
                {
                    "type": insight.type,
                    "severity": insight.severity,
                    "title": insight.title,
                    "description": insight.description,
                    "entity_type": insight.entity_type,
                    "entity_id": insight.entity_id,
                    "entity_name": insight.entity_name,
                    "metadata": insight.metadata,
                }
                for insight in owner_insights
            ],
            "count": len(owner_insights),
            "generated_at": datetime.utcnow().isoformat(),
        }

        if owner_id == "__global__":
            # Broadcast to all connected users
            await hub_manager.broadcast_all(payload)
        else:
            # Send targeted insights to the specific owner
            await hub_manager.send_to_user(owner_id, payload)
