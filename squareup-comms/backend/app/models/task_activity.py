"""TaskActivity model — audit log of changes on tasks."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class TaskActivity(SQLModel, table=True):
    __tablename__ = "task_activity"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(max_length=128)
    action: str = Field(max_length=30)  # created|updated|assigned|completed|commented|deleted
    field_changed: Optional[str] = Field(default=None, max_length=50)
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    extra_data: Optional[str] = Field(default="{}")  # JSON string for extra context
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
