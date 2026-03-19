"""AI Copilot service — natural language CRM assistant.

In production, this would use Claude AI for natural language understanding
and CRM data querying. The mock provides pattern-matched responses.
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass
from typing import Any

from app.core.logging_config import get_logger
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class CopilotResponse:
    type: str  # answer / action / insight / clarification
    message: str
    data: dict[str, Any] | None


# ─── Mock response templates ─────────────────────────────────────────

_QUERY_PATTERNS: list[tuple[str, str, str]] = [
    # (regex pattern, response type, response template)
    (
        r"(?:who|which)\s+(?:contacts?|leads?)\s+(?:are|is)\s+(?:hot|high.?score)",
        "answer",
        "Here are your hottest leads based on engagement and intent signals:\n\n"
        "1. **Sarah Chen** — Score: 92, VP Sales at TechFlow (requested pricing)\n"
        "2. **James Rodriguez** — Score: 87, CTO at DataScale (active trial)\n"
        "3. **Priya Sharma** — Score: 85, Head of Ops at GrowthLabs (demo scheduled)\n\n"
        "All three have high engagement scores and recent buying intent signals.",
    ),
    (
        r"(?:what|how)\s+(?:should|do)\s+I\s+(?:do|prioritize|focus)",
        "insight",
        "Based on your pipeline analysis, here are your top priorities:\n\n"
        "1. **Follow up with Sarah Chen** — Pricing proposal sent 3 days ago, no reply\n"
        "2. **Prepare for DataScale demo** — Scheduled for tomorrow at 2pm\n"
        "3. **Re-engage stale deals** — 4 deals haven't had activity in 10+ days\n\n"
        "The DataScale demo has the highest revenue potential ($120K ARR).",
    ),
    (
        r"(?:deals?|pipeline)\s+(?:at risk|stalled|stuck)",
        "answer",
        "I found 3 at-risk deals in your pipeline:\n\n"
        "1. **Acme Corp Enterprise** — $85K, stuck in Negotiation for 18 days\n"
        "2. **GlobalTech Migration** — $45K, champion hasn't responded in 12 days\n"
        "3. **StartupXYZ Pilot** — $25K, budget concerns raised in last call\n\n"
        "Recommendation: Schedule check-ins for Acme and GlobalTech this week.",
    ),
    (
        r"(?:summarize|summary|overview)\s+(?:of\s+)?(?:my\s+)?(?:pipeline|deals)",
        "answer",
        "Your pipeline overview:\n\n"
        "- **Total open deals:** 24 worth $1.2M\n"
        "- **Weighted pipeline:** $480K\n"
        "- **Deals closing this month:** 6 ($320K)\n"
        "- **Average deal size:** $50K\n"
        "- **Win rate (last 90 days):** 32%\n\n"
        "Your pipeline is healthy with good coverage. Focus on the 6 deals closing this month.",
    ),
    (
        r"(?:draft|write|compose)\s+(?:an?\s+)?(?:email|message)",
        "action",
        "I've drafted a follow-up email for you:\n\n"
        "**Subject:** Following up on our conversation\n\n"
        "Hi {name},\n\nThank you for your time on our call. I wanted to follow up with "
        "the pricing details we discussed. I've attached our enterprise pricing guide "
        "along with a case study from a similar company in your industry.\n\n"
        "Would you have 15 minutes this week to walk through any questions?\n\n"
        "Best regards",
    ),
    (
        r"(?:next\s+steps?|what.?s\s+next|action\s+items?)",
        "insight",
        "Your pending action items across all deals:\n\n"
        "1. Send pricing proposal to Sarah Chen (due today)\n"
        "2. Schedule demo for DataScale team (due tomorrow)\n"
        "3. Follow up on security questionnaire with Acme (due Wed)\n"
        "4. Share integration docs with StartupXYZ (due Thu)\n"
        "5. Internal: Review Q2 targets with manager (due Fri)\n\n"
        "Items 1 and 2 are highest priority based on deal value and urgency.",
    ),
    (
        r"(?:relationship|how.?s\s+(?:my|the)\s+relationship)\s+with",
        "answer",
        "Relationship analysis:\n\n"
        "- **Strength:** 7/10 (Good)\n"
        "- **Trend:** Warming over last 30 days\n"
        "- **Last interaction:** 2 days ago (email reply)\n"
        "- **Avg response time:** 4 hours (fast for this contact)\n"
        "- **Communication frequency:** Weekly\n\n"
        "The relationship is strong. Maintain current cadence and continue providing value.",
    ),
]

_FALLBACK_RESPONSE = CopilotResponse(
    type="clarification",
    message=(
        "I can help you with:\n\n"
        "- **Pipeline analysis** — \"Show me deals at risk\"\n"
        "- **Lead prioritization** — \"Who are my hottest leads?\"\n"
        "- **Action items** — \"What should I focus on today?\"\n"
        "- **Meeting prep** — \"Prepare me for my next meeting\"\n"
        "- **Email drafting** — \"Draft a follow-up email\"\n"
        "- **Relationship insights** — \"How's my relationship with [contact]?\"\n\n"
        "Try asking in natural language and I'll do my best to help!"
    ),
    data=None,
)


class MockCopilotService:
    """Pattern-matched mock copilot for development."""

    def answer(self, query: str) -> CopilotResponse:
        """Generate a response for a natural language query."""
        normalized = query.lower().strip()

        for pattern, resp_type, template in _QUERY_PATTERNS:
            if re.search(pattern, normalized, re.IGNORECASE):
                return CopilotResponse(
                    type=resp_type,
                    message=template,
                    data=None,
                )

        return _FALLBACK_RESPONSE


_COPILOT_SYSTEM = """You are an AI sales assistant embedded in a B2B CRM. Answer questions about the user's pipeline, contacts, and deals using the provided CRM context.

