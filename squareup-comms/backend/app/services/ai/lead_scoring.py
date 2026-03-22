"""Lead scoring service — AI-powered contact scoring for sales prioritization.

In production, this would integrate with a trained ML model or Claude AI.
The mock generates realistic scores based on contact attributes and activity data.

Scoring dimensions:
- Fit Score: How well the contact matches the ideal customer profile
- Engagement Score: How actively the contact interacts
- Intent Score: Signals of buying intent
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any

from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.repositories.crm_contact_repo import ContactRepository
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class ScoreFactor:
    factor: str
    points: int
    detail: str


@dataclass(frozen=True)
class ScoreBreakdown:
    fit: tuple[ScoreFactor, ...]
    engagement: tuple[ScoreFactor, ...]
    intent: tuple[ScoreFactor, ...]


@dataclass(frozen=True)
class LeadScoreResult:
    overall_score: int
    fit_score: int
    engagement_score: int
    intent_score: int
    breakdown: ScoreBreakdown
    ai_reasoning: str
    score_trend: str  # rising / stable / falling


# ─── Mock scoring templates ─────────────────────────────────────────

_FIT_FACTORS = [
    ScoreFactor("Company size match", 8, "Mid-market company aligns with ICP"),
    ScoreFactor("Industry relevance", 7, "SaaS/technology vertical — strong fit"),
    ScoreFactor("Budget range", 6, "Estimated budget within target range"),
    ScoreFactor("Decision maker role", 9, "VP/Director level — key decision authority"),
    ScoreFactor("Geographic fit", 5, "Located in primary market region"),
    ScoreFactor("Tech stack compatibility", 7, "Uses complementary tools in our ecosystem"),
]

_ENGAGEMENT_FACTORS = [
    ScoreFactor("Email opens", 6, "Opened 3 of last 5 emails"),
    ScoreFactor("Meeting attendance", 8, "Attended 2 scheduled demos"),
    ScoreFactor("Content downloads", 5, "Downloaded pricing guide and case study"),
    ScoreFactor("Response time", 7, "Average reply within 4 hours"),
    ScoreFactor("Website visits", 4, "Visited pricing page 3 times this week"),
    ScoreFactor("Social engagement", 3, "Liked 2 LinkedIn posts"),
]

_INTENT_FACTORS = [
    ScoreFactor("Pricing inquiry", 9, "Requested detailed pricing breakdown"),
    ScoreFactor("Competitor evaluation", 7, "Mentioned evaluating alternatives"),
    ScoreFactor("Timeline mentioned", 8, "Wants to decide within 30 days"),
    ScoreFactor("Budget confirmed", 10, "Budget approved for this quarter"),
    ScoreFactor("Stakeholder introduced", 6, "Looped in procurement team"),
    ScoreFactor("Trial requested", 8, "Asked for trial or POC setup"),
]

_REASONING_TEMPLATES = [
    "Strong fit with high engagement. {name} matches the ideal customer profile with "
    "active participation in recent touchpoints. Recommend prioritizing outreach.",
    "Moderate fit but strong buying signals. {name} shows clear intent through "
    "pricing inquiries and timeline discussions. Engagement is building momentum.",
    "High-potential lead with growing engagement. {name}'s recent activity pattern "
    "suggests increasing interest. The fit score is solid, and intent signals are emerging.",
    "Early-stage lead with promising indicators. {name} has good ICP fit but limited "
    "engagement history. Focus on nurture sequences to build relationship.",
]


class MockLeadScoringService:
    """Generates realistic mock lead scores for development."""

    def score_contact(self, contact: CRMContact) -> LeadScoreResult:
        """Score a contact based on their attributes and activity."""
        # Select random factors (2-4 from each category)
        fit_factors = tuple(random.sample(_FIT_FACTORS, k=random.randint(2, 4)))
        eng_factors = tuple(random.sample(_ENGAGEMENT_FACTORS, k=random.randint(2, 4)))
        int_factors = tuple(random.sample(_INTENT_FACTORS, k=random.randint(2, 4)))

        # Calculate dimension scores (weighted sum, capped at 100)
        fit_score = min(100, sum(f.points * 3 for f in fit_factors))
        engagement_score = min(100, sum(f.points * 3 for f in eng_factors))
        intent_score = min(100, sum(f.points * 3 for f in int_factors))

        # Boost based on contact attributes
        if contact.activity_count and contact.activity_count > 5:
            engagement_score = min(100, engagement_score + 10)
        if contact.value and contact.value > 50000:
            fit_score = min(100, fit_score + 8)

        overall = (fit_score * 3 + engagement_score * 4 + intent_score * 3) // 10

        # Determine trend based on existing score
        old_score = contact.lead_score or 0
        if overall > old_score + 5:
            trend = "rising"
        elif overall < old_score - 5:
            trend = "falling"
        else:
            trend = "stable"

        reasoning = random.choice(_REASONING_TEMPLATES).format(name=contact.name)

        return LeadScoreResult(
            overall_score=overall,
            fit_score=fit_score,
            engagement_score=engagement_score,
            intent_score=intent_score,
            breakdown=ScoreBreakdown(
                fit=fit_factors,
                engagement=eng_factors,
                intent=int_factors,
            ),
            ai_reasoning=reasoning,
            score_trend=trend,
        )


def serialize_lead_score(
    result: LeadScoreResult,
    contact_id: str,
) -> dict[str, Any]:
    """Convert LeadScoreResult to API-compatible dict."""
    return {
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "overall_score": result.overall_score,
        "fit_score": result.fit_score,
        "engagement_score": result.engagement_score,
        "intent_score": result.intent_score,
        "score_breakdown": {
            "fit": [asdict(f) for f in result.breakdown.fit],
            "engagement": [asdict(f) for f in result.breakdown.engagement],
            "intent": [asdict(f) for f in result.breakdown.intent],
        },
        "ai_reasoning": result.ai_reasoning,
        "score_trend": result.score_trend,
        "previous_score": 0,
        "scored_at": datetime.utcnow().isoformat(),
    }


_LEAD_SCORE_SYSTEM = """You are a B2B sales lead scoring AI. Score this contact on three dimensions.

