"""CRM Calendar Event model — calendar events linked to contacts and deals."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMCalendarEvent(SQLModel, table=True):
    __tablename__ = "crm_calendar_events"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    contact_id: str = Field(foreign_key="crm_contacts.id", index=True)
    deal_id: Optional[str] = Field(default=None, foreign_key="crm_deals.id", index=True)
    title: str = Field(max_length=300)
    event_type: str = Field(max_length=30, index=True)  # follow_up/meeting/call/demo/onboarding
    description: Optional[str] = None
    start_at: datetime = Field(index=True)
    end_at: datetime = Field()
    is_all_day: bool = Field(default=False)
    location: Optional[str] = Field(default=None, max_length=500)
    meeting_url: Optional[str] = Field(default=None, max_length=1000)
    external_event_id: Optional[str] = Field(default=None, max_length=500)
    external_calendar_id: Optional[str] = Field(default=None, max_length=500)
    attendees: str = Field(default="[]")  # JSON array of {email, name, response_status}
    reminder_minutes: int = Field(default=15)
    status: str = Field(default="scheduled", max_length=20, index=True)  # scheduled/completed/cancelled/rescheduled
    outcome: Optional[str] = Field(default=None, max_length=20)  # positive/neutral/negative
    outcome_notes: Optional[str] = None
    is_auto_created: bool = Field(default=False)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
