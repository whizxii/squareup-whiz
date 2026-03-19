"""Digest — weekly/daily AI-generated team recaps."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Digest(SQLModel, table=True):
    __tablename__ = "digests"

    id: str = Field(primary_key=True)
    digest_type: str  # "weekly" | "daily"
    target_user_id: Optional[str] = None  # None = team-wide
    title: str
    summary: str  # LLM-generated narrative
    highlights: Optional[str] = None  # JSON array of highlight strings
    stats: Optional[str] = None  # JSON blob with numeric stats
    week_start: Optional[datetime] = None  # For weekly digests
    week_end: Optional[datetime] = None
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
