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
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.models.ai_insight import AIInsight
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_calendar import CRMCalendarEvent
from app.models.crm_company import CRMCompany
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

_DAILY_BRIEF_SYSTEM = """You are a proactive executive assistant preparing a morning briefing.
Analyze the provided CRM data, calendar schedule, and task list to generate a focused daily brief.

Consider:
- Today's meetings and who you're meeting with (prep context for each)
- Overdue tasks and tasks due today that need attention
- Deals that are stalling or need follow-up
- Missed follow-ups that could hurt relationships

Return ONLY valid JSON:
{
  "title": "Daily Brief — <date>",
  "description": "2-3 sentence executive summary of the day ahead",
  "ai_reasoning": "what's most important today and why",
  "suggested_actions": [
    "Top priority: <specific action>",
    "Follow up: <specific action>",
    "Prepare: <meeting prep or upcoming deadline>",
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

_EVENING_BRIEF_SYSTEM = """You are a proactive executive assistant preparing an end-of-day briefing.
Analyze the provided data to generate a focused evening brief that helps the user
prepare for tomorrow and reflect on today's accomplishments.

Consider:
- What was accomplished today (completed tasks, deal movements, meetings held)
- Tomorrow's meetings with attendee context
- Tasks due tomorrow that need preparation
- Stale deals or missed follow-ups that should be addressed first thing
- Suggested priorities for the morning

Return ONLY valid JSON:
{
  "title": "Evening Brief — <date>",
  "description": "2-3 sentence summary of today's outcomes and tomorrow's outlook",
  "ai_reasoning": "what went well today and what needs attention tomorrow",
  "suggested_actions": [
    "Prep for: <tomorrow's first meeting>",
    "Priority: <most important task for tomorrow>",
    "Follow up: <specific contact or deal>",
    "Review: <something that needs attention>"
  ],
  "severity": "info|warning|critical",
  "today_highlights": "brief summary of today's accomplishments",
  "tomorrow_focus": "the single most important thing for tomorrow"
}"""

_CROSS_DEAL_PATTERNS_SYSTEM = """You are a sales analytics expert. Analyze the deal portfolio
data below to find cross-deal patterns, trends, and actionable opportunities.

Look for:
1. Industry or company-size clusters where win rates differ from average
2. Stage bottlenecks where deals stall longest
3. Value-based patterns (large vs small deals behaving differently)
4. Source effectiveness (which lead sources convert best)
5. Timing patterns (cycle length by segment, seasonal trends)
6. At-risk patterns (characteristics of deals that were lost)

