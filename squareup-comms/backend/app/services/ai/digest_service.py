"""DigestService — generates weekly team recaps using LLM."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.models.crm import CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.digest import Digest
from app.services.base import BaseService

logger = logging.getLogger(__name__)

_WEEKLY_DIGEST_SYSTEM = """You are a sales intelligence AI generating a weekly team digest.
Analyze the provided CRM activity data and produce a concise, insightful recap.

Return ONLY valid JSON:
{
  "title": "Weekly Digest — <date range>",
  "summary": "2-3 sentence executive summary of the week",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "insight": "one key insight or pattern noticed this week",
  "recommendation": "one key recommendation for next week"
}"""


class DigestService(BaseService):
    """Generates weekly and daily digest summaries."""

    async def generate_weekly_digest(
        self,
        target_user_id: str | None = None,
    ) -> Digest:
        """Generate a weekly digest for the team or a specific user."""
        now = datetime.utcnow()
        week_start = now - timedelta(days=7)

        deals_result = await self.session.execute(
            select(CRMDeal).where(CRMDeal.updated_at >= week_start)
        )
        active_deals = list(deals_result.scalars().all())

        won_deals = [d for d in active_deals if d.status == "won"]
        lost_deals = [d for d in active_deals if d.status == "lost"]
        new_deals = [d for d in active_deals if d.created_at and d.created_at >= week_start]

        activities_result = await self.session.execute(
            select(CRMActivity).where(CRMActivity.created_at >= week_start).limit(100)
        )
        activities = list(activities_result.scalars().all())

        stats = {
            "deals_won": len(won_deals),
            "deals_lost": len(lost_deals),
            "new_deals": len(new_deals),
            "total_won_value": sum(d.value or 0 for d in won_deals),
            "activities_logged": len(activities),
            "week_start": week_start.strftime("%b %d"),
            "week_end": now.strftime("%b %d"),
        }

        context = (
            f"Week: {week_start.strftime('%b %d')} – {now.strftime('%b %d, %Y')}\n"
            f"Deals won: {len(won_deals)} (${sum(d.value or 0 for d in won_deals):,.0f})\n"
            f"Deals lost: {len(lost_deals)}\n"
            f"New deals opened: {len(new_deals)}\n"
            f"Activities logged: {len(activities)}\n"
            f"Top won deals: {', '.join(d.title for d in won_deals[:3]) or 'none'}\n"
        )

        digest_data = await _call_llm_digest(context)
        if not digest_data:
            digest_data = _fallback_weekly_digest(stats)

        highlights: list[str] = list(digest_data.get("highlights", []))
        if digest_data.get("insight"):
            highlights.append(f"Insight: {digest_data['insight']}")
        if digest_data.get("recommendation"):
            highlights.append(f"Next week: {digest_data['recommendation']}")

        digest = Digest(
            id=str(uuid.uuid4()),
            digest_type="weekly",
            target_user_id=target_user_id,
            title=digest_data.get(
                "title",
                f"Weekly Digest — {week_start.strftime('%b %d')}–{now.strftime('%b %d')}",
            ),
            summary=digest_data.get("summary", ""),
            highlights=json.dumps(highlights),
            stats=json.dumps(stats),
            week_start=week_start,
            week_end=now,
        )
        self.session.add(digest)
        await self.session.commit()
        await self.session.refresh(digest)
        logger.info("Weekly digest generated: %s", digest.id)
        return digest


async def _call_llm_digest(context: str) -> dict[str, Any] | None:
    """Call LLM for digest generation."""
    try:
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            return None
        client = get_llm_client("claude-sonnet-4-6")
        raw = await client.chat(
            messages=[{"role": "user", "content": context}],
            system=_WEEKLY_DIGEST_SYSTEM,
            max_tokens=600,
            temperature=0.5,
        )
        return parse_llm_json(raw) if raw else None
    except Exception:
        logger.exception("Digest LLM call failed")
        return None


def _fallback_weekly_digest(stats: dict) -> dict[str, Any]:
    won = stats["deals_won"]
    lost = stats["deals_lost"]
    value = stats["total_won_value"]
    acts = stats["activities_logged"]
    return {
        "title": f"Weekly Digest — {stats['week_start']}–{stats['week_end']}",
        "summary": (
            f"This week the team won {won} deal(s) worth ${value:,.0f} and lost {lost}. "
            f"{acts} activities were logged across all contacts."
        ),
        "highlights": [
            f"{won} deal(s) closed this week",
            f"${value:,.0f} in new revenue",
            f"{acts} activities logged",
        ],
    }
