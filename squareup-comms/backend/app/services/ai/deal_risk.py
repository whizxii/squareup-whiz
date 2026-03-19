"""Deal risk assessment service — AI-powered deal health and risk analysis.

In production, this would use ML models trained on historical deal data.
The mock generates realistic risk assessments based on deal attributes.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any

from app.core.logging_config import get_logger
from app.models.crm_deal import CRMDeal
from app.repositories.crm_deal_repo import DealRepository
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class RiskFactor:
    factor: str
    severity: str  # low / medium / high
    detail: str
    recommendation: str


@dataclass(frozen=True)
class DealRiskResult:
    risk_level: str  # low / medium / high / critical
    risk_score: int  # 0-100
    risk_factors: tuple[RiskFactor, ...]
    predicted_outcome: str  # win / lose / stall
    predicted_close_date: str | None
    confidence: float
    ai_reasoning: str


# ─── Mock risk templates ─────────────────────────────────────────────

_RISK_FACTOR_POOL = [
    RiskFactor(
        "Stalled in stage",
        "high",
        "Deal has been in current stage for 15+ days without advancement",
        "Schedule a check-in call to uncover blockers and re-establish timeline",
    ),
    RiskFactor(
        "No recent activity",
        "high",
        "No emails, calls, or meetings in the last 10 days",
        "Re-engage with value-add content or a personalized follow-up",
    ),
    RiskFactor(
        "Champion went silent",
        "medium",
        "Primary contact hasn't responded to last 2 outreach attempts",
        "Try multi-threading — reach out to another stakeholder",
    ),
    RiskFactor(
        "Competitor mentioned",
        "medium",
        "Contact referenced evaluating a competing solution",
        "Prepare a competitive battle card and highlight unique differentiators",
    ),
    RiskFactor(
        "Budget concerns",
        "medium",
        "Pricing was flagged as a concern in the last meeting",
        "Propose a phased rollout or explore flexible payment terms",
    ),
    RiskFactor(
        "Delayed close date",
        "high",
        "Expected close date has been pushed back twice",
        "Identify the real decision timeline and create urgency with a deadline offer",
    ),
    RiskFactor(
        "Missing decision maker",
        "high",
        "Executive sponsor has not been engaged in the process",
        "Request an exec-to-exec meeting to align on strategic value",
    ),
    RiskFactor(
        "Low engagement score",
        "low",
        "Contact engagement is below average for deals at this stage",
        "Increase touchpoints and provide relevant case studies",
    ),
    RiskFactor(
        "Legal review pending",
        "medium",
        "Contract is waiting for legal approval for 5+ days",
        "Offer to join a call with their legal team to address concerns directly",
    ),
    RiskFactor(
        "Small deal size relative to effort",
        "low",
        "Deal value may not justify the current sales cycle investment",
        "Consider streamlining the process with a self-serve option",
    ),
]

_REASONING_TEMPLATES = [
    "This deal shows {risk_level} risk. {primary_factor} is the primary concern. "
    "The overall engagement pattern suggests a {outcome} outcome if no intervention occurs. "
    "Recommend prioritizing {recommendation}.",
    "Deal health is {risk_level}. Analysis identifies {count} risk factors, "
    "with {primary_factor} being the most critical. "
    "Based on similar deals, predicted outcome is {outcome} with {confidence}% confidence.",
    "Assessment indicates {risk_level} risk for this opportunity. "
    "{primary_factor} combined with {secondary_factor} suggests the deal may {outcome}. "
    "Immediate action on the top recommendation could improve the trajectory.",
]


class MockDealRiskService:
    """Generates realistic mock deal risk assessments."""

    def assess(self, deal: CRMDeal) -> DealRiskResult:
        """Assess risk for a deal based on its attributes."""
        # Determine risk level based on deal attributes
        risk_signals = 0

        if deal.deal_health == "red":
            risk_signals += 3
        elif deal.deal_health == "yellow":
            risk_signals += 1

        if deal.probability < 30:
            risk_signals += 2
        elif deal.probability < 50:
            risk_signals += 1

        if deal.expected_close_date:
            days_to_close = (deal.expected_close_date - datetime.utcnow()).days
            if days_to_close < 0:
                risk_signals += 3  # Overdue
            elif days_to_close < 7:
                risk_signals += 1

        # Add randomness for mock variation
        risk_signals += random.randint(0, 2)

        if risk_signals >= 5:
            risk_level = "critical"
            risk_score = random.randint(75, 95)
        elif risk_signals >= 3:
            risk_level = "high"
            risk_score = random.randint(55, 75)
        elif risk_signals >= 1:
            risk_level = "medium"
            risk_score = random.randint(30, 55)
        else:
            risk_level = "low"
            risk_score = random.randint(5, 30)

        # Select risk factors
        num_factors = {"low": 1, "medium": 2, "high": 3, "critical": 4}[risk_level]
        risk_factors = tuple(random.sample(_RISK_FACTOR_POOL, k=min(num_factors, len(_RISK_FACTOR_POOL))))

        # Predicted outcome
        if risk_score > 70:
            predicted_outcome = random.choice(["lose", "stall"])
        elif risk_score > 40:
            predicted_outcome = random.choice(["stall", "win"])
        else:
            predicted_outcome = "win"

        # Predicted close date
        predicted_close = None
        if deal.expected_close_date:
            offset_days = random.randint(-7, 14)
            predicted_dt = deal.expected_close_date + timedelta(days=offset_days)
            predicted_close = predicted_dt.isoformat()

        confidence = round(random.uniform(0.65, 0.92), 2)

        reasoning = random.choice(_REASONING_TEMPLATES).format(
            risk_level=risk_level,
            primary_factor=risk_factors[0].factor if risk_factors else "no factors",
            secondary_factor=risk_factors[1].factor if len(risk_factors) > 1 else "other signals",
            outcome=predicted_outcome,
            count=len(risk_factors),
            confidence=int(confidence * 100),
            recommendation=risk_factors[0].recommendation if risk_factors else "reviewing the deal",
        )

        return DealRiskResult(
            risk_level=risk_level,
            risk_score=risk_score,
            risk_factors=risk_factors,
            predicted_outcome=predicted_outcome,
            predicted_close_date=predicted_close,
            confidence=confidence,
            ai_reasoning=reasoning,
        )


def serialize_deal_risk(
    result: DealRiskResult,
    deal_id: str,
) -> dict[str, Any]:
    """Convert DealRiskResult to API-compatible dict."""
    return {
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        "risk_level": result.risk_level,
        "risk_score": result.risk_score,
        "risk_factors": [asdict(f) for f in result.risk_factors],
        "predicted_outcome": result.predicted_outcome,
        "predicted_close_date": result.predicted_close_date,
        "confidence": result.confidence,
        "ai_reasoning": result.ai_reasoning,
        "assessed_at": datetime.utcnow().isoformat(),
    }


_DEAL_RISK_SYSTEM = """You are a B2B sales deal risk assessment AI. Analyze this deal and identify risk factors.

