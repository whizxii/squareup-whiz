"""AI Email Draft Service — auto-generates contextual email drafts after CRM events.

Listens to CRM events (meeting completed, deal stage advanced, contact went cold)
and generates ready-to-review email drafts using LLM.  Drafts are stored as
CRMEmail records with status="draft" and surfaced via toast notifications.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import EventBus
from app.core.logging_config import get_logger
from app.models.crm import CRMActivity, CRMContact
from app.models.crm_deal import CRMDeal
from app.models.crm_email import CRMEmail
from app.models.crm_sequence import CRMSequenceEnrollment
from app.services.base import BaseService

logger = get_logger(__name__)


# ─── Data Types ────────────────────────────────────────────────────


@dataclass(frozen=True)
class EmailDraft:
    """Immutable representation of a generated email draft."""

    contact_id: str
    deal_id: str | None
    subject: str
    body_html: str
    body_text: str
    trigger: str  # meeting_completed | deal_advanced | contact_cold
    reasoning: str


# ─── LLM System Prompt ────────────────────────────────────────────

_EMAIL_DRAFT_SYSTEM = """\
You are a professional sales email copywriter for a CRM system.
Given context about a CRM event (meeting completed, deal stage change, or
cold contact), draft a concise, warm, professional follow-up email.

Rules:
- Keep subject lines under 60 characters.
- Keep body under 150 words.
- Use a natural, human tone — never salesy or robotic.
- Reference specific context (meeting topics, deal details, etc.).
- Include a clear call-to-action.
- Never include placeholders like [Name] — use the actual contact data provided.

