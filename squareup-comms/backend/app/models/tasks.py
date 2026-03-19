"""Task model — tasks created by users or agents, assigned to team members."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str = Field(max_length=300)
    description: Optional[str] = None
    assigned_to: str = Field(max_length=128, index=True)  # user firebase_uid
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_by_type: str = Field(default="user", max_length=10)  # "user" | "agent"
    status: str = Field(default="todo", max_length=20, index=True)  # todo/in_progress/done
    priority: str = Field(default="medium", max_length=10)  # low/medium/high/urgent
    due_date: Optional[datetime] = Field(default=None, index=True)
    channel_id: Optional[str] = Field(default=None, foreign_key="channels.id")
    tags: Optional[str] = Field(default="[]")  # JSON array of strings
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
