from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class CRMContact(SQLModel, table=True):
    __tablename__ = "crm_contacts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    title: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = None
    stage: str = Field(default="lead", max_length=50)
    stage_changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    value: Optional[float] = None
    currency: str = Field(default="INR", max_length=3)
    source: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[str] = Field(default="[]")  # JSON
    custom_fields: Optional[str] = Field(default="{}")  # JSON
    notes: Optional[str] = None
    last_contacted_at: Optional[datetime] = None
    next_follow_up_at: Optional[datetime] = None
    follow_up_note: Optional[str] = None
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_by_type: str = Field(default="user", max_length=10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CRMActivity(SQLModel, table=True):
    __tablename__ = "crm_activities"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    contact_id: str = Field(foreign_key="crm_contacts.id")
    type: str = Field(max_length=30)
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    activity_metadata: Optional[str] = Field(default="{}", sa_column_kwargs={"name": "metadata"})  # JSON
    performed_by: Optional[str] = Field(default=None, max_length=128)
    performer_type: Optional[str] = Field(default=None, max_length=10)
    performer_name: Optional[str] = Field(default=None, max_length=100)
    message_id: Optional[str] = Field(default=None, foreign_key="messages.id")
    agent_execution_id: Optional[str] = Field(default=None, foreign_key="agent_executions.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
