"""Office layout models — zones, furniture, and layout persistence."""

from __future__ import annotations

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class OfficeLayoutRecord(SQLModel, table=True):
    """Workspace-level office layout metadata."""

    __tablename__ = "office_layouts"

    id: str = Field(primary_key=True, max_length=64)
    workspace_id: str = Field(max_length=128, index=True)
    floor_style: str = Field(default="warm-wood", max_length=30)
    grid_cols: int = Field(default=13)
    grid_rows: int = Field(default=12)
    updated_by: Optional[str] = Field(default=None, max_length=128)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class OfficeFurnitureRecord(SQLModel, table=True):
    """Individual furniture piece placed in the office."""

    __tablename__ = "office_furniture"

    id: str = Field(primary_key=True, max_length=64)
    layout_id: str = Field(max_length=64, index=True)
    furniture_type: str = Field(max_length=30)
    x: int = Field(default=0)
    y: int = Field(default=0)
    width: int = Field(default=1)
    height: int = Field(default=1)
    rotation: int = Field(default=0)
    zone_id: Optional[str] = Field(default=None, max_length=64)


class OfficeZoneRecord(SQLModel, table=True):
    """Rectangular zone in the office (desk, meeting, lounge, etc.)."""

    __tablename__ = "office_zones"

    id: str = Field(primary_key=True, max_length=64)
    layout_id: str = Field(max_length=64, index=True)
    name: str = Field(max_length=100)
    zone_type: str = Field(max_length=30)
    x: int = Field(default=0)
    y: int = Field(default=0)
    width: int = Field(default=1)
    height: int = Field(default=1)
    color: str = Field(default="#4F46E5", max_length=20)
    icon: str = Field(default="", max_length=10)
    capacity: Optional[int] = Field(default=None)
    is_private: bool = Field(default=False)
