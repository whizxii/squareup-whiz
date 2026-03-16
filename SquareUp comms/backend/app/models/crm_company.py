"""CRM Company model — organizations associated with contacts and deals."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CRMCompany(SQLModel, table=True):
    __tablename__ = "crm_companies"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200, index=True)
    domain: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=100)
    size: Optional[str] = Field(default=None, max_length=20)  # 1-10, 11-50, 51-200, 201-500, 500+
    website: Optional[str] = Field(default=None, max_length=500)
    logo_url: Optional[str] = None
    description: Optional[str] = None
    social_profiles: Optional[str] = Field(default="{}")  # JSON: {linkedin, twitter, crunchbase}
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None
    enrichment_data: Optional[str] = Field(default="{}")  # JSON
    is_archived: bool = Field(default=False)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
