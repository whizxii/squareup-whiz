"""Activity Auto-Capture service — listens to events and auto-creates CRM activities.

Zero manual logging for emails, calendar events, recordings, and other tracked interactions.
Registers handlers on the EventBus so activities are captured system-wide.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import EventBus
from app.core.logging_config import get_logger
from app.models.crm import CRMActivity, CRMContact

logger = get_logger(__name__)


class ActivityCaptureService:
    """Registers event bus handlers that auto-create CRMActivity records."""

    def __init__(self, event_bus: EventBus, session_factory) -> None:
        self._event_bus = event_bus
        self._session_factory = session_factory

    def register_handlers(self) -> None:
        """Register all auto-capture event handlers."""
        self._event_bus.on("email.sent", self._on_email_sent)
        self._event_bus.on("email.received", self._on_email_received)
        self._event_bus.on("email.opened", self._on_email_opened)
        self._event_bus.on("calendar.event_completed", self._on_calendar_event_completed)
        self._event_bus.on("recording.transcribed", self._on_recording_transcribed)
        self._event_bus.on("sequence.contact_enrolled", self._on_sequence_enrolled)
        self._event_bus.on("sequence.enrollment_completed", self._on_sequence_completed)
        logger.info("Activity auto-capture handlers registered")

    async def _update_contact_activity(self, session: AsyncSession, contact_id: str) -> None:
        """Update the contact's last_activity_at and activity_count."""
        from sqlalchemy import select, func

        result = await session.execute(
            select(CRMContact).where(CRMContact.id == contact_id)
        )
        contact = result.scalars().first()
        if contact is None:
            return

        now = datetime.now(timezone.utc)
        contact.last_activity_at = now
        contact.activity_count = contact.activity_count + 1
        contact.updated_at = now
        session.add(contact)

    async def _on_email_sent(self, payload: dict) -> None:
        """Auto-capture: outbound email sent."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="email_sent",
                    title=f"Email sent: {payload.get('subject', '(no subject)')}",
                    performed_by="system",
                    performer_type="system",
                )
                session.add(activity)
                await self._update_contact_activity(session, contact_id)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture email_sent activity")

    async def _on_email_received(self, payload: dict) -> None:
        """Auto-capture: inbound email received."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="email_received",
                    title=f"Email received (thread {payload.get('thread_id', 'unknown')})",
                    performed_by="system",
                    performer_type="system",
                )
                session.add(activity)
                await self._update_contact_activity(session, contact_id)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture email_received activity")

    async def _on_email_opened(self, payload: dict) -> None:
        """Auto-capture: email opened by contact."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="email_opened",
                    title="Email opened",
                    performed_by="system",
                    performer_type="system",
                )
                session.add(activity)
                await self._update_contact_activity(session, contact_id)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture email_opened activity")

    async def _on_calendar_event_completed(self, payload: dict) -> None:
        """Auto-capture: calendar event completed."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="meeting",
                    title=f"Meeting completed: {payload.get('title', 'Untitled')}",
                    content=f"Outcome: {payload.get('outcome', 'unknown')}",
                    performed_by=payload.get("user_id", "system"),
                    performer_type="user",
                )
                session.add(activity)
                await self._update_contact_activity(session, contact_id)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture calendar event activity")

    async def _on_recording_transcribed(self, payload: dict) -> None:
        """Auto-capture: call recording transcribed."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="recording",
                    title=f"Call transcribed: {payload.get('title', 'Recording')}",
                    content=payload.get("summary", ""),
                    performed_by="system",
                    performer_type="system",
                )
                session.add(activity)
                await self._update_contact_activity(session, contact_id)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture recording transcribed activity")

    async def _on_sequence_enrolled(self, payload: dict) -> None:
        """Auto-capture: contact enrolled in email sequence."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="workflow_triggered",
                    title="Enrolled in email sequence",
                    performed_by="system",
                    performer_type="system",
                )
                session.add(activity)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture sequence enrollment activity")

    async def _on_sequence_completed(self, payload: dict) -> None:
        """Auto-capture: sequence completed for contact."""
        contact_id = payload.get("contact_id")
        if not contact_id:
            return

        try:
            async with self._session_factory() as session:
                activity = CRMActivity(
                    contact_id=contact_id,
                    type="workflow_triggered",
                    title="Email sequence completed",
                    performed_by="system",
                    performer_type="system",
                )
                session.add(activity)
                await session.commit()
        except Exception:
            logger.exception("Failed to auto-capture sequence completed activity")
