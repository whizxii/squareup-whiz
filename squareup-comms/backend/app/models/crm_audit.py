"""CRM Audit Log — tracks all mutations for contacts, deals, and companies."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMAuditLog(SQLModel, table=True):
    __tablename__ = "crm_audit_log"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    entity_type: str = Field(max_length=30, index=True)  # contact, deal, company
    entity_id: str = Field(max_length=36, index=True)
    action: str = Field(max_length=30)  # create, update, delete, stage_change, merge
    changes: Optional[str] = Field(default="{}")  # JSON: {field: {old, new}}
    performed_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
