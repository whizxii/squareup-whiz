from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(max_length=128)
    type: str = Field(max_length=30)
    tier: str = Field(default="normal", max_length=10)
    title: str
    body: Optional[str] = None
    channel_id: Optional[str] = Field(default=None, foreign_key="channels.id")
    message_id: Optional[str] = Field(default=None, foreign_key="messages.id")
    agent_id: Optional[str] = Field(default=None, foreign_key="agents.id")
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id")
    read: bool = Field(default=False)
    pushed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
