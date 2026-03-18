"""CRM Call Recording model — recordings linked to contacts, deals, and calendar events."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMCallRecording(SQLModel, table=True):
    __tablename__ = "crm_call_recordings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    contact_id: str = Field(foreign_key="crm_contacts.id", index=True)
    deal_id: Optional[str] = Field(default=None, foreign_key="crm_deals.id", index=True)
    calendar_event_id: Optional[str] = Field(
        default=None, foreign_key="crm_calendar_events.id", index=True
    )
    title: str = Field(max_length=300)
    duration_seconds: int = Field(default=0)
    file_url: str = Field(max_length=2000)
    file_size_bytes: int = Field(default=0)

    # Transcription
    transcript: Optional[str] = None
    transcript_segments: str = Field(default="[]")  # JSON: [{speaker, text, start_ms, end_ms, confidence}]
    transcription_status: str = Field(default="pending", max_length=20, index=True)  # pending/processing/completed/failed
    transcription_error: Optional[str] = None

    # AI analysis (populated after transcription)
    ai_summary: Optional[str] = None
    ai_action_items: str = Field(default="[]")  # JSON: [{text, assignee?, due_date?, is_completed}]
    ai_sentiment: Optional[str] = Field(default=None, max_length=20)  # positive/neutral/negative/mixed
    ai_key_topics: str = Field(default="[]")  # JSON: [{topic, relevance_score}]
    ai_objections: str = Field(default="[]")  # JSON: [{text, context, resolved}]
    ai_next_steps: str = Field(default="[]")  # JSON: [string]

    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
