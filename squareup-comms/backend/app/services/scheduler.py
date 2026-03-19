"""Background scheduler — fires due reminders and runs scheduled agents."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from croniter import croniter
from sqlmodel import select

from app.core.db import async_session
from app.models.agents import Agent
from app.models.reminders import Reminder
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)

_POLL_INTERVAL_SECONDS = 60

_INSIGHTS_INTERVAL_TICKS = 5  # Run proactive insights every 5 ticks (5 min)
_DAILY_BRIEF_HOUR = 8          # Generate daily briefs at 08:00 UTC
_WEEKLY_DIGEST_HOUR = 8        # Generate weekly digests at 08:00 UTC on Mondays
_WEEKLY_DIGEST_WEEKDAY = 0     # Monday (0=Monday … 6=Sunday)


async def scheduler_loop() -> None:
    """Run forever, polling every 60 seconds for due work."""
    from app.services.proactive_insights import run_proactive_insights

    logger.info("Scheduler started (poll interval %ds)", _POLL_INTERVAL_SECONDS)
    tick_count = 0
    _last_brief_date: datetime | None = None
    _last_weekly_digest_date: datetime | None = None

    while True:
        try:
            await _fire_due_reminders()
        except Exception:
            logger.error("Reminder tick failed", exc_info=True)

        try:
            await _execute_scheduled_agents()
        except Exception:
            logger.error("Scheduled agents tick failed", exc_info=True)

        # Run proactive insights every N ticks to avoid excessive DB queries
        tick_count += 1
        if tick_count % _INSIGHTS_INTERVAL_TICKS == 0:
            try:
                await run_proactive_insights()
            except Exception:
                logger.error("Proactive insights tick failed", exc_info=True)

        now = datetime.utcnow()

        # Generate daily briefs once per day at _DAILY_BRIEF_HOUR UTC
        if now.hour >= _DAILY_BRIEF_HOUR:
            today = now.date()
            if _last_brief_date != today:
                _last_brief_date = today
                try:
                    await _generate_daily_briefs()
                except Exception:
                    logger.error("Daily brief generation failed", exc_info=True)

        # Generate weekly digest once per week on Monday at _WEEKLY_DIGEST_HOUR UTC
        if now.weekday() == _WEEKLY_DIGEST_WEEKDAY and now.hour >= _WEEKLY_DIGEST_HOUR:
            this_week = now.date()
            if _last_weekly_digest_date != this_week:
                _last_weekly_digest_date = this_week
                try:
                    await _generate_weekly_digests()
                except Exception:
                    logger.error("Weekly digest generation failed", exc_info=True)

        await asyncio.sleep(_POLL_INTERVAL_SECONDS)


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

async def _fire_due_reminders() -> None:
    """Find reminders where remind_at <= now and status == 'pending', fire them."""
    now = datetime.utcnow()

    async with async_session() as session:
        stmt = (
            select(Reminder)
            .where(Reminder.status == "pending", Reminder.remind_at <= now)
            .limit(100)
        )
        result = await session.execute(stmt)
        reminders = list(result.scalars().all())

        if not reminders:
            return

        logger.info("Firing %d due reminders", len(reminders))

        for reminder in reminders:
            # Broadcast notification via WebSocket
            await hub_manager.send_to_user(reminder.user_id, {
                "type": "reminder.fire",
                "reminder_id": reminder.id,
                "message": reminder.message,
                "channel_id": reminder.channel_id,
            })

            # Handle recurring reminders
            if reminder.recurrence:
                try:
                    cron = croniter(reminder.recurrence, now)
                    next_fire = cron.get_next(datetime)
                    reminder.remind_at = next_fire
                    # Keep status as pending for next occurrence
                except (ValueError, KeyError):
                    logger.warning(
                        "Invalid recurrence cron '%s' for reminder %s",
                        reminder.recurrence, reminder.id,
                    )
                    reminder.status = "fired"
            else:
                reminder.status = "fired"

            session.add(reminder)

        await session.commit()
        logger.info("Processed %d reminders", len(reminders))


# ---------------------------------------------------------------------------
# Scheduled Agents
# ---------------------------------------------------------------------------

async def _execute_scheduled_agents() -> None:
    """Find agents with trigger_mode='scheduled' and a valid cron that are due."""
    now = datetime.utcnow()

    async with async_session() as session:
        stmt = select(Agent).where(
            Agent.trigger_mode == "scheduled",
            Agent.active == True,  # noqa: E712
            Agent.schedule_cron.isnot(None),  # type: ignore[union-attr]
        )
        result = await session.execute(stmt)
        agents = list(result.scalars().all())

    if not agents:
        return

    for agent in agents:
        if not agent.schedule_cron:
            continue

        try:
            if not croniter.is_valid(agent.schedule_cron):
                logger.warning(
                    "Agent %s has invalid cron: '%s'", agent.id, agent.schedule_cron,
                )
                continue
        except Exception:
            continue

        # Determine if this agent is due to run
        if not _is_due(agent.schedule_cron, agent.last_scheduled_run, now):
            continue

        logger.info(
            "Triggering scheduled agent %s (%s) — cron: %s",
            agent.id, agent.name, agent.schedule_cron,
        )

        # Update last_scheduled_run before spawning to prevent double-fire
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.last_scheduled_run = now
                session.add(db_agent)
                await session.commit()

        # Build a contextual prompt based on the time
        prompt = _build_scheduled_prompt(now)

        # Spawn agent execution in background
        asyncio.create_task(
            _run_scheduled_agent(agent.id, prompt),
        )


def _is_due(
    cron_expr: str,
    last_run: datetime | None,
    now: datetime,
) -> bool:
    """Check if a cron expression is due to fire.

    Compares the most recent scheduled time to last_run.
    If there's no last_run, the agent has never been run — it's due.
    """
    try:
        cron = croniter(cron_expr, now)
        # Get the most recent past occurrence
        prev_fire = cron.get_prev(datetime)

        if last_run is None:
            # Never run before — it's due
            return True

        # Due if the previous fire time is after the last run
        return prev_fire > last_run
    except (ValueError, KeyError):
        return False


def _build_scheduled_prompt(now: datetime) -> str:
    """Build a contextual prompt for a scheduled agent run."""
    time_str = now.strftime("%A, %B %d %Y at %I:%M %p UTC")
    return (
        f"This is your scheduled run. Current time: {time_str}. "
        f"Please execute your routine tasks as configured in your system prompt."
    )


async def _run_scheduled_agent(agent_id: str, prompt: str) -> None:
    """Run a scheduled agent with a generated prompt."""
    from app.services.agent_engine import run_agent

    try:
        # Use a synthetic channel and user for scheduled runs
        await run_agent(
            agent_id=agent_id,
            trigger_message_id="",
            channel_id="",
            user_id="system",
            content=prompt,
        )
    except Exception:
        logger.error("Scheduled agent %s execution failed", agent_id, exc_info=True)


# ---------------------------------------------------------------------------
# Daily Briefs
# ---------------------------------------------------------------------------

async def _generate_daily_briefs() -> None:
    """Generate a daily brief for every active user. Run once per day."""
    from sqlmodel import select as sql_select

    from app.core.background import BackgroundTaskManager
    from app.core.db import async_session
    from app.core.events import EventBus
    from app.models.users import User
    from app.services.ai.insights_engine import AIInsightsEngine
    from app.websocket.manager import hub_manager

    async with async_session() as session:
        result = await session.execute(sql_select(User).where(User.is_active == True))  # noqa: E712
        users = list(result.scalars().all())

    if not users:
        return

    logger.info("Generating daily briefs for %d user(s)", len(users))

    for user in users:
        try:
            async with async_session() as session:
                engine = AIInsightsEngine(
                    session=session,
                    events=EventBus(),
                    background=BackgroundTaskManager(),
                )
                brief = await engine.generate_daily_brief(user.id)

            # Push brief to user via WebSocket
            await hub_manager.send_to_user(user.id, {
                "type": "insights.daily_brief",
                "brief": brief,
            })
            logger.debug("Daily brief sent to user %s", user.id)
        except Exception:
            logger.error("Failed to generate daily brief for user %s", user.id, exc_info=True)


# ---------------------------------------------------------------------------
# Weekly Digests
# ---------------------------------------------------------------------------

async def _generate_weekly_digests() -> None:
    """Generate a weekly digest (team-wide) and push it to all active users via WebSocket."""
    from sqlmodel import select as sql_select

    from app.core.background import BackgroundTaskManager
    from app.core.db import async_session
    from app.core.events import EventBus
    from app.models.users import User
    from app.services.ai.digest_service import DigestService
    from app.websocket.manager import hub_manager

    async with async_session() as session:
        result = await session.execute(sql_select(User).where(User.is_active == True))  # noqa: E712
        users = list(result.scalars().all())

    if not users:
        return

    logger.info("Generating weekly digest for %d user(s)", len(users))

    # Generate one team-wide digest (no target_user_id)
    digest = None
    try:
        async with async_session() as session:
            svc = DigestService(
                session=session,
                events=EventBus(),
                background=BackgroundTaskManager(),
            )
            digest = await svc.generate_weekly_digest(target_user_id=None)
    except Exception:
        logger.error("Weekly digest generation failed", exc_info=True)
        return

    if digest is None:
        return

    import json

    payload = {
        "type": "insights.weekly_digest",
        "digest": {
            "id": digest.id,
            "title": digest.title,
            "summary": digest.summary,
            "highlights": json.loads(digest.highlights or "[]"),
            "stats": json.loads(digest.stats or "{}"),
            "week_start": digest.week_start.isoformat() if digest.week_start else None,
            "week_end": digest.week_end.isoformat() if digest.week_end else None,
            "created_at": digest.created_at.isoformat(),
        },
    }

    for user in users:
        try:
            await hub_manager.send_to_user(user.id, payload)
            logger.debug("Weekly digest sent to user %s", user.id)
        except Exception:
            logger.error("Failed to send weekly digest to user %s", user.id, exc_info=True)
