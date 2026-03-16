from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime, timezone
import uuid


class Channel(SQLModel, table=True):
    __tablename__ = "channels"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=100)
    type: str = Field(max_length=20)  # public, private, dm, agent
    description: Optional[str] = None
    icon: Optional[str] = Field(default=None, max_length=10)
    agent_id: Optional[str] = None
    is_default: bool = Field(default=False)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChannelMember(SQLModel, table=True):
    __tablename__ = "channel_members"

    channel_id: str = Field(foreign_key="channels.id", primary_key=True)
    user_id: str = Field(max_length=128, primary_key=True)
    role: str = Field(default="member", max_length=20)
    last_read_message_id: Optional[str] = None
    last_read_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    muted: bool = Field(default=False)
    notification_override: Optional[str] = Field(default=None, max_length=20)
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    channel_id: str = Field(foreign_key="channels.id")
    sender_id: str = Field(max_length=128)
    sender_type: str = Field(max_length=10)  # user, agent
    content: Optional[str] = None
    content_html: Optional[str] = None
    attachments: Optional[str] = Field(default="[]")  # JSON string
    thread_id: Optional[str] = Field(default=None, foreign_key="messages.id")
    reply_count: int = Field(default=0)
    mentions: Optional[str] = Field(default="[]")  # JSON string
    agent_execution_id: Optional[str] = None
    edited: bool = Field(default=False)
    pinned: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class Reaction(SQLModel, table=True):
    __tablename__ = "reactions"

    message_id: str = Field(foreign_key="messages.id", primary_key=True)
    user_id: str = Field(max_length=128, primary_key=True)
    emoji: str = Field(max_length=10, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
