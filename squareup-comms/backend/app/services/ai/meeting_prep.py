"""Meeting prep service — generates AI briefing packs before meetings.

In production, this would aggregate real CRM data and use Claude AI to
generate tailored talking points. The mock produces realistic prep content.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any

from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.models.crm_calendar import CRMCalendarEvent
from app.models.crm_deal import CRMDeal
from app.repositories.crm_contact_repo import ContactRepository
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class ActionItem:
    text: str
    assignee: str | None
    due_date: str | None
    is_completed: bool


@dataclass(frozen=True)
class MeetingPrepResult:
    contact_summary: str
    company_overview: str
    deal_status: str | None
    recent_interactions: tuple[str, ...]
    open_action_items: tuple[ActionItem, ...]
    talking_points: tuple[str, ...]
    potential_objections: tuple[str, ...]
    relationship_strength: int


# ─── Mock prep templates ─────────────────────────────────────────────

_MOCK_CONTACT_SUMMARIES = [
    "{name} is a {title} at {company}. They've been in our pipeline for 3 months with "
    "strong engagement across email and calls. Key interest: enterprise pricing and onboarding.",
    "{name} serves as {title} at {company}. Initial outreach was 6 weeks ago. "
    "They've attended one demo and requested a follow-up on integration capabilities.",
    "{name} ({title}, {company}) is a highly engaged prospect. They've opened 8 of 10 emails, "
    "attended 2 demos, and introduced us to their technical team.",
    "{name} is the {title} at {company}. Renewal conversation initiated last month. "
    "They've expressed satisfaction but want to discuss expanded features.",
]

_MOCK_COMPANY_OVERVIEWS = [
    "{company} is a mid-market SaaS company with 150-500 employees. Series B funded, "
    "growing rapidly in the enterprise collaboration space. Key competitors: Slack, Notion.",
    "{company} is an enterprise technology firm with 1000+ employees. Recently went through "
    "digital transformation and is actively modernizing their sales stack.",
    "{company} is a fast-growing startup (50-150 employees) in the fintech space. "
    "Raised $30M Series A last quarter. Actively hiring across all departments.",
]

_MOCK_INTERACTIONS = [
    "Email: Sent pricing proposal (3 days ago) — opened, no reply yet",
    "Call: 30-min discovery call — discussed pain points with current CRM (1 week ago)",
    "Meeting: Product demo with technical team — positive feedback (2 weeks ago)",
    "Email: Shared case study from similar company — clicked through (4 days ago)",
    "Note: Champion mentioned budget approval expected by end of month",
    "Email: Follow-up on security questionnaire — responded same day (6 days ago)",
    "Call: Quick check-in call — confirmed still evaluating (10 days ago)",
]

_MOCK_TALKING_POINTS = [
    "Follow up on the pricing proposal — address any concerns about per-seat costs",
    "Showcase the new AI analytics feature released last week",
    "Discuss implementation timeline and dedicated onboarding support",
    "Share ROI data from a similar company in their industry",
    "Propose a 30-day pilot program to demonstrate value",
    "Review integration requirements with their existing tech stack",
    "Align on next steps and decision timeline",
    "Introduce the customer success team who would manage their account",
]

_MOCK_OBJECTIONS = [
    "Pricing may be too high compared to their current solution",
    "Concerned about data migration complexity and downtime",
    "Competitor offers a feature we don't have yet (custom workflows)",
    "Internal stakeholders may push back on adding another tool",
    "Security and compliance requirements (SOC 2, GDPR) not yet confirmed",
    "Budget cycle may not align — they may defer to next quarter",
]

_MOCK_ACTION_ITEMS = [
    ActionItem("Send updated pricing for enterprise tier", "Sales Rep", "2026-03-20", False),
    ActionItem("Schedule follow-up demo with IT team", "Sales Rep", "2026-03-22", False),
    ActionItem("Provide security compliance documentation", "Solutions Engineer", "2026-03-19", False),
    ActionItem("Share integration API documentation", "Developer Advocate", "2026-03-21", False),
    ActionItem("Internal: Review deal terms with manager", "Sales Rep", "2026-03-18", False),
]


class MockMeetingPrepService:
    """Generates realistic mock meeting prep briefings."""

    def prepare(
        self,
        event: CRMCalendarEvent,
        contact: CRMContact,
        deal: CRMDeal | None,
    ) -> MeetingPrepResult:
        """Generate a meeting prep briefing."""
        name = contact.name or "Contact"
        title = contact.title or "Executive"
        company = contact.company or "their company"

        contact_summary = random.choice(_MOCK_CONTACT_SUMMARIES).format(
            name=name, title=title, company=company,
        )
        company_overview = random.choice(_MOCK_COMPANY_OVERVIEWS).format(company=company)

        deal_status = None
        if deal:
            deal_status = (
                f"Active deal: {deal.title} — Stage: {deal.stage}, "
                f"Value: {deal.currency} {deal.value or 0:,.0f}, "
                f"Probability: {deal.probability}%"
            )

        return MeetingPrepResult(
            contact_summary=contact_summary,
            company_overview=company_overview,
            deal_status=deal_status,
            recent_interactions=tuple(random.sample(_MOCK_INTERACTIONS, k=random.randint(3, 5))),
            open_action_items=tuple(random.sample(_MOCK_ACTION_ITEMS, k=random.randint(2, 4))),
            talking_points=tuple(random.sample(_MOCK_TALKING_POINTS, k=random.randint(3, 5))),
            potential_objections=tuple(random.sample(_MOCK_OBJECTIONS, k=random.randint(2, 4))),
            relationship_strength=contact.relationship_strength or random.randint(4, 9),
        )


def serialize_meeting_prep(
    result: MeetingPrepResult,
    event_id: str,
) -> dict[str, Any]:
    """Convert MeetingPrepResult to API-compatible dict."""
    return {
        "event_id": event_id,
        "contact_summary": result.contact_summary,
        "company_overview": result.company_overview,
        "deal_status": result.deal_status,
        "recent_interactions": list(result.recent_interactions),
        "open_action_items": [asdict(a) for a in result.open_action_items],
        "talking_points": list(result.talking_points),
        "potential_objections": list(result.potential_objections),
        "relationship_strength": result.relationship_strength,
        "prepared_at": datetime.utcnow().isoformat(),
    }


_MEETING_PREP_SYSTEM = """You are a B2B sales meeting preparation AI. Generate a concise, actionable meeting briefing.