Return ONLY valid JSON with these fields:
{
  "subject": "...",
  "body_html": "<p>...</p>",
  "body_text": "...",
  "reasoning": "Why this email is appropriate right now"
}
"""


# ─── Mock Fallback ─────────────────────────────────────────────────


class MockEmailDraftGenerator:
    """Generates sensible email drafts without LLM when unavailable."""

    def generate_meeting_followup(
        self, contact_name: str, outcome: str | None, **_: Any
    ) -> dict[str, str]:
        first_name = contact_name.split()[0] if contact_name else "there"
        outcome_text = f" regarding {outcome}" if outcome else ""
        return {
            "subject": f"Great connecting today, {first_name}",
            "body_html": (
                f"<p>Hi {first_name},</p>"
                f"<p>Thanks for taking the time to meet today{outcome_text}. "
                "I wanted to follow up on the key points we discussed and "
                "outline the next steps.</p>"
                "<p>Would you be available for a brief follow-up this week?</p>"
                "<p>Best regards</p>"
            ),
            "body_text": (
                f"Hi {first_name},\n\n"
                f"Thanks for taking the time to meet today{outcome_text}. "
                "I wanted to follow up on the key points we discussed and "
                "outline the next steps.\n\n"
                "Would you be available for a brief follow-up this week?\n\n"
                "Best regards"
            ),
            "reasoning": "Post-meeting follow-up to reinforce relationship and lock in next steps.",
        }

    def generate_deal_advanced(
        self, contact_name: str, old_stage: str, new_stage: str, **_: Any
    ) -> dict[str, str]:
        first_name = contact_name.split()[0] if contact_name else "there"
        return {
            "subject": f"Next steps on our partnership, {first_name}",
            "body_html": (
                f"<p>Hi {first_name},</p>"
                f"<p>Great news — we've moved forward from {old_stage} to "
                f"{new_stage}. I wanted to reach out about the next steps "
                "to keep things on track.</p>"
                "<p>Let me know if you have any questions or if there's "
                "anything I can prepare for you.</p>"
                "<p>Best regards</p>"
            ),
            "body_text": (
                f"Hi {first_name},\n\n"
                f"Great news — we've moved forward from {old_stage} to "
                f"{new_stage}. I wanted to reach out about the next steps "
                "to keep things on track.\n\n"
                "Let me know if you have any questions or if there's "
                "anything I can prepare for you.\n\n"
                "Best regards"
            ),
            "reasoning": f"Deal advanced from {old_stage} to {new_stage} — timely follow-up keeps momentum.",
        }

    def generate_cold_reengagement(
        self, contact_name: str, days_inactive: int, **_: Any
    ) -> dict[str, str]:
        first_name = contact_name.split()[0] if contact_name else "there"
        return {
            "subject": f"Checking in, {first_name}",
            "body_html": (
                f"<p>Hi {first_name},</p>"
                f"<p>It's been a little while since we last connected "
                f"({days_inactive} days). I wanted to check in and see how "
                "things are progressing on your end.</p>"
                "<p>Is there anything I can help with or any updates to share?</p>"
                "<p>Best regards</p>"
            ),
            "body_text": (
                f"Hi {first_name},\n\n"
                f"It's been a little while since we last connected "
                f"({days_inactive} days). I wanted to check in and see how "
                "things are progressing on your end.\n\n"
                "Is there anything I can help with or any updates to share?\n\n"
                "Best regards"
            ),
            "reasoning": f"No activity in {days_inactive} days — re-engagement needed to avoid losing the relationship.",
        }


_mock = MockEmailDraftGenerator()


# ─── LLM-Powered Draft Generator ──────────────────────────────────


class LLMEmailDraftGenerator:
    """Generates email drafts using the configured LLM provider."""

    def __init__(self) -> None:
        self._fallback = _mock

    async def generate(self, trigger: str, context: dict[str, Any]) -> dict[str, str]:
        """Generate an email draft for the given trigger and context."""
        try:
            from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

            if not llm_available():
                return self._dispatch_mock(trigger, context)

            client = get_llm_client()
            user_prompt = self._build_prompt(trigger, context)
            response = await client.chat(
                system=_EMAIL_DRAFT_SYSTEM,
                messages=[{"role": "user", "content": user_prompt}],
            )
            parsed = parse_llm_json(response)
            if parsed and all(k in parsed for k in ("subject", "body_html", "body_text")):
                parsed.setdefault("reasoning", "AI-generated email draft.")
                return parsed

            logger.warning("LLM returned invalid draft structure, using fallback")
            return self._dispatch_mock(trigger, context)

        except Exception:
            logger.exception("LLM email draft generation failed, using mock fallback")
            return self._dispatch_mock(trigger, context)

    def _build_prompt(self, trigger: str, context: dict[str, Any]) -> str:
        contact_name = context.get("contact_name", "Unknown")
        lines = [f"Trigger: {trigger}", f"Contact: {contact_name}"]

        if trigger == "meeting_completed":
            lines.append(f"Meeting outcome: {context.get('outcome', 'general discussion')}")
            if context.get("deal_title"):
                lines.append(f"Deal: {context['deal_title']}")

        elif trigger == "deal_advanced":
            lines.append(f"Old stage: {context.get('old_stage', 'unknown')}")
            lines.append(f"New stage: {context.get('new_stage', 'unknown')}")
            if context.get("deal_title"):
                lines.append(f"Deal: {context['deal_title']}")
            if context.get("deal_value"):
                lines.append(f"Value: ${context['deal_value']}")

        elif trigger == "contact_cold":
            lines.append(f"Days inactive: {context.get('days_inactive', 14)}")
            if context.get("last_activity"):
                lines.append(f"Last activity: {context['last_activity']}")

        return "\n".join(lines)

    def _dispatch_mock(self, trigger: str, context: dict[str, Any]) -> dict[str, str]:
        if trigger == "meeting_completed":
            return self._fallback.generate_meeting_followup(**context)
        if trigger == "deal_advanced":
            return self._fallback.generate_deal_advanced(**context)
        if trigger == "contact_cold":
            return self._fallback.generate_cold_reengagement(**context)
        return self._fallback.generate_meeting_followup(**context)


# ─── Event-Driven Email Draft Service ──────────────────────────────


class EmailDraftCaptureService:
    """Listens to CRM events and auto-generates email drafts.

    Follows the same pattern as ActivityCaptureService: uses session_factory
    for independent DB sessions per event handler.
    """

    def __init__(self, event_bus: EventBus, session_factory: Any) -> None:
        self._event_bus = event_bus
        self._session_factory = session_factory
        self._generator = LLMEmailDraftGenerator()

    def register_handlers(self) -> None:
        """Register event handlers for auto-draft triggers."""
        self._event_bus.on("calendar_event.completed", self._on_meeting_completed)
        self._event_bus.on("deal.stage_changed", self._on_deal_advanced)
        logger.info("Email auto-draft handlers registered")

    async def _create_draft_email(
        self,
        session: AsyncSession,
        draft: dict[str, str],
        contact_id: str,
        deal_id: str | None,
        trigger: str,
    ) -> CRMEmail:
        """Persist a draft CRMEmail record and emit notification event."""
        now = datetime.utcnow()
        email = CRMEmail(
            contact_id=contact_id,
            deal_id=deal_id,
            direction="outbound",
            subject=draft["subject"],
            body_html=draft["body_html"],
            body_text=draft["body_text"],
            from_address="ai-draft@squareup.com",
            to_addresses="[]",
            cc_addresses="[]",
            thread_id=str(uuid.uuid4()),
            status="draft",
            created_by="ai-email-drafter",
            created_at=now,
        )
        session.add(email)
        await session.commit()
        await session.refresh(email)

        # Emit event for toast notification system
        await self._event_bus.emit("email.auto_drafted", {
            "email_id": email.id,
            "contact_id": contact_id,
            "deal_id": deal_id,
            "subject": draft["subject"],
            "trigger": trigger,
            "reasoning": draft.get("reasoning", ""),
        })

        logger.info(
            "Auto-draft created: email=%s trigger=%s contact=%s",
            email.id, trigger, contact_id,
        )
        return email

    # ─── Event Handlers ────────────────────────────────────────────

    async def _on_meeting_completed(self, payload: dict) -> None:
        """Auto-draft a follow-up email after a meeting is completed."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                # Load contact info for personalisation
                result = await session.execute(
                    select(CRMContact).where(CRMContact.id == contact_id)
                )
                contact = result.scalars().first()
                if contact is None:
                    return

                deal_id = payload.get("deal_id")
                deal_title = None
                if deal_id:
                    deal_result = await session.execute(
                        select(CRMDeal).where(CRMDeal.id == deal_id)
                    )
                    deal = deal_result.scalars().first()
                    deal_title = deal.title if deal else None

                context = {
                    "contact_name": contact.name or "there",
                    "outcome": payload.get("outcome"),
                    "deal_title": deal_title,
                }

                draft = await self._generator.generate("meeting_completed", context)
                await self._create_draft_email(
                    session, draft, contact_id, deal_id, "meeting_completed",
                )
        except Exception:
            logger.exception("Failed to auto-draft meeting follow-up for contact %s", contact_id)

    async def _on_deal_advanced(self, payload: dict) -> None:
        """Auto-draft an email when a deal moves to a new stage."""
        deal_id = payload.get("deal_id")
        old_stage = payload.get("old_stage", "")
        new_stage = payload.get("new_stage", "")

        if not deal_id or not new_stage:
            return

        try:
            async with self._session_factory() as session:
                # Load deal and linked contact
                deal_result = await session.execute(
                    select(CRMDeal).where(CRMDeal.id == deal_id)
                )
                deal = deal_result.scalars().first()
                if deal is None or not deal.contact_id:
                    return

                contact_result = await session.execute(
                    select(CRMContact).where(CRMContact.id == deal.contact_id)
                )
                contact = contact_result.scalars().first()
                if contact is None:
                    return

                context = {
                    "contact_name": contact.name or "there",
                    "old_stage": old_stage,
                    "new_stage": new_stage,
                    "deal_title": deal.title,
                    "deal_value": str(deal.value) if deal.value else None,
                }

                draft = await self._generator.generate("deal_advanced", context)
                await self._create_draft_email(
                    session, draft, deal.contact_id, deal_id, "deal_advanced",
                )
        except Exception:
            logger.exception("Failed to auto-draft deal-advanced email for deal %s", deal_id)

    async def generate_cold_reengagement(
        self,
        session: AsyncSession,
        contact_id: str,
        days_inactive: int,
        last_activity: str | None = None,
    ) -> CRMEmail | None:
        """Generate a re-engagement draft for a cold contact.

        Called by the scheduler (not event-driven) for contacts with
        no activity beyond a configurable threshold.
        """
        try:
            result = await session.execute(
                select(CRMContact).where(CRMContact.id == contact_id)
            )
            contact = result.scalars().first()
            if contact is None:
                return None

            context = {
                "contact_name": contact.name or "there",
                "days_inactive": days_inactive,
                "last_activity": last_activity,
            }

            draft = await self._generator.generate("contact_cold", context)
            return await self._create_draft_email(
                session, draft, contact_id, None, "contact_cold",
            )
        except Exception:
            logger.exception("Failed to auto-draft re-engagement for contact %s", contact_id)
            return None


