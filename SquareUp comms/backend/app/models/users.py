from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone
import json


class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"

    firebase_uid: str = Field(primary_key=True, max_length=128)
    display_name: str = Field(max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = None
    avatar_config: Optional[str] = Field(default="{}")  # JSON string
    status: str = Field(default="online", max_length=20)
    status_message: Optional[str] = None
    status_emoji: Optional[str] = Field(default=None, max_length=10)
    office_x: int = Field(default=5)
    office_y: int = Field(default=5)
    notification_prefs: Optional[str] = Field(default='{"mentions": true, "dms": true, "agent_updates": false}')
    theme: str = Field(default="system", max_length=10)
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
