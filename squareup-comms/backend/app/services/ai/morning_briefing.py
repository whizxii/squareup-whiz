"""Morning Briefing service — aggregates CRM data into a personalized daily briefing."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.models.crm_calendar import CRMCalendarEvent
from app.models.crm_deal import CRMDeal
from app.services.base import BaseService

logger = get_logger(__name__)

_CACHE_KEY = "morning_briefing:latest"
_CACHE_TTL = 300  # 5 minutes


@dataclass(frozen=True)
class BriefingItem:
    """A single attention item in the morning briefing."""

    category: str  # "deal_risk" | "stale_contact" | "hot_lead" | "meeting" | "action"
    title: str
    description: str
    priority: str  # "high" | "medium" | "low"
    entity_id: str | None = None
    entity_type: str | None = None  # "contact" | "deal" | "event"
    actions: tuple[str, ...] = ()


@dataclass(frozen=True)
class MorningBriefing:
    """Complete morning briefing payload."""

    greeting: str
    date: str
    attention_items: tuple[BriefingItem, ...]
    pipeline_summary: dict[str, Any]
    todays_meetings: tuple[dict[str, Any], ...]
    hot_leads_count: int
    stale_contacts_count: int
    at_risk_deals_count: int


class MorningBriefingService(BaseService):
    """Aggregates data from multiple CRM services into a single morning briefing."""

    async def generate_briefing(self) -> dict[str, Any]:
        """Generate a comprehensive morning briefing.

        Aggregates:
        - At-risk deals (stalled or declining health)
        - Stale contacts (no activity in 14+ days)
        - Hot leads (lead score >= 70)
        - Today's upcoming meetings
        - Pipeline KPI summary
        """
        cached = self.cache.get(_CACHE_KEY)
        if cached is not None:
            return cached

        now = datetime.utcnow()

        # Run all queries concurrently-ish (sequential in same session)
        at_risk_deals = await self._get_at_risk_deals()
        stale_contacts = await self._get_stale_contacts(now)
        hot_leads = await self._get_hot_leads()
        todays_meetings = await self._get_todays_meetings(now)
        pipeline_summary = await self._get_pipeline_summary()

        attention_items = self._build_attention_items(
            at_risk_deals=at_risk_deals,
            stale_contacts=stale_contacts,
            hot_leads=hot_leads,
            todays_meetings=todays_meetings,
        )

        # Sort: high > medium > low
        priority_order = {"high": 0, "medium": 1, "low": 2}
        sorted_items = tuple(
            sorted(attention_items, key=lambda i: priority_order.get(i.priority, 9))
        )

        greeting = _build_greeting(now)
        date_str = now.strftime("%A, %B %d, %Y")

        meetings_data = tuple(
            {
                "id": m.id,
                "title": m.title,
                "start_at": m.start_at.isoformat(),
                "end_at": m.end_at.isoformat(),
                "event_type": m.event_type,
                "contact_id": m.contact_id,
                "status": m.status,
            }
            for m in todays_meetings
        )

        briefing = MorningBriefing(
            greeting=greeting,
            date=date_str,
            attention_items=sorted_items,
            pipeline_summary=pipeline_summary,
            todays_meetings=meetings_data,
            hot_leads_count=len(hot_leads),
            stale_contacts_count=len(stale_contacts),
            at_risk_deals_count=len(at_risk_deals),
        )

        result = _serialize_briefing(briefing)
        self.cache.set(_CACHE_KEY, result, ttl=_CACHE_TTL)
        logger.info(
            "Generated morning briefing: %d attention items, %d meetings",
            len(sorted_items),
            len(todays_meetings),
        )
        return result

    # ── Private query methods ───────────────────────────────────────

    async def _get_at_risk_deals(self) -> list[CRMDeal]:
        """Deals with health_score in yellow/red zone or stalled > 14 days."""
        cutoff = datetime.utcnow() - timedelta(days=14)
        stmt = (
            select(CRMDeal)
            .where(CRMDeal.status == "open")
            .where(
                (CRMDeal.deal_health.in_(["yellow", "red"]))
                | (CRMDeal.updated_at < cutoff)
            )
            .order_by(CRMDeal.value.desc().nullslast())
            .limit(10)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_stale_contacts(self, now: datetime) -> list[CRMContact]:
        """Contacts with no activity in 14+ days."""
        cutoff = now - timedelta(days=14)
        stmt = (
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .where(
                (CRMContact.last_activity_at < cutoff)
                | (CRMContact.last_activity_at.is_(None))
            )
            .order_by(CRMContact.lead_score.desc().nullslast())
            .limit(20)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_hot_leads(self) -> list[CRMContact]:
        """Contacts with lead score >= 70."""
        stmt = (
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .where(CRMContact.lead_score >= 70)
            .order_by(CRMContact.lead_score.desc())
            .limit(20)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_todays_meetings(self, now: datetime) -> list[CRMCalendarEvent]:
        """Scheduled events for today."""
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        stmt = (
            select(CRMCalendarEvent)
            .where(CRMCalendarEvent.status == "scheduled")
            .where(CRMCalendarEvent.start_at >= day_start)
            .where(CRMCalendarEvent.start_at < day_end)
            .order_by(CRMCalendarEvent.start_at.asc())
            .limit(20)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_pipeline_summary(self) -> dict[str, Any]:
        """Quick pipeline KPIs."""
        # Total open deals + total value
        stmt_deals = select(CRMDeal).where(CRMDeal.status == "open")
        result = await self.session.execute(stmt_deals)
        open_deals = list(result.scalars().all())

        total_value = sum(d.value or 0 for d in open_deals)
        avg_value = total_value / len(open_deals) if open_deals else 0

        # Won deals this month
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        stmt_won = (
            select(CRMDeal)
            .where(CRMDeal.status == "won")
            .where(CRMDeal.actual_close_date >= month_start)
        )
        result_won = await self.session.execute(stmt_won)
        won_deals = list(result_won.scalars().all())
        won_value = sum(d.value or 0 for d in won_deals)

        return {
            "open_deals": len(open_deals),
            "total_pipeline_value": total_value,
            "avg_deal_value": round(avg_value, 2),
            "won_this_month": len(won_deals),
            "won_value_this_month": won_value,
        }

    # ── Attention item builders ─────────────────────────────────────

    def _build_attention_items(
        self,
        *,
        at_risk_deals: list[CRMDeal],
        stale_contacts: list[CRMContact],
        hot_leads: list[CRMContact],
        todays_meetings: list[CRMCalendarEvent],
    ) -> list[BriefingItem]:
        items: list[BriefingItem] = []

        # At-risk deals (top 5)
        for deal in at_risk_deals[:5]:
            value_str = f"${deal.value:,.0f}" if deal.value else "No value set"
            items.append(BriefingItem(
                category="deal_risk",
                title=f"{deal.title} needs attention",
                description=(
                    f"{value_str} deal in {deal.stage} stage — "
                    f"health: {deal.deal_health or 'unknown'}"
                ),
                priority="high",
                entity_id=deal.id,
                entity_type="deal",
                actions=("View deal", "Schedule follow-up"),
            ))

        # Stale contacts (top 5 by lead score)
        for contact in stale_contacts[:5]:
            days_since = "never"
            if contact.last_activity_at:
                delta = datetime.utcnow() - contact.last_activity_at
                days_since = f"{delta.days} days ago"
            items.append(BriefingItem(
                category="stale_contact",
                title=f"Re-engage {contact.name or 'Unknown'}",
                description=(
                    f"Last activity: {days_since}. "
                    f"Lead score: {contact.lead_score or 0}"
                ),
                priority="medium",
                entity_id=contact.id,
                entity_type="contact",
                actions=("Send email", "Schedule call"),
            ))

        # Hot leads (top 3, only new ones not already in attention)
        for lead in hot_leads[:3]:
            items.append(BriefingItem(
                category="hot_lead",
                title=f"Hot lead: {lead.name or 'Unknown'} (Score: {lead.lead_score})",
                description=(
                    f"{lead.title or ''} at {lead.company or 'Unknown'}"
                ).strip(),
                priority="medium",
                entity_id=lead.id,
                entity_type="contact",
                actions=("View contact", "Start sequence"),
            ))

        # Today's meetings (all)
        for meeting in todays_meetings:
            time_str = meeting.start_at.strftime("%I:%M %p")
            items.append(BriefingItem(
                category="meeting",
                title=f"{meeting.title} at {time_str}",
                description=f"Type: {meeting.event_type}",
                priority="high" if meeting.event_type in ("demo", "meeting") else "medium",
                entity_id=meeting.id,
                entity_type="event",
                actions=("View prep", "Join meeting"),
            ))

        return items


# ── Helpers ─────────────────────────────────────────────────────────


def _build_greeting(now: datetime) -> str:
    hour = now.hour
    if hour < 12:
        return "Good morning"
    if hour < 17:
        return "Good afternoon"
    return "Good evening"


def _serialize_briefing(briefing: MorningBriefing) -> dict[str, Any]:
    return {
        "greeting": briefing.greeting,
        "date": briefing.date,
        "attention_items": [asdict(item) for item in briefing.attention_items],
        "pipeline_summary": briefing.pipeline_summary,
        "todays_meetings": list(briefing.todays_meetings),
        "hot_leads_count": briefing.hot_leads_count,
        "stale_contacts_count": briefing.stale_contacts_count,
        "at_risk_deals_count": briefing.at_risk_deals_count,
    }
