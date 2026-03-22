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

    Top-priority insights (critical severity) are enriched with LLM reasoning.
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

        # Enrich critical insights with LLM reasoning (up to 3 to keep latency low)
        enriched = await _enrich_critical_insights(insights)

        await _broadcast_insights(enriched)

    except Exception:
        logger.error("Proactive insights tick failed", exc_info=True)


async def _enrich_critical_insights(insights: list[Insight]) -> list[Insight]:
    """Add LLM reasoning to critical insights. Returns original list if LLM unavailable."""
    try:
        from app.services.llm_service import llm_available
        if not llm_available():
            return insights
    except ImportError:
        return insights

    from app.core.db import async_session
    from app.core.shared_infra import get_background, get_event_bus
    from app.services.ai.insights_engine import AIInsightsEngine

    critical = [i for i in insights if i.severity == "critical"][:3]
    if not critical:
        return insights

    try:
        async with async_session() as session:
            engine = AIInsightsEngine(
                session=session,
                events=get_event_bus(),
                background=get_background(),
            )
            enriched_map: dict[str, dict] = {}
            for insight in critical:
                try:
                    enrichment = await engine.enrich_insight(
                        insight_type=insight.type,
                        entity_name=insight.entity_name,
                        base_description=insight.description,
                        metadata=insight.metadata,
                    )
                    enriched_map[insight.entity_id] = enrichment
                except Exception:
                    logger.debug("Enrichment failed for %s", insight.entity_id, exc_info=True)

        # Rebuild list with enriched descriptions where available
        result: list[Insight] = []
        for insight in insights:
            enrichment = enriched_map.get(insight.entity_id)
            if enrichment:
                result.append(Insight(
                    type=insight.type,
                    severity=insight.severity,
                    title=insight.title,
                    description=enrichment.get("enriched_description", insight.description),
                    entity_type=insight.entity_type,
                    entity_id=insight.entity_id,
                    entity_name=insight.entity_name,
                    owner_id=insight.owner_id,
                    metadata={
                        **insight.metadata,
                        "ai_reasoning": enrichment.get("ai_reasoning", ""),
                        "suggested_actions": enrichment.get("suggested_actions", []),
                    },
                ))
            else:
                result.append(insight)
        return result
    except Exception:
        logger.warning("LLM enrichment of insights failed; using rule-based descriptions", exc_info=True)
        return insights


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
    """Send insights to relevant users via WebSocket.

    Emits both the batch ``proactive.insights`` payload (for dashboards)
    and individual ``crm.*`` typed events (for toast notifications).
    """
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
            await hub_manager.broadcast_all(payload)
        else:
            await hub_manager.send_to_user(owner_id, payload)

    # Emit individual typed CRM events for toast notifications
    await _emit_crm_notifications(insights)


# ---------------------------------------------------------------------------
# Typed CRM notification emission (consumed by frontend toast system)
# ---------------------------------------------------------------------------

# Maps insight types to CRM WebSocket event types
_INSIGHT_TO_CRM_EVENT: dict[str, str] = {
    "deal_at_risk": "crm.deal_risk",
    "deal_stale": "crm.deal_risk",
    "contact_cold": "crm.stale_contact",
    "missing_follow_up": "crm.stale_contact",
}


async def _emit_crm_notifications(insights: Sequence[Insight]) -> None:
    """Emit individual ``crm.*`` typed WebSocket events for each insight.

    These are consumed by the frontend ``useCRMNotifications`` hook to
    render toast notifications with contextual action buttons.
    """
    for insight in insights:
        crm_type = _INSIGHT_TO_CRM_EVENT.get(insight.type)
        if crm_type is None:
            continue

        payload = _build_crm_payload(crm_type, insight)
        if insight.owner_id:
            await hub_manager.send_to_user(insight.owner_id, payload)
        else:
            await hub_manager.broadcast_all(payload)


def _build_crm_payload(crm_type: str, insight: Insight) -> dict:
    """Build a CRM notification payload matching frontend expectations."""
    meta = insight.metadata

    if crm_type == "crm.deal_risk":
        return {
            "type": crm_type,
            "deal_name": insight.entity_name,
            "risk_level": "CRITICAL" if insight.severity == "critical" else "HIGH",
            "contact_id": meta.get("contact_id"),
            "deal_id": insight.entity_id,
            "days_stale": meta.get("days_stale"),
        }

    if crm_type == "crm.stale_contact":
        return {
            "type": crm_type,
            "contact_name": insight.entity_name,
            "contact_id": insight.entity_id,
            "days_since_contact": meta.get("days_cold") or meta.get("hours_overdue", 0) // 24,
        }

    return {"type": crm_type}
