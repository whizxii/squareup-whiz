"""Next-actions / follow-up suggestions service — AI-powered action recommendations.

In production, this would use Claude AI to analyze CRM data and suggest
optimal next steps. The mock generates realistic follow-up suggestions
based on contact and deal attributes.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select

from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.models.crm_deal import CRMDeal
from app.repositories.crm_contact_repo import ContactRepository
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class FollowUpSuggestion:
    contact_id: str
    action: str
    reasoning: str
    priority: str  # high / medium / low
    suggested_date: str | None


# ─── Mock suggestion templates ───────────────────────────────────────

_ACTION_TEMPLATES: list[tuple[str, str, str]] = [
    # (action, reasoning, priority)
    (
        "Send follow-up email on pricing proposal",
        "Pricing proposal sent 3 days ago with no response — typical follow-up window is 2-3 days",
        "high",
    ),
    (
        "Schedule a check-in call",
        "No activity in 10+ days — re-engagement needed to maintain pipeline velocity",
        "high",
    ),
    (
        "Share relevant case study",
        "Contact expressed interest in ROI data — a case study from their industry could accelerate the decision",
        "medium",
    ),
    (
        "Prepare demo for technical team",
        "Champion requested a technical deep-dive — this is a key buying signal",
        "high",
    ),
    (
        "Send contract for review",
        "Verbal agreement received — move quickly to formalize before momentum fades",
        "high",
    ),
    (
        "Connect with additional stakeholders",
        "Only engaging with one contact — multi-threading reduces single-point-of-failure risk",
        "medium",
    ),
    (
        "Send product update newsletter",
        "New features released last week align with contact's expressed needs",
        "low",
    ),
    (
        "Review and update deal stage",
        "Deal has been in current stage for 14+ days without documented progress",
        "medium",
    ),
    (
        "Request referral or introduction",
        "Strong relationship score (8/10) — good candidate for warm introduction request",
        "low",
    ),
    (
        "Prepare renewal discussion materials",
        "Contract renewal approaching in 30 days — start the conversation early",
        "high",
    ),
    (
        "Follow up on security questionnaire",
        "Legal/security review is blocking deal progression — proactive follow-up needed",
        "high",
    ),
    (
        "Send personalized thank-you note",
        "After a productive meeting — reinforces relationship and shows professionalism",
        "low",
    ),
]

_DASHBOARD_EXTRA_TEMPLATES: list[tuple[str, str, str]] = [
    (
        "Review pipeline health for the week",
        "5 deals have upcoming close dates — review and adjust forecasts",
        "medium",
    ),
    (
        "Re-engage stale leads",
        "12 contacts haven't been contacted in 21+ days — batch outreach recommended",
        "medium",
    ),
    (
        "Prepare for tomorrow's meetings",
        "3 meetings scheduled — review meeting prep briefs before end of day",
        "high",
    ),
]


class MockNextActionsService:
    """Generates realistic mock follow-up suggestions."""

    def suggest_for_contact(
        self,
        contact: CRMContact,
        deals: list[CRMDeal],
    ) -> list[FollowUpSuggestion]:
        """Generate next-action suggestions for a specific contact."""
        count = random.randint(2, 4)
        templates = random.sample(_ACTION_TEMPLATES, k=min(count, len(_ACTION_TEMPLATES)))

        suggestions: list[FollowUpSuggestion] = []
        for action, reasoning, priority in templates:
            days_offset = {"high": 1, "medium": 3, "low": 7}[priority]
            suggested_date = (
                datetime.now(timezone.utc) + timedelta(days=random.randint(0, days_offset))
            ).strftime("%Y-%m-%d")

            suggestions.append(FollowUpSuggestion(
                contact_id=str(contact.id),
                action=action,
                reasoning=reasoning,
                priority=priority,
                suggested_date=suggested_date,
            ))

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        return sorted(suggestions, key=lambda s: priority_order.get(s.priority, 9))

    def suggest_dashboard(
        self,
        contacts: list[CRMContact],
    ) -> list[FollowUpSuggestion]:
        """Generate dashboard-level next-action suggestions across all contacts."""
        all_templates = _ACTION_TEMPLATES + _DASHBOARD_EXTRA_TEMPLATES
        count = random.randint(5, 8)
        templates = random.sample(all_templates, k=min(count, len(all_templates)))

        suggestions: list[FollowUpSuggestion] = []
        for action, reasoning, priority in templates:
            # Assign to a random contact if available
            contact = random.choice(contacts) if contacts else None
            contact_id = str(contact.id) if contact else "unknown"

            days_offset = {"high": 1, "medium": 3, "low": 7}[priority]
            suggested_date = (
                datetime.now(timezone.utc) + timedelta(days=random.randint(0, days_offset))
            ).strftime("%Y-%m-%d")

            suggestions.append(FollowUpSuggestion(
                contact_id=contact_id,
                action=action,
                reasoning=reasoning,
                priority=priority,
                suggested_date=suggested_date,
            ))

        priority_order = {"high": 0, "medium": 1, "low": 2}
        return sorted(suggestions, key=lambda s: priority_order.get(s.priority, 9))


def serialize_suggestions(suggestions: list[FollowUpSuggestion]) -> list[dict[str, Any]]:
    """Convert list of FollowUpSuggestion to API-compatible dicts."""
    return [asdict(s) for s in suggestions]


class NextActionsService(BaseService):
    """Business logic for AI-powered next-action recommendations."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._suggester = MockNextActionsService()

    @property
    def contact_repo(self) -> ContactRepository:
        return ContactRepository(self.session)

    async def get_contact_actions(self, contact_id: str) -> list[dict[str, Any]] | None:
        """Get next-action suggestions for a specific contact."""
        contact = await self.contact_repo.get_by_id(contact_id)
        if contact is None:
            return None

        # Fetch associated open deals
        stmt = (
            select(CRMDeal)
            .where(CRMDeal.contact_id == contact_id)
            .where(CRMDeal.status == "open")
        )
        result = await self.session.execute(stmt)
        deals = list(result.scalars().all())

        suggestions = self._suggester.suggest_for_contact(contact, deals)
        logger.info("Generated %d actions for contact %s", len(suggestions), contact_id)
        return serialize_suggestions(suggestions)

    async def get_dashboard_actions(self) -> list[dict[str, Any]]:
        """Get dashboard-level next-action suggestions."""
        stmt = (
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .order_by(CRMContact.last_activity_at.desc().nullslast())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        contacts = list(result.scalars().all())

        suggestions = self._suggester.suggest_dashboard(contacts)
        logger.info("Generated %d dashboard actions", len(suggestions))
        return serialize_suggestions(suggestions)

    async def get_stale_contacts(self) -> list[CRMContact]:
        """Return contacts with no recent activity (stale > 14 days)."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        stmt = (
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .where(
                (CRMContact.last_activity_at < cutoff)
                | (CRMContact.last_activity_at.is_(None))
            )
            .order_by(CRMContact.last_activity_at.asc().nullsfirst())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_hot_leads(self) -> list[CRMContact]:
        """Return contacts with high lead scores."""
        stmt = (
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .where(CRMContact.lead_score >= 70)
            .order_by(CRMContact.lead_score.desc())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