# ─── API-Facing Service (DI-compatible) ────────────────────────────


class EmailDraftService(BaseService):
    """API-facing service for listing and generating email drafts on demand."""

    async def list_drafts(
        self,
        contact_id: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """List auto-generated email drafts, optionally filtered by contact."""
        query = (
            select(CRMEmail)
            .where(CRMEmail.status == "draft", CRMEmail.created_by == "ai-email-drafter")
            .order_by(CRMEmail.created_at.desc())
            .limit(limit)
        )
        if contact_id:
            query = query.where(CRMEmail.contact_id == contact_id)

        result = await self.session.execute(query)
        emails = result.scalars().all()
        return [
            {
                "id": e.id,
                "contact_id": e.contact_id,
                "deal_id": e.deal_id,
                "subject": e.subject,
                "body_html": e.body_html,
                "body_text": e.body_text,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in emails
        ]

    async def generate_draft(
        self,
        trigger: str,
        contact_id: str,
        deal_id: str | None = None,
        extra_context: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Generate an email draft on demand (not event-driven)."""
        result = await self.session.execute(
            select(CRMContact).where(CRMContact.id == contact_id)
        )
        contact = result.scalars().first()
        if contact is None:
            return None

        context: dict[str, Any] = {"contact_name": contact.name or "there"}
        if extra_context:
            context.update(extra_context)

        if deal_id:
            deal_result = await self.session.execute(
                select(CRMDeal).where(CRMDeal.id == deal_id)
            )
            deal = deal_result.scalars().first()
            if deal:
                context["deal_title"] = deal.title
                context["deal_value"] = str(deal.value) if deal.value else None

        generator = LLMEmailDraftGenerator()
        draft = await generator.generate(trigger, context)

        # Persist as a draft CRM email
        now = datetime.utcnow()
        email = CRMEmail(
            contact_id=contact_id,
            deal_id=deal_id,
            direction="outbound",
            subject=draft["subject"],
            body_html=draft["body_html"],
            body_text=draft["body_text"],
            from_address="ai-draft@squareup.com",
            to_addresses="[]",
            cc_addresses="[]",
            thread_id=str(uuid.uuid4()),
            status="draft",
            created_by="ai-email-drafter",
            created_at=now,
        )
        self.session.add(email)
        await self.session.commit()
        await self.session.refresh(email)

        return {
            "id": email.id,
            "contact_id": email.contact_id,
            "deal_id": email.deal_id,
            "subject": email.subject,
            "body_html": email.body_html,
            "body_text": email.body_text,
            "reasoning": draft.get("reasoning", ""),
            "created_at": email.created_at.isoformat() if email.created_at else None,
        }
