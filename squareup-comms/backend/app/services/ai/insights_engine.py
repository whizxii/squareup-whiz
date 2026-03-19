"""AIInsightsEngine — generates LLM-powered proactive insights.

Builds on the rule-based proactive_insights.py detectors by adding:
- Deal coaching with contextual reasoning
- Daily briefs with prioritized actions
- Pipeline risk summaries
- LLM enrichment of rule-based insights

Uses Claude (sonnet-4-6) for high-stakes outputs (deal coaching, daily brief)
and Groq for pipeline summaries.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, func

from app.models.ai_insight import AIInsight
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.tasks import Task
from app.services.base import BaseService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

_DEAL_COACHING_SYSTEM = """You are an expert B2B sales coach. Analyze this deal's current state
and provide specific, actionable coaching.

Return ONLY valid JSON:
{
  "title": "one-line coaching headline",
  "description": "2-3 sentence deal situation summary",
  "ai_reasoning": "3-5 sentence analysis: what's happening, why it matters, what to watch for",
  "suggested_actions": ["action 1 (be specific)", "action 2", "action 3"],
  "severity": "info|warning|critical",
  "risk_factors": ["factor 1", "factor 2"],
  "next_best_action": "the single most important thing to do right now"
}"""

_DAILY_BRIEF_SYSTEM = """You are a proactive sales assistant preparing a morning briefing.
Analyze the provided CRM data and generate a focused daily brief.

Return ONLY valid JSON:
{
  "title": "Daily Brief — <date>",
  "description": "2-3 sentence executive summary of the day ahead",
  "ai_reasoning": "what's most important today and why",
  "suggested_actions": [
    "Top priority: <specific action>",
    "Follow up: <specific action>",
    "Watch: <specific thing to monitor>"
  ],
  "severity": "info|warning|critical",
  "highlight": "the single most important thing for today"
}"""

_PIPELINE_RISK_SYSTEM = """You are a pipeline risk analyst. Review the provided deal data
and identify systemic risks and opportunities.

Return ONLY valid JSON:
{
  "title": "Pipeline Risk Report",
  "description": "2-3 sentence pipeline health summary",
  "ai_reasoning": "analysis of pipeline health, concentration risks, and momentum",
  "suggested_actions": ["action 1", "action 2", "action 3"],
  "severity": "info|warning|critical",
  "risk_score": <0-100>,
  "key_risks": ["risk 1", "risk 2"]
}"""

_INSIGHT_ENRICHMENT_SYSTEM = """You are a sales intelligence AI. A rule-based system detected
the following CRM signal. Enrich it with contextual reasoning and specific recommendations.

