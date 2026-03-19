from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CRMContact(SQLModel, table=True):
    __tablename__ = "crm_contacts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    company_id: Optional[str] = Field(default=None, foreign_key="crm_companies.id", index=True)
    title: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = None
    stage: str = Field(default="lead", max_length=50, index=True)
    stage_changed_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    lifecycle_stage: str = Field(default="lead", max_length=30)  # subscriber/lead/mql/sql/opportunity/customer/evangelist
    value: Optional[float] = None
    currency: str = Field(default="INR", max_length=3)
    source: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[str] = Field(default="[]")  # JSON
    custom_fields: Optional[str] = Field(default="{}")  # JSON
    notes: Optional[str] = None
    owner_id: Optional[str] = Field(default=None, max_length=128, index=True)
    last_contacted_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    activity_count: int = Field(default=0)
    next_follow_up_at: Optional[datetime] = None
    follow_up_note: Optional[str] = None
    lead_score: Optional[int] = Field(default=None, index=True)  # 0-100, denormalized
    relationship_strength: Optional[int] = None  # 1-10, denormalized

    # AI intelligence fields (populated by ChatIntelligenceService)
    ai_summary: Optional[str] = None  # LLM-generated contact summary from chat context
    last_ai_analysis_at: Optional[datetime] = None
    ai_tags: Optional[str] = Field(default="[]")  # JSON array of AI-inferred tags
    sentiment_score: Optional[float] = None  # -1.0 (negative) to 1.0 (positive)

    is_archived: bool = Field(default=False)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_by_type: str = Field(default="user", max_length=10)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


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
    chat_signal_id: Optional[str] = Field(default=None, foreign_key="chat_signals.id")  # Link to originating signal
    chat_context: Optional[str] = None  # JSON: channel_id, message snippet, signal metadata
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
