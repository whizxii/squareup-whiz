"""AIInsight model — persisted AI-generated insights for proactive intelligence.

Stores deal coaching, daily briefs, relationship alerts, and pipeline risk signals.
Each insight includes the LLM's reasoning and suggested actions.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AIInsight(SQLModel, table=True):
    __tablename__ = "ai_insights"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    # Classification
    type: str = Field(max_length=50, index=True)
    # Types: deal_coaching, daily_brief, pipeline_risk, relationship_alert, enriched_proactive
    severity: str = Field(max_length=20, index=True)
    # Values: info | warning | critical

    # Content
    title: str = Field(max_length=255)
    description: str = Field(default="")
    ai_reasoning: str = Field(default="")        # LLM's chain-of-thought
    suggested_actions: str = Field(default="[]")  # JSON array of action strings

    # Target audience
    target_user_id: Optional[str] = Field(default=None, max_length=128, index=True)

    # Linked CRM entity
    entity_type: Optional[str] = Field(default=None, max_length=30)
    entity_id: Optional[str] = Field(default=None, max_length=128, index=True)
    entity_name: Optional[str] = Field(default=None, max_length=255)

    # State
    is_read: bool = Field(default=False, index=True)
    is_dismissed: bool = Field(default=False, index=True)
    is_acted_on: bool = Field(default=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(), index=True
    )
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