Return ONLY valid JSON:
{
  "risk_level": "low|medium|high|critical",
  "risk_score": <0-100>,
  "risk_factors": [
    {"factor": "...", "severity": "low|medium|high", "detail": "...", "recommendation": "..."}
  ],
  "predicted_outcome": "win|lose|stall",
  "predicted_close_date": "ISO date string or null",
  "confidence": <0.0-1.0>,
  "ai_reasoning": "2-3 sentence analysis"
}
Provide 2-4 risk factors. Score ranges: low=0-30, medium=30-55, high=55-75, critical=75-100."""


class LLMDealRiskService:
    """LLM-powered deal risk assessment using Claude."""

    def __init__(self) -> None:
        self._fallback = MockDealRiskService()

    async def assess(self, deal: CRMDeal) -> DealRiskResult:
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            return self._fallback.assess(deal)

        try:
            client = get_llm_client("claude-sonnet-4-6")
            context = (
                f"Title: {deal.title or 'Untitled'}\n"
                f"Stage: {deal.stage or 'Unknown'}\n"
                f"Value: ${deal.value or 0:,.0f} {deal.currency or 'USD'}\n"
                f"Probability: {deal.probability}%\n"
                f"Deal health: {deal.deal_health or 'unknown'}\n"
                f"Status: {deal.status or 'open'}\n"
                f"Expected close: {deal.expected_close_date.isoformat() if deal.expected_close_date else 'Not set'}\n"
                f"Created: {deal.created_at.isoformat() if deal.created_at else 'Unknown'}\n"
                f"Updated: {deal.updated_at.isoformat() if deal.updated_at else 'Unknown'}"
            )
            response = await client.chat(
                messages=[{"role": "user", "content": f"Assess risk for this deal:\n\n{context}"}],
                system=_DEAL_RISK_SYSTEM,
                max_tokens=800,
                temperature=0.3,
            )
            parsed = parse_llm_json(response)
            if not parsed:
                return self._fallback.assess(deal)

            def _make_factors(raw: list) -> tuple:
                factors = tuple(
                    RiskFactor(
                        f.get("factor", "Unknown"),
                        f.get("severity", "medium"),
                        f.get("detail", ""),
                        f.get("recommendation", ""),
                    )
                    for f in raw[:4] if isinstance(f, dict) and f.get("factor")
                )
                return factors if factors else tuple(random.sample(_RISK_FACTOR_POOL, k=2))

            risk_level = parsed.get("risk_level", "medium")
            if risk_level not in ("low", "medium", "high", "critical"):
                risk_level = "medium"
            predicted_outcome = parsed.get("predicted_outcome", "stall")
            if predicted_outcome not in ("win", "lose", "stall"):
                predicted_outcome = "stall"

            return DealRiskResult(
                risk_level=risk_level,
                risk_score=max(0, min(100, int(parsed.get("risk_score", 50)))),
                risk_factors=_make_factors(parsed.get("risk_factors", [])),
                predicted_outcome=predicted_outcome,
                predicted_close_date=parsed.get("predicted_close_date"),
                confidence=max(0.0, min(1.0, float(parsed.get("confidence", 0.75)))),
                ai_reasoning=parsed.get("ai_reasoning", "AI analysis completed."),
            )
        except Exception:
            logger.exception("LLM deal risk assessment failed, using fallback")
            return self._fallback.assess(deal)


class DealRiskService(BaseService):
    """Business logic for AI-powered deal risk assessment."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._assessor = LLMDealRiskService()

    @property
    def deal_repo(self) -> DealRepository:
        return DealRepository(self.session)

    async def assess_deal(self, deal_id: str) -> dict[str, Any] | None:
        """Assess risk for a single deal."""
        deal = await self.deal_repo.get_by_id(deal_id)
        if deal is None:
            return None

        result = await self._assessor.assess(deal)
        serialized = serialize_deal_risk(result, deal_id)

        # Update deal health based on risk
        health_map = {"low": "green", "medium": "yellow", "high": "red", "critical": "red"}
        deal.deal_health = health_map[result.risk_level]
        deal.updated_at = datetime.utcnow()
        self.session.add(deal)
        await self.session.commit()

        # Emit event for dashboards / notifications
        await self.events.emit("deal.risk_assessed", {
            "deal_id": deal_id,
            "risk_level": result.risk_level,
            "risk_score": result.risk_score,
            "predicted_outcome": result.predicted_outcome,
        })

        logger.info("Assessed deal %s: %s risk (score %d)", deal_id, result.risk_level, result.risk_score)
        return serialized

    async def get_at_risk_deals(self) -> list[CRMDeal]:
        """Return all open deals with yellow/red health."""
        from sqlalchemy import select
        stmt = (
            select(CRMDeal)
            .where(CRMDeal.status == "open")
            .where(CRMDeal.deal_health.in_(["yellow", "red"]))
            .order_by(CRMDeal.updated_at.desc())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
