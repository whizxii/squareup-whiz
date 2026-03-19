"""Office layout CRUD — save/load furniture, zones, and grid settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from datetime import datetime

from app.core.auth import get_current_user
from app.core.db import get_session
from app.models.office import (
    OfficeLayoutRecord,
    OfficeFurnitureRecord,
    OfficeZoneRecord,
)

router = APIRouter(prefix="/api/office", tags=["office"])

# The workspace is currently single-tenant — use a fixed workspace id.
DEFAULT_WORKSPACE = "default"
DEFAULT_LAYOUT_ID = "default-layout"


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class FurnitureItem(BaseModel):
    id: str
    type: str
    x: int
    y: int
    width: int
    height: int
    rotation: int = 0
    zone_id: str | None = None


class ZoneItem(BaseModel):
    id: str
    name: str
    type: str
    x: int
    y: int
    width: int
    height: int
    color: str = "#4F46E5"
    icon: str = ""
    capacity: int | None = None
    is_private: bool = False


class LayoutSettings(BaseModel):
    floor_style: str = "warm-wood"
    grid_cols: int = 13
    grid_rows: int = 12


class OfficeLayoutPayload(BaseModel):
    layout: LayoutSettings
    furniture: list[FurnitureItem]
    zones: list[ZoneItem]


class OfficeLayoutResponse(BaseModel):
    layout: LayoutSettings
    furniture: list[FurnitureItem]
    zones: list[ZoneItem]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/layout", response_model=OfficeLayoutResponse)
async def get_office_layout(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Load the current office layout (layout + furniture + zones)."""
    layout_record = await session.get(OfficeLayoutRecord, DEFAULT_LAYOUT_ID)

    if layout_record is None:
        # Return empty defaults — frontend will use its own defaults
        return {
            "layout": {"floor_style": "warm-wood", "grid_cols": 13, "grid_rows": 12},
            "furniture": [],
            "zones": [],
        }

    # Fetch furniture
    furn_stmt = select(OfficeFurnitureRecord).where(
        OfficeFurnitureRecord.layout_id == DEFAULT_LAYOUT_ID,
    )
    furn_result = await session.execute(furn_stmt)
    furniture_rows = furn_result.scalars().all()

    # Fetch zones
    zone_stmt = select(OfficeZoneRecord).where(
        OfficeZoneRecord.layout_id == DEFAULT_LAYOUT_ID,
    )
    zone_result = await session.execute(zone_stmt)
    zone_rows = zone_result.scalars().all()

    return {
        "layout": {
            "floor_style": layout_record.floor_style,
            "grid_cols": layout_record.grid_cols,
            "grid_rows": layout_record.grid_rows,
        },
        "furniture": [
            {
                "id": f.id,
                "type": f.furniture_type,
                "x": f.x,
                "y": f.y,
                "width": f.width,
                "height": f.height,
                "rotation": f.rotation,
                "zone_id": f.zone_id,
            }
            for f in furniture_rows
        ],
        "zones": [
            {
                "id": z.id,
                "name": z.name,
                "type": z.zone_type,
                "x": z.x,
                "y": z.y,
                "width": z.width,
                "height": z.height,
                "color": z.color,
                "icon": z.icon,
                "capacity": z.capacity,
                "is_private": z.is_private,
            }
            for z in zone_rows
        ],
    }


@router.put("/layout", response_model=OfficeLayoutResponse)
async def save_office_layout(
    body: OfficeLayoutPayload,
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Save the entire office layout (replaces all furniture and zones)."""
    now = datetime.utcnow()

    # Upsert layout record
    layout_record = await session.get(OfficeLayoutRecord, DEFAULT_LAYOUT_ID)
    if layout_record is None:
        layout_record = OfficeLayoutRecord(
            id=DEFAULT_LAYOUT_ID,
            workspace_id=DEFAULT_WORKSPACE,
            floor_style=body.layout.floor_style,
            grid_cols=body.layout.grid_cols,
            grid_rows=body.layout.grid_rows,
            updated_by=user_id,
            updated_at=now,
            created_at=now,
        )
        session.add(layout_record)
    else:
        layout_record.floor_style = body.layout.floor_style
        layout_record.grid_cols = body.layout.grid_cols
        layout_record.grid_rows = body.layout.grid_rows
        layout_record.updated_by = user_id
        layout_record.updated_at = now
        session.add(layout_record)

    # Delete existing furniture + zones for this layout
    old_furn_stmt = select(OfficeFurnitureRecord).where(
        OfficeFurnitureRecord.layout_id == DEFAULT_LAYOUT_ID,
    )
    old_furn_result = await session.execute(old_furn_stmt)
    for row in old_furn_result.scalars().all():
        await session.delete(row)

    old_zone_stmt = select(OfficeZoneRecord).where(
        OfficeZoneRecord.layout_id == DEFAULT_LAYOUT_ID,
    )
    old_zone_result = await session.execute(old_zone_stmt)
    for row in old_zone_result.scalars().all():
        await session.delete(row)

    # Insert new furniture
    for f in body.furniture:
        session.add(OfficeFurnitureRecord(
            id=f.id,
            layout_id=DEFAULT_LAYOUT_ID,
            furniture_type=f.type,
            x=f.x,
            y=f.y,
            width=f.width,
            height=f.height,
            rotation=f.rotation,
            zone_id=f.zone_id,
        ))

    # Insert new zones
    for z in body.zones:
        session.add(OfficeZoneRecord(
            id=z.id,
            layout_id=DEFAULT_LAYOUT_ID,
            name=z.name,
            zone_type=z.type,
            x=z.x,
            y=z.y,
            width=z.width,
            height=z.height,
            color=z.color,
            icon=z.icon,
            capacity=z.capacity,
            is_private=z.is_private,
        ))

    await session.commit()

    # Return the saved state
    return {
        "layout": {
            "floor_style": body.layout.floor_style,
            "grid_cols": body.layout.grid_cols,
            "grid_rows": body.layout.grid_rows,
        },
        "furniture": [f.model_dump() for f in body.furniture],
        "zones": [z.model_dump() for z in body.zones],
    }