Return ONLY valid JSON:
{
  "ai_reasoning": "3-4 sentence analysis of why this matters and what pattern it indicates",
  "suggested_actions": ["specific action 1", "specific action 2"],
  "enriched_description": "improved description with context"
}"""


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class AIInsightsEngine(BaseService):
    """Generates and persists LLM-powered proactive insights."""

    async def generate_deal_coaching(self, deal_id: str) -> dict[str, Any] | None:
        """Generate coaching for a specific deal and persist it."""
        result = await self.session.execute(
            select(CRMDeal).where(CRMDeal.id == deal_id)
        )
        deal = result.scalars().first()
        if deal is None:
            return None

        # Gather recent activities for this deal
        activities_result = await self.session.execute(
            select(CRMActivity)
            .where(CRMActivity.contact_id == deal.contact_id)
            .order_by(CRMActivity.created_at.desc())
            .limit(10)
        )
        recent_activities = list(activities_result.scalars().all())

        context = _build_deal_context(deal, recent_activities)
        raw = await _call_llm_for_insight(context, _DEAL_COACHING_SYSTEM, model="claude-sonnet-4-6")

        insight_data = _parse_insight(raw) if raw else None
        if not insight_data:
            insight_data = _fallback_deal_coaching(deal)

        insight = AIInsight(
            type="deal_coaching",
            severity=insight_data.get("severity", "info"),
            title=insight_data.get("title", f"Deal coaching: {deal.title}"),
            description=insight_data.get("description", ""),
            ai_reasoning=insight_data.get("ai_reasoning", ""),
            suggested_actions=json.dumps(insight_data.get("suggested_actions", [])),
            entity_type="deal",
            entity_id=deal.id,
            entity_name=deal.title,
        )
        self.session.add(insight)
        await self.session.commit()

        return _serialize_insight(insight, extra=insight_data)

    async def generate_daily_brief(self, user_id: str) -> dict[str, Any]:
        """Generate today's prioritized brief for a user and persist it."""
        now = datetime.utcnow()

        # Gather pipeline snapshot for the user
        deals_result = await self.session.execute(
            select(CRMDeal).where(
                CRMDeal.status == "open",
                CRMDeal.owner_id == user_id,
            ).order_by(CRMDeal.updated_at.desc()).limit(20)
        )
        open_deals = list(deals_result.scalars().all())

        # Overdue tasks for user
        tasks_result = await self.session.execute(
            select(Task).where(
                Task.assigned_to == user_id,
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date < now,
            ).limit(10)
        )
        overdue_tasks = list(tasks_result.scalars().all())

        # Contacts needing follow-up
        followup_result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.owner_id == user_id,
                CRMContact.next_follow_up_at.isnot(None),
                CRMContact.next_follow_up_at < now,
            ).limit(10)
        )
        missed_followups = list(followup_result.scalars().all())

        context = _build_brief_context(open_deals, overdue_tasks, missed_followups, now)
        raw = await _call_llm_for_insight(context, _DAILY_BRIEF_SYSTEM, model="claude-sonnet-4-6")

        insight_data = _parse_insight(raw) if raw else None
        if not insight_data:
            insight_data = _fallback_daily_brief(open_deals, overdue_tasks, missed_followups, now)

        insight = AIInsight(
            type="daily_brief",
            severity=insight_data.get("severity", "info"),
            title=insight_data.get("title", f"Daily Brief — {now.strftime('%b %d')}"),
            description=insight_data.get("description", ""),
            ai_reasoning=insight_data.get("ai_reasoning", ""),
            suggested_actions=json.dumps(insight_data.get("suggested_actions", [])),
            target_user_id=user_id,
        )
        self.session.add(insight)
        await self.session.commit()

        return _serialize_insight(insight, extra=insight_data)

    async def generate_pipeline_risk_report(self) -> dict[str, Any]:
        """Generate a global pipeline risk report using Groq."""
        deals_result = await self.session.execute(
            select(CRMDeal).where(CRMDeal.status == "open").limit(50)
        )
        open_deals = list(deals_result.scalars().all())

        context = _build_pipeline_context(open_deals)
        raw = await _call_llm_for_insight(context, _PIPELINE_RISK_SYSTEM, model="llama-3.3-70b-versatile")

        insight_data = _parse_insight(raw) if raw else None
        if not insight_data:
            insight_data = _fallback_pipeline_report(open_deals)

        insight = AIInsight(
            type="pipeline_risk",
            severity=insight_data.get("severity", "info"),
            title=insight_data.get("title", "Pipeline Risk Report"),
            description=insight_data.get("description", ""),
            ai_reasoning=insight_data.get("ai_reasoning", ""),
            suggested_actions=json.dumps(insight_data.get("suggested_actions", [])),
        )
        self.session.add(insight)
        await self.session.commit()

        return _serialize_insight(insight, extra=insight_data)

    async def enrich_insight(
        self,
        insight_type: str,
        entity_name: str,
        base_description: str,
        metadata: dict,
    ) -> dict[str, Any]:
        """LLM-enrich a rule-based insight with reasoning and actions."""
        context = (
            f"Signal type: {insight_type}\n"
            f"Entity: {entity_name}\n"
            f"Description: {base_description}\n"
            f"Metadata: {json.dumps(metadata, default=str)}"
        )
        raw = await _call_llm_for_insight(context, _INSIGHT_ENRICHMENT_SYSTEM, model="llama-3.3-70b-versatile")
        parsed = _parse_insight(raw) if raw else {}
        return {
            "ai_reasoning": parsed.get("ai_reasoning", ""),
            "suggested_actions": parsed.get("suggested_actions", []),
            "enriched_description": parsed.get("enriched_description", base_description),
        }


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

async def _call_llm_for_insight(context: str, system: str, model: str) -> str | None:
    """Call the LLM and return raw response text, or None on failure."""
    try:
        from app.services.llm_service import get_llm_client, llm_available
        if not llm_available():
            return None
        client = get_llm_client(model)
        return await client.chat(
            messages=[{"role": "user", "content": context}],
            system=system,
            max_tokens=700,
            temperature=0.4,
        )
    except Exception:
        logger.exception("LLM insight generation failed (model=%s)", model)
        return None


def _parse_insight(raw: str) -> dict[str, Any] | None:
    """Parse LLM JSON response."""
    try:
        from app.services.llm_service import parse_llm_json
        return parse_llm_json(raw)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Context builders
# ---------------------------------------------------------------------------

def _build_deal_context(deal: CRMDeal, activities: list[CRMActivity]) -> str:
    days_stale = (datetime.utcnow() - deal.updated_at).days if deal.updated_at else 0
    activity_summary = "; ".join(
        f"{a.type}: {a.title}" for a in activities[:5]
    ) or "No recent activities"
    return (
        f"Deal: {deal.title}\n"
        f"Stage: {deal.stage}\n"
        f"Value: ${deal.value:,.0f}\n" if deal.value else f"Deal: {deal.title}\nStage: {deal.stage}\n"
        f"Days without update: {days_stale}\n"
        f"Deal health: {deal.deal_health or 'unknown'}\n"
        f"Recent activities: {activity_summary}"
    )


