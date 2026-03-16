"""CRM Tag models — tagging system for contacts."""

from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMTag(SQLModel, table=True):
    __tablename__ = "crm_tags"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=100, index=True)
    color: Optional[str] = Field(default=None, max_length=7)  # hex color e.g. #FF5733
    created_by: Optional[str] = Field(default=None, max_length=128)


class CRMContactTag(SQLModel, table=True):
    """Join table: many-to-many between contacts and tags."""
    __tablename__ = "crm_contact_tags"

    contact_id: str = Field(foreign_key="crm_contacts.id", primary_key=True)
    tag_id: str = Field(foreign_key="crm_tags.id", primary_key=True)
