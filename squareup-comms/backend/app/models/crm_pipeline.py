"""CRM Pipeline model — custom sales pipelines with configurable stages."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMPipeline(SQLModel, table=True):
    __tablename__ = "crm_pipelines"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200, index=True)
    description: Optional[str] = None
    # JSON array: [{id, label, order, color, probability, sla_days}]
    stages: str = Field(default="[]")
    is_default: bool = Field(default=False)
    is_archived: bool = Field(default=False)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
