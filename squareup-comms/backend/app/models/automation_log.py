"""AutomationLog — audit trail for all autonomous CRM actions."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AutomationLog(SQLModel, table=True):
    __tablename__ = "automation_logs"

    id: str = Field(primary_key=True)
    action_type: str  # "create_contact" | "progress_deal" | "schedule_followup" | "update_field"
    entity_type: str  # "contact" | "deal"
    entity_id: str
    entity_name: str
    confidence: float  # 0.0 – 1.0
    status: str  # "auto_executed" | "pending_review" | "approved" | "rejected"
    performed_by: str  # user_id or "system"
    result: Optional[str] = None  # JSON blob
    review_notes: Optional[str] = None
    ai_reasoning: Optional[str] = None
    source_event: Optional[str] = None  # e.g. "chat.message_analyzed"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
