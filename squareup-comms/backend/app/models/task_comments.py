"""TaskComment model — comments on tasks by users."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class TaskComment(SQLModel, table=True):
    __tablename__ = "task_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(max_length=128, index=True)
    content: str = Field(max_length=5000)
    mentions: Optional[str] = Field(default="[]")  # JSON array of mention objects
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
