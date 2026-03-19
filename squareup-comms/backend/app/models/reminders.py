"""Reminder model — time-based notifications for users, optionally created by agents."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class Reminder(SQLModel, table=True):
    __tablename__ = "reminders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(max_length=128, index=True)  # user firebase_uid
    created_by_agent: Optional[str] = Field(default=None, foreign_key="agents.id")
    message: str
    remind_at: datetime = Field(index=True)
    channel_id: Optional[str] = Field(default=None, foreign_key="channels.id")
    recurrence: Optional[str] = Field(default=None, max_length=100)  # cron expression
    status: str = Field(default="pending", max_length=20, index=True)  # pending/fired/cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