Return ONLY valid JSON:
{
  "contact_summary": "2-3 sentence contact summary",
  "company_overview": "2-3 sentence company context",
  "deal_status": "Current deal summary or null",
  "recent_interactions": ["interaction1", "interaction2"],
  "talking_points": ["point1", "point2", "point3"],
  "potential_objections": ["objection1", "objection2"],
  "open_action_items": [{"text": "...", "assignee": "Sales Rep", "due_date": "YYYY-MM-DD or null", "is_completed": false}]
}
Provide 3-5 talking points, 2-3 objections, 2-4 action items. Be specific and actionable."""


class LLMMeetingPrepService:
    """LLM-powered meeting prep using Groq."""

    def __init__(self) -> None:
        self._fallback = MockMeetingPrepService()

    async def prepare(
        self,
        event: CRMCalendarEvent,
        contact: CRMContact,
        deal: CRMDeal | None,
    ) -> MeetingPrepResult:
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            return self._fallback.prepare(event, contact, deal)

        try:
            client = get_llm_client("llama-3.3-70b-versatile")
            deal_info = "None"
            if deal:
                deal_info = (
                    f"{deal.title}: stage={deal.stage}, "
                    f"value=${deal.value or 0:,.0f}, prob={deal.probability}%"
                )
            context = (
                f"Meeting: {event.title or 'Untitled'}\n"
                f"Time: {event.start_at.isoformat() if event.start_at else 'TBD'}\n"
                f"Contact: {contact.name or 'Unknown'} "
                f"({contact.title or 'Unknown'} at {contact.company or 'Unknown'})\n"
                f"Relationship strength: {contact.relationship_strength or 0}/10\n"
                f"Lead score: {contact.lead_score or 0}\n"
                f"Activity count: {contact.activity_count or 0}\n"
                f"Last activity: {contact.last_activity_at.isoformat() if contact.last_activity_at else 'Never'}\n"
                f"Active deal: {deal_info}"
            )
            response = await client.chat(
                messages=[{"role": "user", "content": f"Prepare meeting briefing:\n\n{context}"}],
                system=_MEETING_PREP_SYSTEM,
                max_tokens=800,
                temperature=0.3,
            )
            parsed = parse_llm_json(response)
            if not parsed:
                return self._fallback.prepare(event, contact, deal)

            raw_items = parsed.get("open_action_items", [])
            action_items = tuple(
                ActionItem(
                    text=a.get("text", "Follow up"),
                    assignee=a.get("assignee"),
                    due_date=a.get("due_date"),
                    is_completed=bool(a.get("is_completed", False)),
                )
                for a in raw_items[:5] if isinstance(a, dict) and a.get("text")
            )

            return MeetingPrepResult(
                contact_summary=parsed.get("contact_summary", ""),
                company_overview=parsed.get("company_overview", ""),
                deal_status=parsed.get("deal_status"),
                recent_interactions=tuple(
                    i for i in parsed.get("recent_interactions", [])[:6] if isinstance(i, str)
                ),
                open_action_items=action_items,
                talking_points=tuple(
                    t for t in parsed.get("talking_points", [])[:6] if isinstance(t, str)
                ),
                potential_objections=tuple(
                    o for o in parsed.get("potential_objections", [])[:5] if isinstance(o, str)
                ),
                relationship_strength=contact.relationship_strength or 5,
            )
        except Exception:
            logger.exception("LLM meeting prep failed, using fallback")
            return self._fallback.prepare(event, contact, deal)


class MeetingPrepService(BaseService):
    """Business logic for AI-powered meeting prep briefings."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._preparer = LLMMeetingPrepService()

    @property
    def contact_repo(self) -> ContactRepository:
        return ContactRepository(self.session)

    async def prepare_meeting(self, event_id: str) -> dict[str, Any] | None:
        """Generate a meeting prep briefing for a calendar event."""
        from sqlalchemy import select
        from app.repositories.crm_deal_repo import DealRepository

        # Fetch the calendar event
        stmt = select(CRMCalendarEvent).where(CRMCalendarEvent.id == event_id)
        result = await self.session.execute(stmt)
        event = result.scalar_one_or_none()
        if event is None:
            return None

        # Fetch the associated contact
        contact = await self.contact_repo.get_by_id(event.contact_id)
        if contact is None:
            return None

        # Fetch associated deal (if any)
        deal = None
        if event.deal_id:
            deal_repo = DealRepository(self.session)
            deal = await deal_repo.get_by_id(event.deal_id)

        prep_result = await self._preparer.prepare(event, contact, deal)
        serialized = serialize_meeting_prep(prep_result, event_id)

        logger.info("Prepared meeting brief for event %s", event_id)
        return serialized