Return ONLY valid JSON:
{
  "type": "answer|action|insight|clarification",
  "message": "Your response in markdown format",
  "data": null
}
Types: answer=factual CRM data, insight=analysis+recommendations, action=something drafted/done, clarification=need more info.
Be concise, specific, actionable. Reference real numbers from context when available."""


class LLMCopilotService:
    """LLM-powered copilot using Claude."""

    def __init__(self) -> None:
        self._fallback = MockCopilotService()

    async def answer(self, query: str, context: str = "") -> CopilotResponse:
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            return self._fallback.answer(query)

        try:
            client = get_llm_client("claude-sonnet-4-6")
            user_content = (
                f"CRM Context:\n{context}\n\nUser query: {query}" if context
                else f"User query: {query}"
            )
            response = await client.chat(
                messages=[{"role": "user", "content": user_content}],
                system=_COPILOT_SYSTEM,
                max_tokens=800,
                temperature=0.4,
            )
            parsed = parse_llm_json(response)
            if not parsed:
                return self._fallback.answer(query)

            resp_type = parsed.get("type", "answer")
            if resp_type not in ("answer", "action", "insight", "clarification"):
                resp_type = "answer"

            return CopilotResponse(
                type=resp_type,
                message=parsed.get("message", "I couldn't generate a response."),
                data=parsed.get("data"),
            )
        except Exception:
            logger.exception("LLM copilot failed, using fallback")
            return self._fallback.answer(query)


class CopilotService(BaseService):
    """Business logic for the AI copilot assistant."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._copilot = LLMCopilotService()

    async def _build_context(self) -> str:
        """Build compact CRM summary to inject into copilot queries."""
        from sqlalchemy import select
        from app.models.crm import CRMContact
        from app.models.crm_deal import CRMDeal

        hot_stmt = (
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .where(CRMContact.lead_score >= 70)
            .order_by(CRMContact.lead_score.desc())
            .limit(5)
        )
        hot_result = await self.session.execute(hot_stmt)
        hot_leads = hot_result.scalars().all()

        deal_stmt = select(CRMDeal).where(CRMDeal.status == "open")
        deal_result = await self.session.execute(deal_stmt)
        deals = deal_result.scalars().all()

        total_value = sum(d.value or 0 for d in deals)
        at_risk = [d for d in deals if d.deal_health in ("yellow", "red")]

        hot_text = "\n".join(
            f"  - {c.name} ({c.title or 'Unknown'}, score={c.lead_score})"
            for c in hot_leads
        ) or "  None"

        risk_text = "\n".join(
            f"  - {d.title}: ${d.value or 0:,.0f}, stage={d.stage}, health={d.deal_health}"
            for d in at_risk[:5]
        ) or "  None"

        return (
            f"Hot leads (score 70+):\n{hot_text}\n\n"
            f"Open deals: {len(deals)} worth ${total_value:,.0f} total\n\n"
            f"At-risk deals:\n{risk_text}"
        )

    async def ask(self, query: str) -> dict[str, Any]:
        """Process a natural language query and return a response."""
        if not query or not query.strip():
            return {
                "type": "clarification",
                "message": "Please ask a question about your CRM data.",
                "data": None,
            }

        context = await self._build_context()
        result = await self._copilot.answer(query, context)
        logger.info("Copilot query: %s → type: %s", query[:80], result.type)

        return {
            "type": result.type,
            "message": result.message,
            "data": result.data,
        }
