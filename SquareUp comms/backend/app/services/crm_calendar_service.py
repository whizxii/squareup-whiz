"""Calendar event service — business logic for CRM calendar events."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Sequence

from app.core.logging_config import get_logger
from app.models.crm import CRMActivity
from app.models.crm_audit import CRMAuditLog
from app.models.crm_calendar import CRMCalendarEvent
from app.repositories.crm_calendar_repo import CalendarEventRepository
from app.services.base import BaseService

logger = get_logger(__name__)

# Valid event types and outcomes
VALID_EVENT_TYPES = {"meeting", "follow_up", "call", "demo", "onboarding"}
VALID_OUTCOMES = {"positive", "neutral", "negative"}


class CalendarEventService(BaseService):
    """Business logic for CRM calendar events and follow-ups."""

    @property
    def repo(self) -> CalendarEventRepository:
        return CalendarEventRepository(self.session)

    # ─── Create ────────────────────────────────────────────────────

    async def create_event(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMCalendarEvent:
        """Create a new calendar event with activity and audit in a single transaction."""
        now = datetime.now(timezone.utc)

        attendees_raw = data.get("attendees", [])
        attendees_json = json.dumps(attendees_raw) if isinstance(attendees_raw, list) else attendees_raw

        event = CRMCalendarEvent(
            contact_id=data["contact_id"],
            deal_id=data.get("deal_id"),
            title=data["title"],
            event_type=data.get("event_type", "meeting"),
            description=data.get("description"),
            start_at=data["start_at"],
            end_at=data["end_at"],
            is_all_day=data.get("is_all_day", False),
            location=data.get("location"),
            meeting_url=data.get("meeting_url"),
            external_event_id=data.get("external_event_id"),
            external_calendar_id=data.get("external_calendar_id"),
            attendees=attendees_json,
            reminder_minutes=data.get("reminder_minutes", 15),
            status="scheduled",
            is_auto_created=data.get("is_auto_created", False),
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )

        # Activity log
        activity = CRMActivity(
            contact_id=event.contact_id,
            type="calendar_event",
            title=f"{event.event_type.replace('_', ' ').title()} scheduled: {event.title}",
            activity_metadata=json.dumps({
                "event_type": event.event_type,
            }),
            performed_by=user_id,
            performer_type="user",
        )

        # Audit log
        audit = CRMAuditLog(
            entity_type="calendar_event",
            entity_id=event.id,
            action="create",
            changes=json.dumps({"title": event.title, "event_type": event.event_type}),
            performed_by=user_id,
        )

        # Single atomic commit
        self.session.add(event)
        self.session.add(activity)
        self.session.add(audit)
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("calendar_event.created", {
            "event_id": event.id,
            "contact_id": event.contact_id,
            "deal_id": event.deal_id,
            "event_type": event.event_type,
            "start_at": event.start_at.isoformat(),
        })

        logger.info("Calendar event created: %s (%s)", event.id, event.event_type)
        return event

    # ─── Update ────────────────────────────────────────────────────

    async def update_event(
        self,
        event_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMCalendarEvent | None:
        """Update a calendar event with audit in a single transaction."""
        event = await self.repo.get_by_id(event_id)
        if event is None:
            return None

        # Serialize attendees if provided as list
        if "attendees" in updates and isinstance(updates["attendees"], list):
            updates["attendees"] = json.dumps(updates["attendees"])

        updates["updated_at"] = datetime.now(timezone.utc)

        # Filter to valid fields only
        valid_fields = {
            "title", "event_type", "description", "start_at", "end_at",
            "is_all_day", "location", "meeting_url", "attendees",
            "reminder_minutes", "status",
            "external_event_id", "external_calendar_id", "updated_at",
        }
        filtered = {k: v for k, v in updates.items() if k in valid_fields}

        # Apply updates and audit in single transaction
        for key, value in filtered.items():
            if hasattr(event, key):
                setattr(event, key, value)

        audit = CRMAuditLog(
            entity_type="calendar_event",
            entity_id=event.id,
            action="update",
            changes=json.dumps({k: str(v) for k, v in filtered.items()}),
            performed_by=user_id,
        )

        self.session.add(event)
        self.session.add(audit)
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("calendar_event.updated", {
            "event_id": event.id,
            "contact_id": event.contact_id,
        })

        return event

    # ─── Complete ──────────────────────────────────────────────────

    async def complete_event(
        self,
        event_id: str,
        outcome: str,
        outcome_notes: str | None,
        user_id: str,
    ) -> CRMCalendarEvent | None:
        """Mark a calendar event as completed with outcome in a single transaction."""
        if outcome not in VALID_OUTCOMES:
            raise ValueError(f"Invalid outcome: {outcome}. Must be one of {VALID_OUTCOMES}")

        event = await self.repo.get_by_id(event_id)
        if event is None:
            return None

        now = datetime.now(timezone.utc)

        # Apply updates directly
        event.status = "completed"
        event.outcome = outcome
        event.outcome_notes = outcome_notes
        event.updated_at = now

        # Log completion activity
        activity = CRMActivity(
            contact_id=event.contact_id,
            type="calendar_event",
            title=f"{event.event_type.replace('_', ' ').title()} completed: {event.title}",
            content=f"Outcome: {outcome}" + (f" — {outcome_notes}" if outcome_notes else ""),
            activity_metadata=json.dumps({
                "event_id": event.id,
                "outcome": outcome,
            }),
            performed_by=user_id,
            performer_type="user",
        )

        audit = CRMAuditLog(
            entity_type="calendar_event",
            entity_id=event.id,
            action="complete",
            changes=json.dumps({"status": "completed", "outcome": outcome}),
            performed_by=user_id,
        )

        # Single atomic commit
        self.session.add(event)
        self.session.add(activity)
        self.session.add(audit)
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("calendar_event.completed", {
            "event_id": event.id,
            "contact_id": event.contact_id,
            "deal_id": event.deal_id,
            "outcome": outcome,
        })

        logger.info("Calendar event completed: %s outcome=%s", event.id, outcome)
        return event

    # ─── Cancel ────────────────────────────────────────────────────

    async def cancel_event(
        self,
        event_id: str,
        user_id: str,
    ) -> CRMCalendarEvent | None:
        """Cancel a calendar event with audit in a single transaction."""
        event = await self.repo.get_by_id(event_id)
        if event is None:
            return None

        now = datetime.now(timezone.utc)
        event.status = "cancelled"
        event.updated_at = now

        audit = CRMAuditLog(
            entity_type="calendar_event",
            entity_id=event.id,
            action="cancel",
            changes=json.dumps({"status": "cancelled"}),
            performed_by=user_id,
        )

        self.session.add(event)
        self.session.add(audit)
        await self.session.commit()
        await self.session.refresh(event)

        await self.events.emit("calendar_event.cancelled", {
            "event_id": event.id,
            "contact_id": event.contact_id,
        })

        return event

    # ─── Read ──────────────────────────────────────────────────────

    async def get_event(self, event_id: str) -> CRMCalendarEvent | None:
        """Get a single event by ID."""
        return await self.repo.get_by_id(event_id)

    async def get_upcoming(self, limit: int = 20) -> Sequence[CRMCalendarEvent]:
        """Get upcoming scheduled events."""
        return await self.repo.get_upcoming(limit=limit)

    async def get_overdue_follow_ups(self, limit: int = 50) -> Sequence[CRMCalendarEvent]:
        """Get overdue follow-up events."""
        return await self.repo.get_overdue_follow_ups(limit=limit)

    async def get_for_contact(
        self,
        contact_id: str,
        limit: int = 50,
    ) -> Sequence[CRMCalendarEvent]:
        """Get all events for a contact."""
        return await self.repo.get_for_contact(contact_id, limit=limit)
