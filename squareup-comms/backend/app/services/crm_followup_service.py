"""Follow-up service — automated follow-up intelligence for CRM."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from sqlalchemy import select
from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.models.crm_calendar import CRMCalendarEvent
from app.repositories.crm_calendar_repo import CalendarEventRepository
from app.services.base import BaseService

logger = get_logger(__name__)

# Default follow-up delays by trigger
FOLLOW_UP_DELAYS = {
    "deal_stage_change": timedelta(days=1),
    "meeting_completed": timedelta(days=2),
    "email_no_reply": timedelta(days=3),
    "stale_contact": timedelta(days=7),
}

# Terminal deal stages — don't create follow-ups for these
TERMINAL_STAGES = {"closed_won", "closed_lost", "won", "lost"}


class FollowUpService(BaseService):
    """Automated follow-up creation and management.

    Supports two modes:
    - **Request-scoped**: pass a real ``session`` (used by API endpoints via DI).
    - **Event-handler mode**: pass ``session=None`` + ``session_factory`` so
      handlers can create their own sessions per event.
    """

    def __init__(self, *args: Any, session_factory: Callable | None = None, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._session_factory = session_factory

    @property
    def calendar_repo(self) -> CalendarEventRepository:
        return CalendarEventRepository(self.session)

    # ─── Helpers ────────────────────────────────────────────────────

    async def _get_next_follow_up(
        self, contact_id: str, exclude_event_id: str | None = None,
    ) -> CRMCalendarEvent | None:
        """Find the next scheduled follow-up for a contact."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(CRMCalendarEvent)
            .where(
                CRMCalendarEvent.contact_id == contact_id,
                CRMCalendarEvent.event_type == "follow_up",
                CRMCalendarEvent.status == "scheduled",
                CRMCalendarEvent.start_at >= now,
            )
        )
        if exclude_event_id:
            stmt = stmt.where(CRMCalendarEvent.id != exclude_event_id)
        stmt = stmt.order_by(CRMCalendarEvent.start_at.asc()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def _sync_contact_follow_up(
        self,
        contact_id: str,
        follow_up_at: datetime | None = None,
        follow_up_note: str | None = None,
        exclude_event_id: str | None = None,
    ) -> None:
        """Update contact's next_follow_up fields atomically within the current transaction."""
        result = await self.session.execute(
            select(CRMContact).where(CRMContact.id == contact_id)
        )
        contact = result.scalars().first()
        if contact is None:
            return

        if follow_up_at is not None:
            contact.next_follow_up_at = follow_up_at
            contact.follow_up_note = follow_up_note
        else:
            # Find next remaining follow-up
            next_event = await self._get_next_follow_up(contact_id, exclude_event_id)
            if next_event is not None:
                contact.next_follow_up_at = next_event.start_at
                contact.follow_up_note = next_event.title
            else:
                contact.next_follow_up_at = None
                contact.follow_up_note = None

        self.session.add(contact)

    # ─── Auto-create Follow-ups ────────────────────────────────────

    async def create_follow_up(
        self,
        *,
        contact_id: str,
        title: str,
        trigger: str,
        delay: timedelta | None = None,
        deal_id: str | None = None,
        description: str | None = None,
    ) -> CRMCalendarEvent:
        """Create an automated follow-up event in a single atomic transaction."""
        actual_delay = delay or FOLLOW_UP_DELAYS.get(trigger, timedelta(days=2))
        now = datetime.now(timezone.utc)
        follow_up_at = now + actual_delay

        event = CRMCalendarEvent(
            contact_id=contact_id,
            deal_id=deal_id,
            title=title,
            event_type="follow_up",
            description=description or f"Auto-created follow-up: {trigger}",
            start_at=follow_up_at,
            end_at=follow_up_at + timedelta(minutes=30),
            is_all_day=False,
            reminder_minutes=15,
            status="scheduled",
            is_auto_created=True,
            created_by="system",
            created_at=now,
            updated_at=now,
        )

        # Single atomic commit: event + contact update
        self.session.add(event)
        await self._sync_contact_follow_up(contact_id, follow_up_at, title)
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("followup.created", {
            "event_id": event.id,
            "contact_id": contact_id,
            "deal_id": deal_id,
            "trigger": trigger,
            "follow_up_at": follow_up_at.isoformat(),
        })

        logger.info(
            "Follow-up created: %s for contact=%s trigger=%s at=%s",
            event.id, contact_id, trigger, follow_up_at.isoformat(),
        )
        return event

    # ─── Event Handlers (register with EventBus) ──────────────────

    def register_handlers(self) -> None:
        """Register event handlers for auto-creating follow-ups."""
        self.events.on("deal.stage_changed", self._on_deal_stage_changed)
        self.events.on("calendar_event.completed", self._on_meeting_completed)
        logger.info("Follow-up auto-creation handlers registered.")

    async def _on_deal_stage_changed(self, payload: dict[str, Any]) -> None:
        """Create a follow-up when a deal changes stage (skip terminal stages)."""
        contact_id = payload.get("contact_id")
        deal_id = payload.get("deal_id")
        new_stage = payload.get("new_stage", "")

        if not contact_id:
            return

        # Don't create follow-ups for terminal deal stages
        if new_stage.lower() in TERMINAL_STAGES:
            logger.debug("Skipping follow-up for terminal stage: %s", new_stage)
            return

        # Event handlers may run without a request-scoped session.
        # Create a temporary session from the factory when needed.
        if self.session is None and self._session_factory:
            async with self._session_factory() as session:
                self.session = session
                try:
                    await self.create_follow_up(
                        contact_id=contact_id,
                        deal_id=deal_id,
                        title=f"Follow up on deal stage change to {new_stage}",
                        trigger="deal_stage_change",
                    )
                finally:
                    self.session = None
        else:
            await self.create_follow_up(
                contact_id=contact_id,
                deal_id=deal_id,
                title=f"Follow up on deal stage change to {new_stage}",
                trigger="deal_stage_change",
            )

    async def _on_meeting_completed(self, payload: dict[str, Any]) -> None:
        """Create a follow-up after a meeting is completed."""
        contact_id = payload.get("contact_id")
        deal_id = payload.get("deal_id")
        event_id = payload.get("event_id", "")

        if not contact_id:
            return

        if self.session is None and self._session_factory:
            async with self._session_factory() as session:
                self.session = session
                try:
                    await self.create_follow_up(
                        contact_id=contact_id,
                        deal_id=deal_id,
                        title="Follow up after meeting",
                        trigger="meeting_completed",
                        description=f"Follow-up for completed event {event_id}",
                    )
                finally:
                    self.session = None
        else:
            await self.create_follow_up(
                contact_id=contact_id,
                deal_id=deal_id,
                title="Follow up after meeting",
                trigger="meeting_completed",
                description=f"Follow-up for completed event {event_id}",
            )

    # ─── Snooze / Dismiss ─────────────────────────────────────────

    async def snooze_follow_up(
        self,
        event_id: str,
        snooze_until: datetime,
        user_id: str,
    ) -> CRMCalendarEvent | None:
        """Snooze a follow-up to a later time."""
        if snooze_until <= datetime.now(timezone.utc):
            raise ValueError("snooze_until must be in the future")

        event = await self.calendar_repo.get_by_id(event_id)
        if event is None or event.event_type != "follow_up":
            return None

        now = datetime.now(timezone.utc)

        # Apply updates directly, single atomic commit
        event.start_at = snooze_until
        event.end_at = snooze_until + timedelta(minutes=30)
        event.status = "rescheduled"
        event.updated_at = now

        self.session.add(event)
        await self._sync_contact_follow_up(event.contact_id, snooze_until, event.title)
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("followup.snoozed", {
            "event_id": event.id,
            "contact_id": event.contact_id,
            "snooze_until": snooze_until.isoformat(),
        })

        return event

    async def dismiss_follow_up(
        self,
        event_id: str,
        user_id: str,
    ) -> CRMCalendarEvent | None:
        """Dismiss (cancel) a follow-up and update contact to next remaining follow-up."""
        event = await self.calendar_repo.get_by_id(event_id)
        if event is None or event.event_type != "follow_up":
            return None

        now = datetime.now(timezone.utc)

        # Apply cancellation directly, single atomic commit
        event.status = "cancelled"
        event.updated_at = now

        self.session.add(event)
        # Sync to next remaining follow-up (excluding this one)
        await self._sync_contact_follow_up(
            event.contact_id, exclude_event_id=event.id,
        )
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("followup.dismissed", {
            "event_id": event.id,
            "contact_id": event.contact_id,
        })

        return event
