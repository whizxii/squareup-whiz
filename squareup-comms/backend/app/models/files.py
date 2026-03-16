from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class File(SQLModel, table=True):
    __tablename__ = "files"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=500)
    storage_path: str
    mime_type: Optional[str] = Field(default=None, max_length=100)
    size_bytes: Optional[int] = None
    folder: str = Field(default="/", max_length=500)
    thumbnail_url: Optional[str] = None
    channel_id: Optional[str] = Field(default=None, foreign_key="channels.id")
    message_id: Optional[str] = Field(default=None, foreign_key="messages.id")
    contact_id: Optional[str] = Field(default=None, foreign_key="crm_contacts.id")
    agent_id: Optional[str] = Field(default=None, foreign_key="agents.id")
    uploaded_by: Optional[str] = Field(default=None, max_length=128)
    uploaded_by_type: str = Field(default="user", max_length=10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