def _build_brief_context(
    open_deals: list[CRMDeal],
    overdue_tasks: list[Task],
    missed_followups: list[CRMContact],
    now: datetime,
) -> str:
    total_pipeline = sum(d.value or 0 for d in open_deals)
    stale_count = sum(
        1 for d in open_deals
        if d.updated_at and (now - d.updated_at).days > 7
    )
    return (
        f"Date: {now.strftime('%A, %B %d %Y')}\n"
        f"Open deals: {len(open_deals)} (total pipeline: ${total_pipeline:,.0f})\n"
        f"Stale deals (>7 days): {stale_count}\n"
        f"Overdue tasks: {len(overdue_tasks)}\n"
        f"Missed follow-ups: {len(missed_followups)}\n"
        f"Top deals by value: {', '.join(d.title for d in open_deals[:5]) or 'none'}"
    )


def _build_pipeline_context(open_deals: list[CRMDeal]) -> str:
    now = datetime.utcnow()
    total = sum(d.value or 0 for d in open_deals)
    stale = sum(1 for d in open_deals if d.updated_at and (now - d.updated_at).days > 14)
    by_stage: dict[str, int] = {}
    for d in open_deals:
        by_stage[d.stage] = by_stage.get(d.stage, 0) + 1

    return (
        f"Total open deals: {len(open_deals)}\n"
        f"Total pipeline value: ${total:,.0f}\n"
        f"Deals stale >14 days: {stale}\n"
        f"Distribution by stage: {json.dumps(by_stage)}"
    )


# ---------------------------------------------------------------------------
# Fallbacks
# ---------------------------------------------------------------------------

def _fallback_deal_coaching(deal: CRMDeal) -> dict[str, Any]:
    days_stale = (datetime.utcnow() - deal.updated_at).days if deal.updated_at else 0
    severity = "critical" if days_stale > 14 else ("warning" if days_stale > 7 else "info")
    return {
        "title": f"Deal coaching: {deal.title}",
        "description": f"This deal in stage '{deal.stage}' has been idle for {days_stale} days.",
        "ai_reasoning": f"Deal '{deal.title}' has not been updated in {days_stale} days. This may indicate a stalled negotiation or forgotten opportunity.",
        "suggested_actions": [
            "Review the last communication with this contact",
            "Schedule a check-in call or send a follow-up email",
            "Update the deal stage or close it if no longer active",
        ],
        "severity": severity,
    }


def _fallback_daily_brief(
    open_deals: list[CRMDeal],
    overdue_tasks: list[Task],
    missed_followups: list[CRMContact],
    now: datetime,
) -> dict[str, Any]:
    severity = "warning" if (overdue_tasks or missed_followups) else "info"
    actions = []
    if overdue_tasks:
        actions.append(f"Address {len(overdue_tasks)} overdue task(s)")
    if missed_followups:
        actions.append(f"Follow up with {len(missed_followups)} contact(s)")
    if open_deals:
        actions.append(f"Review your {len(open_deals)} open deal(s)")
    if not actions:
        actions = ["Review your pipeline and plan today's outreach"]
    return {
        "title": f"Daily Brief — {now.strftime('%b %d')}",
        "description": f"You have {len(open_deals)} open deals, {len(overdue_tasks)} overdue tasks, and {len(missed_followups)} missed follow-ups.",
        "ai_reasoning": "Summary generated from your current CRM state.",
        "suggested_actions": actions,
        "severity": severity,
    }


def _fallback_pipeline_report(open_deals: list[CRMDeal]) -> dict[str, Any]:
    now = datetime.utcnow()
    stale = sum(1 for d in open_deals if d.updated_at and (now - d.updated_at).days > 14)
    severity = "critical" if stale > 5 else ("warning" if stale > 2 else "info")
    return {
        "title": "Pipeline Risk Report",
        "description": f"{len(open_deals)} open deals tracked. {stale} are stale (>14 days).",
        "ai_reasoning": "Pipeline analysis based on deal activity timestamps.",
        "suggested_actions": [
            "Review stale deals and update their status",
            "Ensure all deals have next actions scheduled",
        ],
        "severity": severity,
    }


# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------

def _serialize_insight(insight: AIInsight, extra: dict | None = None) -> dict[str, Any]:
    extra = extra or {}
    try:
        actions = json.loads(insight.suggested_actions)
    except Exception:
        actions = []
    return {
        "id": insight.id,
        "type": insight.type,
        "severity": insight.severity,
        "title": insight.title,
        "description": insight.description,
        "ai_reasoning": insight.ai_reasoning,
        "suggested_actions": actions,
        "entity_type": insight.entity_type,
        "entity_id": insight.entity_id,
        "entity_name": insight.entity_name,
        "target_user_id": insight.target_user_id,
        "is_read": insight.is_read,
        "is_dismissed": insight.is_dismissed,
        "is_acted_on": insight.is_acted_on,
        "created_at": insight.created_at.isoformat(),
        # Extra fields from LLM (deal coaching, pipeline)
        "highlight": extra.get("highlight") or extra.get("next_best_action"),
        "risk_score": extra.get("risk_score"),
    }
