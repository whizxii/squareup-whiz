"""CRM Deal model — revenue opportunities linked to contacts and pipelines."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMDeal(SQLModel, table=True):
    __tablename__ = "crm_deals"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str = Field(max_length=300)
    contact_id: str = Field(foreign_key="crm_contacts.id", index=True)
    company_id: Optional[str] = Field(default=None, foreign_key="crm_companies.id", index=True)
    pipeline_id: str = Field(foreign_key="crm_pipelines.id", index=True)
    stage: str = Field(max_length=100, index=True)
    value: Optional[float] = None
    currency: str = Field(default="INR", max_length=3)
    probability: int = Field(default=0)  # 0-100, auto-set from pipeline stage
    expected_close_date: Optional[datetime] = None
    actual_close_date: Optional[datetime] = None
    status: str = Field(default="open", max_length=10)  # open / won / lost
    loss_reason: Optional[str] = Field(default=None, max_length=100)
    loss_reason_detail: Optional[str] = None
    owner_id: Optional[str] = Field(default=None, max_length=128, index=True)
    stage_entered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deal_health: str = Field(default="green", max_length=10)  # green / yellow / red
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
