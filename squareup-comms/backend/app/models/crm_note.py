"""CRM Note model — rich-text notes attached to contacts or deals."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMNote(SQLModel, table=True):
    __tablename__ = "crm_notes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    contact_id: str = Field(foreign_key="crm_contacts.id", index=True)
    deal_id: Optional[str] = Field(default=None)  # FK added in Phase 2
    content: Optional[str] = None  # rich text (HTML)
    is_pinned: bool = Field(default=False)
    mentions: Optional[str] = Field(default="[]")  # JSON array of user_ids
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
