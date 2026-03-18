"""CRM Smart List model — dynamic contact segments with criteria-based membership."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class CRMSmartList(SQLModel, table=True):
    __tablename__ = "crm_smart_lists"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200)
    description: Optional[str] = None

    # Criteria: [{field, operator, value, conjunction: "and"|"or"}]
    criteria: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))

    sort_by: Optional[str] = Field(default=None, max_length=100)
    sort_order: str = Field(default="desc", max_length=4)  # asc / desc

    # Visible columns config
    columns: list = Field(
        default_factory=lambda: ["name", "email", "company", "stage"],
        sa_column=Column(JSON, nullable=False),
    )

    is_shared: bool = Field(default=False)
    auto_refresh: bool = Field(default=True)

    # Denormalized count — updated on refresh
    member_count: int = Field(default=0)

    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(), index=True
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.utcnow()
    )
