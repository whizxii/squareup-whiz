"""Relationship strength service — AI-powered relationship health scoring.

In production, this would analyze communication patterns, sentiment, and
interaction frequency using ML models. The mock generates realistic scores.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from typing import Any

from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.repositories.crm_contact_repo import ContactRepository
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class RelationshipFactor:
    factor: str
    impact: str  # positive / negative / neutral
    detail: str


@dataclass(frozen=True)
class RelationshipResult:
    strength: int  # 1-10
    interaction_count: int
    last_interaction_at: str | None
    avg_response_time_hours: float
    sentiment_trend: str  # warming / stable / cooling
    sentiment_score: float  # 0.0-1.0
    communication_frequency: str  # daily / weekly / monthly / quarterly / inactive
    factors: tuple[RelationshipFactor, ...]


# ─── Mock templates ──────────────────────────────────────────────────

_FACTOR_POOL = [
    RelationshipFactor(
        "Regular communication",
        "positive",
        "Consistent email and call cadence over the last 30 days",
    ),
    RelationshipFactor(
        "Quick response times",
        "positive",
        "Average reply within 4 hours — indicates high engagement",
    ),
    RelationshipFactor(
        "Multi-channel engagement",
        "positive",
        "Active across email, calls, and meetings — strong relationship signal",
    ),
    RelationshipFactor(
        "Executive involvement",
        "positive",
        "Decision maker is directly engaged in communications",
    ),
    RelationshipFactor(
        "Proactive outreach",
        "positive",
        "Contact initiates conversations without being prompted",
    ),
    RelationshipFactor(
        "Declining response rate",
        "negative",
        "Response rate dropped 30% over the last 2 weeks",
    ),
    RelationshipFactor(
        "Longer response times",
        "negative",
        "Average reply time increased from 4h to 18h recently",
    ),
    RelationshipFactor(
        "Reduced meeting attendance",
        "negative",
        "Cancelled 2 of last 3 scheduled meetings",
    ),
    RelationshipFactor(
        "Single-channel only",
        "neutral",
        "Communication limited to email — consider diversifying",
    ),
    RelationshipFactor(
        "Infrequent contact",
        "negative",
        "No interaction in the last 14 days",
    ),
]

_FREQUENCY_BANDS: list[tuple[int, str]] = [
    (20, "daily"),
    (8, "weekly"),
    (3, "monthly"),
    (1, "quarterly"),
    (0, "inactive"),
]


class MockRelationshipService:
    """Generates realistic mock relationship strength scores."""

    def analyze(self, contact: CRMContact) -> RelationshipResult:
        """Analyze relationship strength for a contact."""
        activity = contact.activity_count or 0
        existing_strength = contact.relationship_strength or random.randint(3, 8)

        # Derive strength from activity + existing + randomness
        base = min(10, max(1, existing_strength + random.randint(-1, 1)))
        if activity > 10:
            base = min(10, base + 1)
        elif activity < 2:
            base = max(1, base - 1)

        # Interaction count
        interaction_count = activity or random.randint(3, 25)

        # Last interaction
        days_ago = random.randint(0, 21)
        last_interaction = (
            (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
            if days_ago < 20
            else None
        )

        # Response time
        avg_response = round(random.uniform(1.5, 48.0), 1)

        # Sentiment
        if base >= 7:
            sentiment_trend = "warming"
            sentiment_score = round(random.uniform(0.7, 0.95), 2)
        elif base >= 4:
            sentiment_trend = "stable"
            sentiment_score = round(random.uniform(0.4, 0.7), 2)
        else:
            sentiment_trend = "cooling"
            sentiment_score = round(random.uniform(0.15, 0.4), 2)

        # Communication frequency
        frequency = "inactive"
        for threshold, label in _FREQUENCY_BANDS:
            if interaction_count >= threshold:
                frequency = label
                break

        # Select factors — more positive for strong relationships
        positive_factors = [f for f in _FACTOR_POOL if f.impact == "positive"]
        negative_factors = [f for f in _FACTOR_POOL if f.impact != "positive"]

        if base >= 7:
            factors = tuple(random.sample(positive_factors, k=min(3, len(positive_factors))))
        elif base >= 4:
            mixed = random.sample(positive_factors, k=1) + random.sample(negative_factors, k=1)
            factors = tuple(mixed)
        else:
            factors = tuple(random.sample(negative_factors, k=min(2, len(negative_factors))))

        return RelationshipResult(
            strength=base,
            interaction_count=interaction_count,
            last_interaction_at=last_interaction,
            avg_response_time_hours=avg_response,
            sentiment_trend=sentiment_trend,
            sentiment_score=sentiment_score,
            communication_frequency=frequency,
            factors=factors,
        )


def serialize_relationship(
    result: RelationshipResult,
    contact_id: str,
) -> dict[str, Any]:
    """Convert RelationshipResult to API-compatible dict."""
    return {
        "id": contact_id,
        "contact_id": contact_id,
        "strength": result.strength,
        "interaction_count": result.interaction_count,
        "last_interaction_at": result.last_interaction_at,
        "avg_response_time_hours": result.avg_response_time_hours,
        "sentiment_trend": result.sentiment_trend,
        "sentiment_score": result.sentiment_score,
        "communication_frequency": result.communication_frequency,
        "factors": [asdict(f) for f in result.factors],
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }


class RelationshipStrengthService(BaseService):
    """Business logic for AI-powered relationship strength analysis."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._analyzer = MockRelationshipService()

    @property
    def contact_repo(self) -> ContactRepository:
        return ContactRepository(self.session)

    async def analyze_relationship(self, contact_id: str) -> dict[str, Any] | None:
        """Analyze relationship strength for a contact."""
        contact = await self.contact_repo.get_by_id(contact_id)
        if contact is None:
            return None

        result = self._analyzer.analyze(contact)
        serialized = serialize_relationship(result, contact_id)

        # Persist denormalized strength
        contact.relationship_strength = result.strength
        contact.updated_at = datetime.now(timezone.utc)
        self.session.add(contact)
        await self.session.commit()

        await self.events.emit("relationship.analyzed", {
            "contact_id": contact_id,
            "strength": result.strength,
            "sentiment_trend": result.sentiment_trend,
        })

        logger.info("Analyzed relationship for %s: strength %d", contact_id, result.strength)
        return serialized
