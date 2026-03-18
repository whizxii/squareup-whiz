"""CRM Email model — email communication records linked to contacts and deals."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMEmail(SQLModel, table=True):
    __tablename__ = "crm_emails"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    contact_id: str = Field(foreign_key="crm_contacts.id", index=True)
    deal_id: Optional[str] = Field(default=None, foreign_key="crm_deals.id", index=True)
    direction: str = Field(max_length=10)  # inbound / outbound
    subject: Optional[str] = Field(default=None, max_length=500)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    from_address: str = Field(max_length=320)
    to_addresses: str = Field(default="[]")  # JSON array of email strings
    cc_addresses: str = Field(default="[]")  # JSON array of email strings
    thread_id: Optional[str] = Field(default=None, max_length=200, index=True)
    external_message_id: Optional[str] = Field(default=None, max_length=500)
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    bounced: bool = Field(default=False)
    status: str = Field(default="draft", max_length=20)  # draft/sent/delivered/opened/clicked/bounced/replied
    sequence_id: Optional[str] = Field(default=None, foreign_key="crm_email_sequences.id", index=True)
    sequence_step: Optional[int] = None
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), index=True)