Return ONLY valid JSON:
{
  "overall_score": <0-100>,
  "fit_score": <0-100>,
  "engagement_score": <0-100>,
  "intent_score": <0-100>,
  "fit_factors": [{"factor": "...", "points": <1-10>, "detail": "..."}],
  "engagement_factors": [{"factor": "...", "points": <1-10>, "detail": "..."}],
  "intent_factors": [{"factor": "...", "points": <1-10>, "detail": "..."}],
  "ai_reasoning": "2-3 sentence analysis",
  "score_trend": "rising|stable|falling"
}
Overall = fit*0.3 + engagement*0.4 + intent*0.3. Provide 2-3 factors per dimension."""


class LLMLeadScoringService:
    """LLM-powered lead scoring using Groq."""

    def __init__(self) -> None:
        self._fallback = MockLeadScoringService()

    async def score_contact(self, contact: CRMContact) -> LeadScoreResult:
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            return self._fallback.score_contact(contact)

        try:
            client = get_llm_client("llama-3.3-70b-versatile")
            context = (
                f"Name: {contact.name or 'Unknown'}\n"
                f"Title: {contact.title or 'Unknown'}\n"
                f"Company: {contact.company or 'Unknown'}\n"
                f"Activity count: {contact.activity_count or 0}\n"
                f"Deal value: ${contact.value or 0:,.0f}\n"
                f"Current lead score: {contact.lead_score or 0}\n"
                f"Relationship strength: {contact.relationship_strength or 0}/10\n"
                f"AI tags: {contact.ai_tags or '[]'}\n"
                f"Sentiment score: {contact.sentiment_score or 0}\n"
                f"Last activity: {contact.last_activity_at.isoformat() if contact.last_activity_at else 'Never'}"
            )
            response = await client.chat(
                messages=[{"role": "user", "content": f"Score this sales contact:\n\n{context}"}],
                system=_LEAD_SCORE_SYSTEM,
                max_tokens=800,
                temperature=0.3,
            )
            parsed = parse_llm_json(response)
            if not parsed:
                return self._fallback.score_contact(contact)

            old_score = contact.lead_score or 0
            overall = max(0, min(100, int(parsed.get("overall_score", 50))))
            trend = "rising" if overall > old_score + 5 else ("falling" if overall < old_score - 5 else "stable")

            def _make_factors(raw: list, pool: list) -> tuple:
                factors = tuple(
                    ScoreFactor(f["factor"], max(1, min(10, int(f.get("points", 5)))), f.get("detail", ""))
                    for f in raw[:4] if isinstance(f, dict) and f.get("factor")
                )
                return factors if factors else tuple(random.sample(pool, k=2))

            return LeadScoreResult(
                overall_score=overall,
                fit_score=max(0, min(100, int(parsed.get("fit_score", 50)))),
                engagement_score=max(0, min(100, int(parsed.get("engagement_score", 50)))),
                intent_score=max(0, min(100, int(parsed.get("intent_score", 50)))),
                breakdown=ScoreBreakdown(
                    fit=_make_factors(parsed.get("fit_factors", []), _FIT_FACTORS),
                    engagement=_make_factors(parsed.get("engagement_factors", []), _ENGAGEMENT_FACTORS),
                    intent=_make_factors(parsed.get("intent_factors", []), _INTENT_FACTORS),
                ),
                ai_reasoning=parsed.get("ai_reasoning", "AI analysis completed."),
                score_trend=trend,
            )
        except Exception:
            logger.exception("LLM lead scoring failed, using fallback")
            return self._fallback.score_contact(contact)


class LeadScoringService(BaseService):
    """Business logic for AI-powered lead scoring."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._scorer = LLMLeadScoringService()

    @property
    def contact_repo(self) -> ContactRepository:
        return ContactRepository(self.session)

    async def score_contact(self, contact_id: str) -> dict[str, Any] | None:
        """Score a single contact and persist the lead_score."""
        contact = await self.contact_repo.get_by_id(contact_id)
        if contact is None:
            return None

        result = await self._scorer.score_contact(contact)
        serialized = serialize_lead_score(result, contact_id)
        serialized["previous_score"] = contact.lead_score or 0

        # Persist denormalized score to contact
        contact.lead_score = result.overall_score
        contact.updated_at = datetime.utcnow()
        self.session.add(contact)
        await self.session.commit()

        # Emit event for workflows / activity capture
        await self.events.emit("score.changed", {
            "contact_id": contact_id,
            "previous_score": serialized["previous_score"],
            "new_score": result.overall_score,
            "trend": result.score_trend,
        })

        # Emit WebSocket notification if contact just became "hot"
        _HOT_THRESHOLD = 70
        if (
            result.overall_score >= _HOT_THRESHOLD
            and serialized["previous_score"] < _HOT_THRESHOLD
        ):
            from app.websocket.manager import hub_manager
            await hub_manager.broadcast_all({
                "type": "crm.hot_lead",
                "contact_name": contact.name,
                "score": result.overall_score,
                "contact_id": contact_id,
            })

        logger.info("Scored contact %s: %d", contact_id, result.overall_score)
        return serialized

    async def score_batch(self) -> int:
        """Re-score all non-archived contacts. Returns count scored."""
        from sqlalchemy import select
        stmt = select(CRMContact).where(CRMContact.is_archived == False)  # noqa: E712
        result = await self.session.execute(stmt)
        contacts = result.scalars().all()

        scored = 0
        for contact in contacts:
            score_result = await self._scorer.score_contact(contact)
            contact.lead_score = score_result.overall_score
            contact.updated_at = datetime.utcnow()
            self.session.add(contact)
            scored += 1

        await self.session.commit()
        logger.info("Batch scored %d contacts", scored)
        return scored
