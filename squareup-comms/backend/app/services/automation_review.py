"""Automation review service — CRUD for pending autonomous actions."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlmodel import select

from app.core.db import async_session
from app.models.automation_log import AutomationLog

logger = logging.getLogger(__name__)


async def get_pending_reviews(user_id: str, limit: int = 50) -> list[AutomationLog]:
    """Return all automation logs pending human review."""
    async with async_session() as session:
        stmt = (
            select(AutomationLog)
            .where(AutomationLog.status == "pending_review")
            .order_by(AutomationLog.created_at.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())


async def get_automation_logs(
    *,
    status: str | None = None,
    entity_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AutomationLog]:
    """List automation logs with optional filters."""
    async with async_session() as session:
        stmt = select(AutomationLog).order_by(AutomationLog.created_at.desc())
        if status:
            stmt = stmt.where(AutomationLog.status == status)
        if entity_type:
            stmt = stmt.where(AutomationLog.entity_type == entity_type)
        stmt = stmt.offset(offset).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())


async def count_pending_reviews() -> int:
    """Count automation logs awaiting review."""
    from sqlmodel import func
    async with async_session() as session:
        stmt = select(func.count()).select_from(AutomationLog).where(
            AutomationLog.status == "pending_review"
        )
        result = await session.execute(stmt)
        return result.scalar_one() or 0


async def approve_review(
    log_id: str, reviewer_id: str, notes: str | None = None
) -> AutomationLog | None:
    """Approve a pending automation action and execute it."""
    async with async_session() as session:
        log = await session.get(AutomationLog, log_id)
        if not log or log.status != "pending_review":
            return None

        log.status = "approved"
        log.reviewed_at = datetime.utcnow()
        log.reviewed_by = reviewer_id
        log.review_notes = notes
        session.add(log)
        await session.commit()
        await session.refresh(log)

    # Execute the action now that it's approved
    await _execute_approved_action(log)
    return log


async def reject_review(
    log_id: str, reviewer_id: str, notes: str | None = None
) -> AutomationLog | None:
    """Reject a pending automation action."""
    async with async_session() as session:
        log = await session.get(AutomationLog, log_id)
        if not log or log.status != "pending_review":
            return None

        log.status = "rejected"
        log.reviewed_at = datetime.utcnow()
        log.reviewed_by = reviewer_id
        log.review_notes = notes
        session.add(log)
        await session.commit()
        await session.refresh(log)

    logger.info("Automation action %s rejected by %s", log_id, reviewer_id)
    return log


async def _execute_approved_action(log: AutomationLog) -> None:
    """Execute a previously pending action that was just approved."""
    import json
    import uuid

    try:
        proposed = json.loads(log.result or "{}").get("proposed", {})
    except (json.JSONDecodeError, TypeError):
        proposed = {}

    try:
        from app.core.db import async_session as db_session
        from app.core.events import EventBus

        async with db_session() as session:
            if log.action_type == "create_contact":
                from app.models.crm import CRMContact
                contact = CRMContact(
                    id=str(uuid.uuid4()),
                    name=proposed.get("name", log.entity_name),
                    email=proposed.get("email"),
                    phone=proposed.get("phone"),
                    company=proposed.get("company"),
                    stage="lead",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(contact)
                await session.commit()
                logger.info("Executed approved contact creation: %s", log.entity_name)

            elif log.action_type == "progress_deal":
                from app.models.crm import CRMDeal
                deal = await session.get(CRMDeal, log.entity_id)
                if deal:
                    new_stage = proposed.get("proposed_stage")
                    if new_stage:
                        deal.stage = new_stage
                        deal.updated_at = datetime.utcnow()
                        session.add(deal)
                        await session.commit()

            elif log.action_type == "schedule_followup":
                from app.models.crm import CRMActivity
                due_at_str = proposed.get("proposed_due_at")
                due_at = datetime.fromisoformat(due_at_str) if due_at_str else datetime.utcnow()
                activity = CRMActivity(
                    id=str(uuid.uuid4()),
                    contact_id=log.entity_id,
                    type="follow_up",
                    title=proposed.get("proposed_title", "Follow-up"),
                    due_at=due_at,
                    performed_by=log.reviewed_by or "system",
                    performer_type="user",
                )
                session.add(activity)
                await session.commit()

    except Exception:
        logger.error("Failed to execute approved action %s", log.id, exc_info=True)
