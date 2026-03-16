"""CRM Email Sequence models — automated email sequences and enrollments."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMEmailSequence(SQLModel, table=True):
    __tablename__ = "crm_email_sequences"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200)
    description: Optional[str] = None
    # JSON array: [{order, delay_days, delay_hours, template_subject, template_body, send_on_reply}]
    steps: str = Field(default="[]")
    status: str = Field(default="active", max_length=20)  # active / paused / archived
    total_enrolled: int = Field(default=0)
    total_completed: int = Field(default=0)
    total_replied: int = Field(default=0)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CRMSequenceEnrollment(SQLModel, table=True):
    __tablename__ = "crm_sequence_enrollments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    sequence_id: str = Field(foreign_key="crm_email_sequences.id", index=True)
    contact_id: str = Field(foreign_key="crm_contacts.id", index=True)
    current_step: int = Field(default=0)
    status: str = Field(default="active", max_length=20)  # active/completed/replied/unenrolled/bounced
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    next_send_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