Return ONLY valid JSON:
{
  "title": "Cross-Deal Pattern Report",
  "description": "2-3 sentence executive summary of the most important finding",
  "ai_reasoning": "detailed analysis of the patterns found across the pipeline",
  "patterns": [
    {
      "pattern": "short description of the pattern",
      "detail": "1-2 sentence explanation with specific numbers",
      "impact": "high|medium|low",
      "action": "specific recommended action"
    }
  ],
  "suggested_actions": ["top action 1", "top action 2", "top action 3"],
  "severity": "info|warning|critical",
  "win_rate": <overall win rate 0-100 or null>,
  "avg_cycle_days": <average days to close or null>,
  "top_segment": "the best-performing segment name or null"
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
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + timedelta(days=1)

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

        # Tasks due today (not yet overdue)
        today_tasks_result = await self.session.execute(
            select(Task).where(
                Task.assigned_to == user_id,
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date >= today_start,
                Task.due_date < tomorrow_start,
            ).limit(10)
        )
        tasks_due_today = list(today_tasks_result.scalars().all())

        # Today's calendar events
        cal_result = await self.session.execute(
            select(CRMCalendarEvent).where(
                CRMCalendarEvent.start_at >= today_start,
                CRMCalendarEvent.start_at < tomorrow_start,
                CRMCalendarEvent.status != "cancelled",
            ).order_by(CRMCalendarEvent.start_at.asc()).limit(15)
        )
        todays_events = list(cal_result.scalars().all())

        # Contacts needing follow-up
        followup_result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.owner_id == user_id,
                CRMContact.next_follow_up_at.isnot(None),
                CRMContact.next_follow_up_at < now,
            ).limit(10)
        )
        missed_followups = list(followup_result.scalars().all())

        context = _build_brief_context(
            open_deals, overdue_tasks, missed_followups, now,
            todays_events, tasks_due_today,
        )
        raw = await _call_llm_for_insight(context, _DAILY_BRIEF_SYSTEM, model="claude-sonnet-4-6")

        insight_data = _parse_insight(raw) if raw else None
        if not insight_data:
            insight_data = _fallback_daily_brief(
                open_deals, overdue_tasks, missed_followups, now,
                todays_events, tasks_due_today,
            )

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

    async def generate_evening_brief(self, user_id: str) -> dict[str, Any]:
        """Generate an end-of-day brief: today's recap + tomorrow's preview."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + timedelta(days=1)
        tomorrow_end = tomorrow_start + timedelta(days=1)

        # Today's completed tasks (accomplishments)
        completed_result = await self.session.execute(
            select(Task).where(
                Task.assigned_to == user_id,
                Task.status == "done",
                Task.updated_at >= today_start,
                Task.updated_at < tomorrow_start,
            ).limit(15)
        )
        completed_tasks = list(completed_result.scalars().all())

        # Tasks due tomorrow
        tomorrow_tasks_result = await self.session.execute(
            select(Task).where(
                Task.assigned_to == user_id,
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date >= tomorrow_start,
                Task.due_date < tomorrow_end,
            ).limit(10)
        )
        tasks_due_tomorrow = list(tomorrow_tasks_result.scalars().all())

        # Overdue tasks (still open)
        overdue_result = await self.session.execute(
            select(Task).where(
                Task.assigned_to == user_id,
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date < now,
            ).limit(10)
        )
        overdue_tasks = list(overdue_result.scalars().all())

        # Tomorrow's calendar events
        tomorrow_events_result = await self.session.execute(
            select(CRMCalendarEvent).where(
                CRMCalendarEvent.start_at >= tomorrow_start,
                CRMCalendarEvent.start_at < tomorrow_end,
                CRMCalendarEvent.status != "cancelled",
            ).order_by(CRMCalendarEvent.start_at.asc()).limit(15)
        )
        tomorrow_events = list(tomorrow_events_result.scalars().all())

        # Today's calendar events (recap)
        today_events_result = await self.session.execute(
            select(CRMCalendarEvent).where(
                CRMCalendarEvent.start_at >= today_start,
                CRMCalendarEvent.start_at < tomorrow_start,
                CRMCalendarEvent.status != "cancelled",
            ).limit(15)
        )
        today_events = list(today_events_result.scalars().all())

        # Open deals needing attention
        deals_result = await self.session.execute(
            select(CRMDeal).where(
                CRMDeal.status == "open",
                CRMDeal.owner_id == user_id,
            ).order_by(CRMDeal.updated_at.asc()).limit(10)
        )
        open_deals = list(deals_result.scalars().all())

        # Contacts needing follow-up
        followup_result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.owner_id == user_id,
                CRMContact.next_follow_up_at.isnot(None),
                CRMContact.next_follow_up_at < tomorrow_end,
            ).limit(10)
        )
        pending_followups = list(followup_result.scalars().all())

        context = _build_evening_context(
            completed_tasks, tasks_due_tomorrow, overdue_tasks,
            tomorrow_events, today_events, open_deals, pending_followups, now,
        )
        raw = await _call_llm_for_insight(context, _EVENING_BRIEF_SYSTEM, model="claude-sonnet-4-6")

        insight_data = _parse_insight(raw) if raw else None
        if not insight_data:
            insight_data = _fallback_evening_brief(
                completed_tasks, tasks_due_tomorrow, overdue_tasks,
                tomorrow_events, today_events, open_deals, pending_followups, now,
            )

        insight = AIInsight(
            type="evening_brief",
            severity=insight_data.get("severity", "info"),
            title=insight_data.get("title", f"Evening Brief — {now.strftime('%b %d')}"),
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

    async def generate_cross_deal_patterns(self) -> dict[str, Any]:
        """Analyse all recent deals to find cross-deal patterns and persist the insight."""
        now = datetime.utcnow()
        lookback = now - timedelta(days=90)

        # Fetch deals from the last 90 days (open + won + lost)
        deals_result = await self.session.execute(
            select(CRMDeal).where(
                CRMDeal.created_at >= lookback,
            ).order_by(CRMDeal.created_at.desc()).limit(200)
        )
        all_deals = list(deals_result.scalars().all())

        if not all_deals:
            return _empty_cross_deal_result()

        # Gather related contacts for source/stage info
        contact_ids = list({d.contact_id for d in all_deals})
        contacts_result = await self.session.execute(
            select(CRMContact).where(CRMContact.id.in_(contact_ids))
        )
        contacts_by_id = {c.id: c for c in contacts_result.scalars().all()}

        # Gather related companies for industry/size info
        company_ids = list({d.company_id for d in all_deals if d.company_id})
        companies_by_id: dict[str, CRMCompany] = {}
        if company_ids:
            companies_result = await self.session.execute(
                select(CRMCompany).where(CRMCompany.id.in_(company_ids))
            )
            companies_by_id = {c.id: c for c in companies_result.scalars().all()}

        context = _build_cross_deal_context(all_deals, contacts_by_id, companies_by_id, now)
        raw = await _call_llm_for_insight(
            context, _CROSS_DEAL_PATTERNS_SYSTEM, model="claude-sonnet-4-6",
        )

        insight_data = _parse_insight(raw) if raw else None
        if not insight_data:
            insight_data = _fallback_cross_deal_patterns(
                all_deals, contacts_by_id, companies_by_id, now,
            )

        insight = AIInsight(
            type="cross_deal_patterns",
            severity=insight_data.get("severity", "info"),
            title=insight_data.get("title", "Cross-Deal Pattern Report"),
            description=insight_data.get("description", ""),
            ai_reasoning=insight_data.get("ai_reasoning", ""),
            suggested_actions=json.dumps(insight_data.get("suggested_actions", [])),
        )
        self.session.add(insight)
        await self.session.commit()

        return _serialize_insight(insight, extra=insight_data)


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
    value_line = f"Value: ${deal.value:,.0f}\n" if deal.value else ""
    return (
        f"Deal: {deal.title}\n"
        f"Stage: {deal.stage}\n"
        f"{value_line}"
        f"Days without update: {days_stale}\n"
        f"Deal health: {deal.deal_health or 'unknown'}\n"
        f"Recent activities: {activity_summary}"
    )


def _build_brief_context(
    open_deals: list[CRMDeal],
    overdue_tasks: list[Task],
    missed_followups: list[CRMContact],
    now: datetime,
    todays_events: list[CRMCalendarEvent] | None = None,
    tasks_due_today: list[Task] | None = None,
) -> str:
    todays_events = todays_events or []
    tasks_due_today = tasks_due_today or []

    total_pipeline = sum(d.value or 0 for d in open_deals)
    stale_count = sum(
        1 for d in open_deals
        if d.updated_at and (now - d.updated_at).days > 7
    )

    # Calendar schedule
    if todays_events:
        event_lines = []
        for e in todays_events[:8]:
            time_str = e.start_at.strftime("%I:%M %p") if e.start_at else "TBD"
            event_lines.append(f"  - {time_str}: {e.title}")
        calendar_section = f"Today's meetings ({len(todays_events)}):\n" + "\n".join(event_lines)
    else:
        calendar_section = "Today's meetings: none scheduled"

    # Tasks due today
    if tasks_due_today:
        task_lines = [f"  - {t.title}" for t in tasks_due_today[:5]]
        today_tasks_section = f"Tasks due today ({len(tasks_due_today)}):\n" + "\n".join(task_lines)
    else:
        today_tasks_section = "Tasks due today: none"

    # Overdue tasks
    if overdue_tasks:
        overdue_lines = [f"  - {t.title} (due {t.due_date.strftime('%b %d') if t.due_date else '?'})" for t in overdue_tasks[:5]]
        overdue_section = f"Overdue tasks ({len(overdue_tasks)}):\n" + "\n".join(overdue_lines)
    else:
        overdue_section = "Overdue tasks: none"

    return (
        f"Date: {now.strftime('%A, %B %d %Y')}\n\n"
        f"{calendar_section}\n\n"
        f"{today_tasks_section}\n\n"
        f"{overdue_section}\n\n"
        f"Open deals: {len(open_deals)} (total pipeline: ${total_pipeline:,.0f})\n"
        f"Stale deals (>7 days): {stale_count}\n"
        f"Missed follow-ups: {len(missed_followups)}\n"
        f"Top deals by value: {', '.join(d.title for d in open_deals[:5]) or 'none'}"
    )


def _build_evening_context(
    completed_tasks: list[Task],
    tasks_due_tomorrow: list[Task],
    overdue_tasks: list[Task],
    tomorrow_events: list[CRMCalendarEvent],
    today_events: list[CRMCalendarEvent],
    open_deals: list[CRMDeal],
    pending_followups: list[CRMContact],
    now: datetime,
) -> str:
    tomorrow = now + timedelta(days=1)

    # Today's accomplishments
    if completed_tasks:
        done_lines = [f"  - {t.title}" for t in completed_tasks[:8]]
        done_section = f"Completed today ({len(completed_tasks)}):\n" + "\n".join(done_lines)
    else:
        done_section = "Completed today: none tracked"

    # Today's meetings (recap)
    if today_events:
        today_lines = [f"  - {e.title}" for e in today_events[:6]]
        today_section = f"Today's meetings ({len(today_events)}):\n" + "\n".join(today_lines)
    else:
        today_section = "Today's meetings: none"

    # Tomorrow's schedule
    if tomorrow_events:
        event_lines = []
        for e in tomorrow_events[:8]:
            time_str = e.start_at.strftime("%I:%M %p") if e.start_at else "TBD"
            event_lines.append(f"  - {time_str}: {e.title}")
        tomorrow_cal = f"Tomorrow's meetings ({len(tomorrow_events)}):\n" + "\n".join(event_lines)
    else:
        tomorrow_cal = "Tomorrow's meetings: none scheduled"

    # Tasks due tomorrow
    if tasks_due_tomorrow:
        task_lines = [f"  - {t.title}" for t in tasks_due_tomorrow[:5]]
        tomorrow_tasks = f"Tasks due tomorrow ({len(tasks_due_tomorrow)}):\n" + "\n".join(task_lines)
    else:
        tomorrow_tasks = "Tasks due tomorrow: none"

    # Overdue
    if overdue_tasks:
        overdue_lines = [
            f"  - {t.title} (due {t.due_date.strftime('%b %d') if t.due_date else '?'})"
            for t in overdue_tasks[:5]
        ]
        overdue_section = f"Overdue tasks ({len(overdue_tasks)}):\n" + "\n".join(overdue_lines)
    else:
        overdue_section = "Overdue tasks: none"

    # Follow-ups
    followup_section = f"Pending follow-ups: {len(pending_followups)}"
    if pending_followups:
        fu_lines = [f"  - {c.name}" for c in pending_followups[:5]]
        followup_section += "\n" + "\n".join(fu_lines)

    # Deals needing attention (oldest updates first)
    stale_count = sum(
        1 for d in open_deals
        if d.updated_at and (now - d.updated_at).days > 7
    )

    return (
        f"Date: {now.strftime('%A, %B %d %Y')} (evening)\n"
        f"Tomorrow: {tomorrow.strftime('%A, %B %d %Y')}\n\n"
        f"--- TODAY RECAP ---\n"
        f"{done_section}\n"
        f"{today_section}\n\n"
        f"--- TOMORROW PREVIEW ---\n"
        f"{tomorrow_cal}\n"
        f"{tomorrow_tasks}\n\n"
        f"--- ATTENTION NEEDED ---\n"
        f"{overdue_section}\n"
        f"{followup_section}\n"
        f"Open deals: {len(open_deals)} ({stale_count} stale >7 days)"
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


def _build_cross_deal_context(
    deals: list[CRMDeal],
    contacts_by_id: dict[str, CRMContact],
    companies_by_id: dict[str, CRMCompany],
    now: datetime,
) -> str:
    """Build a rich context string summarising all deals for LLM analysis."""
    won = [d for d in deals if d.status == "won"]
    lost = [d for d in deals if d.status == "lost"]
    open_deals = [d for d in deals if d.status == "open"]

    total_value = sum(d.value or 0 for d in deals)
    won_value = sum(d.value or 0 for d in won)
    lost_value = sum(d.value or 0 for d in lost)
    win_rate = (len(won) / (len(won) + len(lost)) * 100) if (won or lost) else 0.0

    # Cycle time for closed deals
    cycle_days: list[int] = []
    for d in won:
        if d.actual_close_date and d.created_at:
            delta = (d.actual_close_date - d.created_at.date() if hasattr(d.created_at, "date") else d.actual_close_date - d.created_at)
            days = delta.days if hasattr(delta, "days") else 0
            if days > 0:
                cycle_days.append(days)
    avg_cycle = sum(cycle_days) / len(cycle_days) if cycle_days else 0

    # Stage distribution
    stage_counts: dict[str, int] = {}
    for d in deals:
        stage_counts[d.stage] = stage_counts.get(d.stage, 0) + 1

    # Industry distribution
    industry_stats: dict[str, dict[str, int]] = {}
    for d in deals:
        company = companies_by_id.get(d.company_id or "") if d.company_id else None
        industry = (company.industry if company and company.industry else "Unknown")
        bucket = industry_stats.setdefault(industry, {"total": 0, "won": 0, "lost": 0})
        bucket["total"] += 1
        if d.status == "won":
            bucket["won"] += 1
        elif d.status == "lost":
            bucket["lost"] += 1

    # Source distribution
    source_stats: dict[str, dict[str, int]] = {}
    for d in deals:
        contact = contacts_by_id.get(d.contact_id or "") if d.contact_id else None
        source = (contact.source if contact and contact.source else "Unknown")
        bucket = source_stats.setdefault(source, {"total": 0, "won": 0, "lost": 0})
        bucket["total"] += 1
        if d.status == "won":
            bucket["won"] += 1
        elif d.status == "lost":
            bucket["lost"] += 1

    # Loss reasons
    loss_reasons: dict[str, int] = {}
    for d in lost:
        reason = d.loss_reason or "Not specified"
        loss_reasons[reason] = loss_reasons.get(reason, 0) + 1

    # Individual deal lines (top 30 for token budget)
    deal_lines: list[str] = []
    for d in deals[:30]:
        company = companies_by_id.get(d.company_id or "") if d.company_id else None
        contact = contacts_by_id.get(d.contact_id or "") if d.contact_id else None
        parts = [
            f"  {d.title}",
            f"stage={d.stage}",
            f"status={d.status}",
            f"value=${d.value or 0:,.0f}",
        ]
        if company and company.industry:
            parts.append(f"industry={company.industry}")
        if contact and contact.source:
            parts.append(f"source={contact.source}")
        age = (now - d.created_at).days if d.created_at else 0
        parts.append(f"age={age}d")
        deal_lines.append(" | ".join(parts))

    return (
        f"=== PORTFOLIO SUMMARY (last 90 days) ===\n"
        f"Total deals: {len(deals)} (open: {len(open_deals)}, won: {len(won)}, lost: {len(lost)})\n"
        f"Total value: ${total_value:,.0f} (won: ${won_value:,.0f}, lost: ${lost_value:,.0f})\n"
        f"Win rate: {win_rate:.1f}%\n"
        f"Avg cycle (won): {avg_cycle:.0f} days\n\n"
        f"Stage distribution: {json.dumps(stage_counts)}\n"
        f"Industry breakdown: {json.dumps(industry_stats)}\n"
        f"Source breakdown: {json.dumps(source_stats)}\n"
        f"Loss reasons: {json.dumps(loss_reasons)}\n\n"
        f"=== DEAL DETAILS ===\n" + "\n".join(deal_lines)
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
    todays_events: list[CRMCalendarEvent] | None = None,
    tasks_due_today: list[Task] | None = None,
) -> dict[str, Any]:
    todays_events = todays_events or []
    tasks_due_today = tasks_due_today or []

    severity = "warning" if (overdue_tasks or missed_followups) else "info"
    actions: list[str] = []

    if todays_events:
        first = todays_events[0]
        time_str = first.start_at.strftime("%I:%M %p") if first.start_at else "today"
        actions.append(f"Prepare for {len(todays_events)} meeting(s) — first: {first.title} at {time_str}")
    if overdue_tasks:
        actions.append(f"Address {len(overdue_tasks)} overdue task(s)")
    if tasks_due_today:
        actions.append(f"Complete {len(tasks_due_today)} task(s) due today")
    if missed_followups:
        actions.append(f"Follow up with {len(missed_followups)} contact(s)")
    if open_deals:
        actions.append(f"Review your {len(open_deals)} open deal(s)")
    if not actions:
        actions = ["Review your pipeline and plan today's outreach"]

    # Build description with calendar awareness
    parts = []
    if todays_events:
        parts.append(f"{len(todays_events)} meeting(s)")
    parts.append(f"{len(open_deals)} open deals")
    if overdue_tasks:
        parts.append(f"{len(overdue_tasks)} overdue tasks")
    if tasks_due_today:
        parts.append(f"{len(tasks_due_today)} tasks due today")
    if missed_followups:
        parts.append(f"{len(missed_followups)} missed follow-ups")

    return {
        "title": f"Daily Brief — {now.strftime('%b %d')}",
        "description": f"Today: {', '.join(parts)}.",
        "ai_reasoning": "Summary generated from your current CRM state, calendar, and task list.",
        "suggested_actions": actions,
        "severity": severity,
        "highlight": todays_events[0].title if todays_events else (
            overdue_tasks[0].title if overdue_tasks else None
        ),
    }


def _fallback_evening_brief(
    completed_tasks: list[Task],
    tasks_due_tomorrow: list[Task],
    overdue_tasks: list[Task],
    tomorrow_events: list[CRMCalendarEvent],
    today_events: list[CRMCalendarEvent],
    open_deals: list[CRMDeal],
    pending_followups: list[CRMContact],
    now: datetime,
) -> dict[str, Any]:
    severity = "warning" if (overdue_tasks or len(pending_followups) > 3) else "info"
    actions: list[str] = []

    if tomorrow_events:
        first = tomorrow_events[0]
        time_str = first.start_at.strftime("%I:%M %p") if first.start_at else "morning"
        actions.append(f"Prep for {len(tomorrow_events)} meeting(s) — first: {first.title} at {time_str}")
    if overdue_tasks:
        actions.append(f"Clear {len(overdue_tasks)} overdue task(s) first thing tomorrow")
    if tasks_due_tomorrow:
        actions.append(f"Complete {len(tasks_due_tomorrow)} task(s) due tomorrow")
    if pending_followups:
        actions.append(f"Follow up with {len(pending_followups)} contact(s)")
    stale_deals = [d for d in open_deals if d.updated_at and (now - d.updated_at).days > 7]
    if stale_deals:
        actions.append(f"Review {len(stale_deals)} stale deal(s)")
    if not actions:
        actions = ["Review your pipeline and plan tomorrow's outreach"]

    # Description
    parts = []
    if completed_tasks:
        parts.append(f"{len(completed_tasks)} task(s) completed today")
    if today_events:
        parts.append(f"{len(today_events)} meeting(s) attended")
    if tomorrow_events:
        parts.append(f"{len(tomorrow_events)} meeting(s) tomorrow")
    if tasks_due_tomorrow:
        parts.append(f"{len(tasks_due_tomorrow)} task(s) due tomorrow")
    if overdue_tasks:
        parts.append(f"{len(overdue_tasks)} overdue")

    today_highlights = None
    if completed_tasks:
        today_highlights = f"Completed {len(completed_tasks)} task(s)"
        if today_events:
            today_highlights += f" and attended {len(today_events)} meeting(s)"

    return {
        "title": f"Evening Brief — {now.strftime('%b %d')}",
        "description": f"Today: {', '.join(parts) or 'quiet day'}. Tomorrow: {len(tomorrow_events)} meeting(s), {len(tasks_due_tomorrow)} task(s) due.",
        "ai_reasoning": "Evening summary generated from your CRM state, calendar, and task list.",
        "suggested_actions": actions,
        "severity": severity,
        "today_highlights": today_highlights,
        "tomorrow_focus": tomorrow_events[0].title if tomorrow_events else (
            tasks_due_tomorrow[0].title if tasks_due_tomorrow else (
                overdue_tasks[0].title if overdue_tasks else None
            )
        ),
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


def _empty_cross_deal_result() -> dict[str, Any]:
    """Return a no-data result when there are no deals to analyse."""
    return {
        "id": None,
        "type": "cross_deal_patterns",
        "severity": "info",
        "title": "Cross-Deal Pattern Report",
        "description": "No deals found in the last 90 days to analyse.",
        "ai_reasoning": "",
        "suggested_actions": ["Create your first deal to start tracking patterns"],
        "patterns": [],
        "win_rate": None,
        "avg_cycle_days": None,
        "top_segment": None,
        "is_read": False,
        "is_dismissed": False,
        "is_acted_on": False,
        "created_at": datetime.utcnow().isoformat(),
    }


def _fallback_cross_deal_patterns(
    deals: list[CRMDeal],
    contacts_by_id: dict[str, CRMContact],
    companies_by_id: dict[str, CRMCompany],
    now: datetime,
) -> dict[str, Any]:
    """Rule-based fallback when LLM is unavailable."""
    won = [d for d in deals if d.status == "won"]
    lost = [d for d in deals if d.status == "lost"]
    open_deals = [d for d in deals if d.status == "open"]

    win_rate = (len(won) / (len(won) + len(lost)) * 100) if (won or lost) else 0.0

    # Cycle time for won deals
    cycle_days: list[int] = []
    for d in won:
        if d.actual_close_date and d.created_at:
            delta = (d.actual_close_date - d.created_at.date() if hasattr(d.created_at, "date") else d.actual_close_date - d.created_at)
            days = delta.days if hasattr(delta, "days") else 0
            if days > 0:
                cycle_days.append(days)
    avg_cycle = sum(cycle_days) / len(cycle_days) if cycle_days else 0

    # Find best industry segment
    industry_wins: dict[str, int] = {}
    industry_total: dict[str, int] = {}
    for d in deals:
        company = companies_by_id.get(d.company_id or "") if d.company_id else None
        industry = (company.industry if company and company.industry else "Unknown")
        industry_total[industry] = industry_total.get(industry, 0) + 1
        if d.status == "won":
            industry_wins[industry] = industry_wins.get(industry, 0) + 1

    top_segment = None
    best_rate = 0.0
    for ind, total in industry_total.items():
        if total >= 2 and ind != "Unknown":
            rate = industry_wins.get(ind, 0) / total
            if rate > best_rate:
                best_rate = rate
                top_segment = ind

    # Stage bottleneck: find the stage with the most stale open deals
    stage_stale: dict[str, int] = {}
    for d in open_deals:
        if d.updated_at and (now - d.updated_at).days > 7:
            stage_stale[d.stage] = stage_stale.get(d.stage, 0) + 1
    bottleneck_stage = max(stage_stale, key=stage_stale.get) if stage_stale else None

    patterns: list[dict[str, str]] = []
    if top_segment:
        patterns.append({
            "pattern": f"{top_segment} industry outperforms",
            "detail": f"Win rate of {best_rate * 100:.0f}% in {top_segment} ({industry_total[top_segment]} deals) vs {win_rate:.0f}% overall.",
            "impact": "high",
            "action": f"Prioritise prospecting in {top_segment}",
        })
    if bottleneck_stage:
        patterns.append({
            "pattern": f"Stage bottleneck at '{bottleneck_stage}'",
            "detail": f"{stage_stale[bottleneck_stage]} deal(s) stale >7 days in this stage.",
            "impact": "medium",
            "action": f"Review deals stuck in '{bottleneck_stage}' and unblock or close them",
        })
    if lost:
        patterns.append({
            "pattern": "Loss rate analysis",
            "detail": f"{len(lost)} deal(s) lost in the last 90 days totalling ${sum(d.value or 0 for d in lost):,.0f}.",
            "impact": "medium",
            "action": "Review loss reasons and adjust your pitch or qualifying criteria",
        })

    actions: list[str] = []
    if bottleneck_stage:
        actions.append(f"Address stalled deals in '{bottleneck_stage}'")
    if top_segment:
        actions.append(f"Focus outreach on {top_segment} prospects")
    actions.append("Review loss reasons to improve conversion")

    severity = "warning" if win_rate < 30 else "info"

    return {
        "title": "Cross-Deal Pattern Report",
        "description": f"{len(deals)} deals analysed (last 90 days). Win rate: {win_rate:.0f}%. Avg cycle: {avg_cycle:.0f} days.",
        "ai_reasoning": "Pattern analysis generated from deal history, company data, and stage timing.",
        "patterns": patterns,
        "suggested_actions": actions,
        "severity": severity,
        "win_rate": round(win_rate, 1),
        "avg_cycle_days": round(avg_cycle, 1) if avg_cycle else None,
        "top_segment": top_segment,
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
        # Cross-deal pattern extras
        "patterns": extra.get("patterns"),
        "win_rate": extra.get("win_rate"),
        "avg_cycle_days": extra.get("avg_cycle_days"),
        "top_segment": extra.get("top_segment"),
    }
