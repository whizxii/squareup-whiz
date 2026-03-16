"""Contact enrichment service — augments contact profiles with external data.

In production, this would integrate with Clearbit, Apollo, or LinkedIn API.
The mock generates realistic enrichment data for development.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any

from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.repositories.crm_contact_repo import ContactRepository
from app.services.base import BaseService

logger = get_logger(__name__)


@dataclass(frozen=True)
class Education:
    school: str
    degree: str | None
    field: str | None
    year: int | None


@dataclass(frozen=True)
class WorkHistory:
    company: str
    title: str
    start: str | None
    end: str | None
    current: bool


@dataclass(frozen=True)
class EnrichmentResult:
    linkedin_url: str | None
    twitter_url: str | None
    github_url: str | None
    bio: str
    headline: str
    location: str
    timezone: str
    education: tuple[Education, ...]
    work_history: tuple[WorkHistory, ...]
    skills: tuple[str, ...]
    interests: tuple[str, ...]
    mutual_connections: tuple[str, ...]
    company_news: tuple[str, ...]
    confidence_score: float
    source: str


# ─── Mock enrichment templates ──────────────────────────────────────

_MOCK_BIOS = [
    "Experienced technology leader with 10+ years driving SaaS growth. Passionate about AI-powered solutions and team building.",
    "Strategic business development professional focused on enterprise partnerships. Former consultant at McKinsey, now leading GTM at a Series B startup.",
    "Product-minded engineer turned executive. Built and scaled products from 0 to 10M ARR. Advisor to multiple early-stage startups.",
    "Revenue operations expert specializing in CRM optimization and sales process design. Speaker at SaaStr and Pavilion events.",
]

_MOCK_HEADLINES = [
    "VP of Sales | Scaling Revenue Teams | SaaS Enthusiast",
    "Head of Business Development | Enterprise Partnerships",
    "CTO & Co-founder | Building the Future of Work",
    "Director of RevOps | Process Optimization | Data-Driven",
]

_MOCK_LOCATIONS = [
    "San Francisco, CA", "New York, NY", "Austin, TX", "London, UK",
    "Bangalore, India", "Singapore", "Toronto, Canada", "Berlin, Germany",
]

_MOCK_TIMEZONES = [
    "America/Los_Angeles", "America/New_York", "America/Chicago",
    "Europe/London", "Asia/Kolkata", "Asia/Singapore",
]

_MOCK_SCHOOLS = [
    Education("Stanford University", "MBA", "Business Administration", 2018),
    Education("MIT", "BS", "Computer Science", 2014),
    Education("IIT Bombay", "BTech", "Engineering", 2015),
    Education("London Business School", "MBA", "Strategy", 2019),
    Education("UC Berkeley", "MS", "Data Science", 2017),
]

_MOCK_WORK_HISTORY = [
    WorkHistory("Stripe", "Head of Sales", "2022-01", None, True),
    WorkHistory("Salesforce", "Senior Account Executive", "2019-06", "2022-01", False),
    WorkHistory("McKinsey & Company", "Associate", "2017-08", "2019-05", False),
    WorkHistory("Notion", "VP Engineering", "2023-03", None, True),
    WorkHistory("Google", "Senior PM", "2020-01", "2023-02", False),
    WorkHistory("Accenture", "Manager", "2016-09", "2019-12", False),
]

_MOCK_SKILLS = [
    "SaaS Sales", "Enterprise Selling", "CRM Implementation", "Revenue Operations",
    "Team Leadership", "Strategic Partnerships", "Product Management", "Data Analytics",
    "Python", "SQL", "Negotiation", "Account Management", "Go-to-Market Strategy",
]

_MOCK_INTERESTS = [
    "AI/ML", "Remote Work", "Leadership", "Startup Ecosystem", "Climate Tech",
    "Open Source", "Product-Led Growth", "Revenue Intelligence",
]

_MOCK_NEWS = [
    "Announced $50M Series C funding round led by Sequoia Capital",
    "Launched new AI-powered analytics feature for enterprise customers",
    "Named in Forbes Cloud 100 for the second consecutive year",
    "Expanded operations to APAC region with Singapore office",
    "Reported 200% YoY revenue growth in Q4 2025 earnings",
]


class MockEnrichmentService:
    """Generates realistic mock enrichment data for development."""

    def enrich(self, contact: CRMContact) -> EnrichmentResult:
        """Generate mock enrichment data for a contact."""
        name_slug = (contact.name or "user").lower().replace(" ", "")

        return EnrichmentResult(
            linkedin_url=f"https://linkedin.com/in/{name_slug}",
            twitter_url=f"https://twitter.com/{name_slug}" if random.random() > 0.3 else None,
            github_url=f"https://github.com/{name_slug}" if random.random() > 0.5 else None,
            bio=random.choice(_MOCK_BIOS),
            headline=random.choice(_MOCK_HEADLINES),
            location=random.choice(_MOCK_LOCATIONS),
            timezone=random.choice(_MOCK_TIMEZONES),
            education=tuple(random.sample(_MOCK_SCHOOLS, k=random.randint(1, 2))),
            work_history=tuple(random.sample(_MOCK_WORK_HISTORY, k=random.randint(2, 3))),
            skills=tuple(random.sample(_MOCK_SKILLS, k=random.randint(4, 7))),
            interests=tuple(random.sample(_MOCK_INTERESTS, k=random.randint(2, 4))),
            mutual_connections=tuple(
                f"Connection {i}" for i in random.sample(range(1, 20), k=random.randint(0, 3))
            ),
            company_news=tuple(random.sample(_MOCK_NEWS, k=random.randint(1, 3))),
            confidence_score=round(random.uniform(0.7, 0.98), 2),
            source="mock-enrichment-v1",
        )


def serialize_enrichment(
    result: EnrichmentResult,
    contact_id: str,
) -> dict[str, Any]:
    """Convert EnrichmentResult to API-compatible dict."""
    return {
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "linkedin_url": result.linkedin_url,
        "twitter_url": result.twitter_url,
        "github_url": result.github_url,
        "bio": result.bio,
        "headline": result.headline,
        "location": result.location,
        "timezone": result.timezone,
        "education": [asdict(e) for e in result.education],
        "work_history": [asdict(w) for w in result.work_history],
        "skills": list(result.skills),
        "interests": list(result.interests),
        "mutual_connections": list(result.mutual_connections),
        "company_news": list(result.company_news),
        "confidence_score": result.confidence_score,
        "enriched_at": datetime.now(timezone.utc).isoformat(),
        "source": result.source,
    }


class ContactEnrichmentService(BaseService):
    """Business logic for AI-powered contact enrichment."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._enricher = MockEnrichmentService()

    @property
    def contact_repo(self) -> ContactRepository:
        return ContactRepository(self.session)

    async def enrich_contact(self, contact_id: str) -> dict[str, Any] | None:
        """Enrich a single contact with external data."""
        contact = await self.contact_repo.get_by_id(contact_id)
        if contact is None:
            return None

        result = self._enricher.enrich(contact)
        serialized = serialize_enrichment(result, contact_id)

        # Emit event for activity capture
        await self.events.emit("enrichment.completed", {
            "contact_id": contact_id,
            "source": result.source,
            "confidence": result.confidence_score,
        })

        logger.info("Enriched contact %s (confidence: %.2f)", contact_id, result.confidence_score)
        return serialized
