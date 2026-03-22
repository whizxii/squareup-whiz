"""Proactive nudges — Donna-powered personal alerts for stale deals,
overdue tasks, and meeting preparation.

Unlike ``proactive_insights`` (raw WebSocket data), nudges are
conversational Donna messages posted in channels so users see them
in context alongside their normal chat flow.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlmodel import select, col

from app.core.db import async_session
from app.models.agents import Agent
from app.models.chat import Channel
from app.models.crm import CRMContact
from app.models.crm_calendar import CRMCalendarEvent
from app.models.crm_deal import CRMDeal
from app.models.tasks import Task
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_STALE_DEAL_DAYS = 7  # Nudge deal owners after 7 days with no update
_OVERDUE_TASK_HOURS = 24  # Nudge assignees after 24 h overdue
_MEETING_PREP_MINUTES = 15  # Post meeting prep 15 min before start
_NUDGE_COOLDOWN_HOURS = 24  # Don't nudge about the same entity more than once per day

# ---------------------------------------------------------------------------
# In-memory dedup caches (entity_id → last nudge timestamp)
# ---------------------------------------------------------------------------

_nudged_deals: dict[str, datetime] = {}
_nudged_tasks: dict[str, datetime] = {}
_nudged_meetings: set[str] = set()  # event IDs already prepped today


# ---------------------------------------------------------------------------
# Public entry point — called from scheduler
# ---------------------------------------------------------------------------

async def run_proactive_nudges() -> None:
    """Detect and send Donna-powered proactive nudges.

    Designed to be called every scheduler tick (60 s). Each detector
    function has built-in deduplication via the module-level caches.
    """
    donna, default_channel = await _load_donna_and_channel()
    if not donna or not default_channel:
        return  # Can't nudge without Donna or a channel

    tasks: list[asyncio.Task[None]] = []

    stale_nudges = await _detect_stale_deal_nudges()
    for nudge in stale_nudges:
        tasks.append(asyncio.create_task(
            _send_donna_nudge(donna.id, default_channel.id, nudge),
        ))

    overdue_nudges = await _detect_overdue_task_nudges()
    for nudge in overdue_nudges:
        tasks.append(asyncio.create_task(
            _send_donna_nudge(donna.id, default_channel.id, nudge),
        ))

    meeting_preps = await _detect_meeting_prep_nudges()
    for nudge in meeting_preps:
        tasks.append(asyncio.create_task(
            _send_donna_nudge(donna.id, default_channel.id, nudge),
        ))

    if tasks:
        logger.info("Dispatching %d proactive nudges via Donna", len(tasks))
        await asyncio.gather(*tasks, return_exceptions=True)

    _prune_dedup_cache()


# ---------------------------------------------------------------------------
# Detectors
# ---------------------------------------------------------------------------

async def _detect_stale_deal_nudges() -> list[str]:
    """Return nudge prompts for deals untouched for _STALE_DEAL_DAYS+."""
    now = datetime.utcnow()
    cutoff = now - timedelta(days=_STALE_DEAL_DAYS)

    async with async_session() as session:
        stmt = (
            select(CRMDeal)
            .where(
                CRMDeal.status == "open",
                CRMDeal.updated_at < cutoff,
            )
            .order_by(col(CRMDeal.updated_at).asc())
            .limit(10)
        )
        result = await session.execute(stmt)
        deals = list(result.scalars().all())

    prompts: list[str] = []
    for deal in deals:
        if _is_recently_nudged(_nudged_deals, deal.id, now):
            continue
        _nudged_deals[deal.id] = now

        days_stale = (now - deal.updated_at).days
        value_str = f" (${deal.value:,.0f})" if deal.value else ""
        prompts.append(
            f"Proactive nudge: The deal '{deal.title}'{value_str} has been stuck "
            f"in the '{deal.stage}' stage for {days_stale} days with no updates. "
            f"Owner: user {deal.owner_id or 'unassigned'}. "
            f"Post a short, friendly message alerting the team that this deal needs attention. "
            f"Offer to draft a follow-up email or suggest a next step."
        )

    return prompts


async def _detect_overdue_task_nudges() -> list[str]:
    """Return nudge prompts for tasks overdue by _OVERDUE_TASK_HOURS+."""
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=_OVERDUE_TASK_HOURS)

    async with async_session() as session:
        stmt = (
            select(Task)
            .where(
                Task.status.in_(["todo", "in_progress"]),
                Task.due_date.isnot(None),  # type: ignore[union-attr]
                Task.due_date < cutoff,
            )
            .order_by(col(Task.due_date).asc())
            .limit(10)
        )
        result = await session.execute(stmt)
        tasks = list(result.scalars().all())

    prompts: list[str] = []
    for task in tasks:
        if _is_recently_nudged(_nudged_tasks, task.id, now):
            continue
        _nudged_tasks[task.id] = now

        hours_overdue = int((now - task.due_date).total_seconds() / 3600)
        prompts.append(
            f"Proactive nudge: The task '{task.title}' ({task.priority} priority) "
            f"assigned to user {task.assigned_to} was due {hours_overdue} hours ago "
            f"and is still {task.status}. "
            f"Post a short, helpful message asking if the assignee needs help or "
            f"if the task should be rescheduled. Offer to reschedule it."
        )

    return prompts


async def _detect_meeting_prep_nudges() -> list[str]:
    """Return meeting prep prompts for events starting in ~15 minutes."""
    now = datetime.utcnow()
    window_start = now + timedelta(minutes=10)
    window_end = now + timedelta(minutes=20)

    async with async_session() as session:
        stmt = (
            select(CRMCalendarEvent)
            .where(
                CRMCalendarEvent.start_at >= window_start,
                CRMCalendarEvent.start_at <= window_end,
                CRMCalendarEvent.status != "cancelled",
            )
            .order_by(CRMCalendarEvent.start_at.asc())
            .limit(10)
        )
        result = await session.execute(stmt)
        events = list(result.scalars().all())

    prompts: list[str] = []
    for event in events:
        if event.id in _nudged_meetings:
            continue
        _nudged_meetings.add(event.id)

        # Emit WebSocket notification for frontend toast
        minutes_until = int((event.start_at - now).total_seconds() / 60)
        await hub_manager.broadcast_all({
            "type": "crm.meeting_prep",
            "title": event.title,
            "minutes_until": minutes_until,
            "contact_id": event.contact_id,
        })

        time_str = event.start_at.strftime("%I:%M %p")
        contact_note = ""

        # Load CRM contact context if available
        if event.contact_id:
            contact = await _load_contact_context(event.contact_id)
            if contact:
                contact_note = (
                    f"The meeting is with {contact['name']} "
                    f"({contact.get('company', 'unknown company')}). "
                    f"Their lifecycle stage is '{contact.get('stage', 'unknown')}'. "
                )
                if contact.get("deal_value"):
                    contact_note += f"Open deal value: ${contact['deal_value']:,.0f}. "
                if contact.get("last_contacted_days"):
                    contact_note += f"Last contacted {contact['last_contacted_days']} days ago. "

        location_str = f" Location: {event.location}." if event.location else ""
        meeting_url_str = f" Meeting link: {event.meeting_url}." if event.meeting_url else ""

        prompts.append(
            f"Meeting prep: '{event.title}' starts at {time_str} UTC "
            f"(about 15 minutes from now).{location_str}{meeting_url_str} "
            f"{contact_note}"
            f"Post a concise meeting prep for the team: who they're meeting, "
            f"key context from CRM, and 1-2 talking points to keep in mind."
        )

    return prompts


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _load_donna_and_channel() -> tuple[Agent | None, Channel | None]:
    """Load the @donna agent and default channel from DB."""
    async with async_session() as session:
        donna_result = await session.execute(
            select(Agent).where(Agent.name == "@donna", Agent.active == True)  # noqa: E712
        )
        donna = donna_result.scalars().first()

        channel_result = await session.execute(
            select(Channel).where(Channel.is_default == True)  # noqa: E712
        )
        channel = channel_result.scalars().first()

    if not donna:
        logger.debug("Donna agent not found — skipping proactive nudges")
    if not channel:
        logger.debug("No default channel — skipping proactive nudges")

    return donna, channel


async def _load_contact_context(contact_id: str) -> dict[str, Any] | None:
    """Load CRM contact info for meeting prep context."""
    async with async_session() as session:
        result = await session.execute(
            select(CRMContact).where(CRMContact.id == contact_id)
        )
        contact = result.scalars().first()
        if not contact:
            return None

        # Check for open deals with this contact
        deal_result = await session.execute(
            select(CRMDeal).where(
                CRMDeal.contact_id == contact_id,
                CRMDeal.status == "open",
            ).limit(1)
        )
        deal = deal_result.scalars().first()

    now = datetime.utcnow()
    last_contacted_days = None
    if contact.last_contacted_at:
        last_contacted_days = (now - contact.last_contacted_at).days

    return {
        "name": contact.name,
        "company": contact.company,
        "stage": contact.lifecycle_stage,
        "email": contact.email,
        "deal_value": deal.value if deal else None,
        "last_contacted_days": last_contacted_days,
    }


async def _send_donna_nudge(
    donna_id: str,
    channel_id: str,
    prompt: str,
) -> None:
    """Invoke Donna in a channel with the given nudge prompt."""
    from app.services.agent_engine import run_agent

    try:
        await run_agent(
            agent_id=donna_id,
            trigger_message_id="",
            channel_id=channel_id,
            user_id="system",
            content=prompt,
        )
    except Exception:
        logger.error("Donna nudge failed: %s", prompt[:80], exc_info=True)


def _is_recently_nudged(
    cache: dict[str, datetime],
    entity_id: str,
    now: datetime,
) -> bool:
    """Check whether this entity was already nudged within the cooldown window."""
    last_nudge = cache.get(entity_id)
    if last_nudge is None:
        return False
    return (now - last_nudge) < timedelta(hours=_NUDGE_COOLDOWN_HOURS)


def _prune_dedup_cache() -> None:
    """Remove stale entries from dedup caches to prevent memory growth."""
    now = datetime.utcnow()
    max_age = timedelta(hours=_NUDGE_COOLDOWN_HOURS * 2)

    for cache in (_nudged_deals, _nudged_tasks):
        stale_keys = [k for k, v in cache.items() if (now - v) > max_age]
        for key in stale_keys:
            del cache[key]

    # Clear meeting dedup daily (meetings are unique per day anyway)
    if now.hour == 0 and now.minute < 2:
        _nudged_meetings.clear()
