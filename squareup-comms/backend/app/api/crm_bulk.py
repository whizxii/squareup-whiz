"""CRM Bulk Operations API — bulk stage/tag/owner/archive + import/export."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.api.deps import get_contact_service
from app.services.crm_contact_service import ContactService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-bulk"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class BulkStageBody(BaseModel):
    contact_ids: List[str] = Field(..., min_length=1, max_length=500)
    stage: str = Field(..., max_length=50)


class BulkTagBody(BaseModel):
    contact_ids: List[str] = Field(..., min_length=1, max_length=500)
    tag_id: str


class BulkOwnerBody(BaseModel):
    contact_ids: List[str] = Field(..., min_length=1, max_length=500)
    owner_id: str


class BulkArchiveBody(BaseModel):
    contact_ids: List[str] = Field(..., min_length=1, max_length=500)


class ImportMapping(BaseModel):
    csv_column: str
    crm_field: str
    transform: str = "none"  # none | lowercase | titlecase


class MergeBody(BaseModel):
    primary_id: str
    secondary_id: str


# ---------------------------------------------------------------------------
# Bulk Stage
# ---------------------------------------------------------------------------


@router.put("/bulk/contacts/stage")
async def bulk_update_stage(
    body: BulkStageBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Bulk update stage for multiple contacts."""
    updated = await svc.bulk_update_stage(body.contact_ids, body.stage, user_id)
    return success_response({"updated_count": updated})


# ---------------------------------------------------------------------------
# Bulk Tag
# ---------------------------------------------------------------------------


@router.put("/bulk/contacts/tag")
async def bulk_add_tag(
    body: BulkTagBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Bulk add a tag to multiple contacts."""
    added = await svc.bulk_add_tag(body.contact_ids, body.tag_id, user_id)
    return success_response({"added_count": added})


# ---------------------------------------------------------------------------
# Bulk Owner
# ---------------------------------------------------------------------------


@router.put("/bulk/contacts/owner")
async def bulk_assign_owner(
    body: BulkOwnerBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Bulk assign owner to multiple contacts."""
    updated = await svc.bulk_assign_owner(body.contact_ids, body.owner_id, user_id)
    return success_response({"updated_count": updated})


# ---------------------------------------------------------------------------
# Bulk Archive
# ---------------------------------------------------------------------------


@router.delete("/bulk/contacts")
async def bulk_archive(
    body: BulkArchiveBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Bulk archive multiple contacts."""
    archived = await svc.bulk_archive(body.contact_ids, user_id)
    return success_response({"archived_count": archived})


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

EXPORT_FIELDS = [
    "id", "name", "email", "phone", "company", "title",
    "stage", "lifecycle_stage", "value", "currency", "source",
    "tags", "lead_score", "relationship_strength",
    "activity_count", "owner_id", "created_at", "updated_at",
]


@router.get("/export/contacts")
async def export_contacts(
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    stage: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    owner_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Export contacts as CSV or JSON."""
    page = await svc.repo.search(
        query=search,
        stage=stage,
        source=source,
        owner_id=owner_id,
        is_archived=False,
        limit=200,
    )
    contacts = page.items

    if format == "json":
        rows = []
        for c in contacts:
            row: dict[str, Any] = {}
            for f in EXPORT_FIELDS:
                val = getattr(c, f, None)
                if f == "tags" and val:
                    try:
                        val = json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        val = []
                if isinstance(val, datetime):
                    val = val.isoformat()
                row[f] = val
            rows.append(row)

        content = json.dumps(rows, indent=2, default=str)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=contacts.json"},
        )

    # CSV format
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPORT_FIELDS)
    writer.writeheader()

    for c in contacts:
        row_data: dict[str, Any] = {}
        for f in EXPORT_FIELDS:
            val = getattr(c, f, None)
            if f == "tags" and val:
                try:
                    val = ", ".join(json.loads(val))
                except (json.JSONDecodeError, TypeError):
                    val = ""
            if isinstance(val, datetime):
                val = val.isoformat()
            row_data[f] = val or ""
        writer.writerow(row_data)

    csv_bytes = output.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------


@router.post("/import/contacts")
async def import_contacts(
    file: UploadFile = File(...),
    mappings: str = Form(default="[]"),
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Import contacts from CSV with column mapping."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise ApiError(status_code=400, detail="Only CSV files are supported")

    try:
        field_mappings: list[dict[str, str]] = json.loads(mappings)
    except json.JSONDecodeError:
        raise ApiError(status_code=400, detail="Invalid mappings JSON")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    # Build mapping: csv_column -> crm_field + transform
    col_map: dict[str, dict[str, str]] = {}
    for m in field_mappings:
        col_map[m["csv_column"]] = {
            "field": m["crm_field"],
            "transform": m.get("transform", "none"),
        }

    created = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):
        try:
            data: dict[str, Any] = {}
            for csv_col, value in row.items():
                if not csv_col or not value:
                    continue

                if csv_col in col_map:
                    mapping = col_map[csv_col]
                    field = mapping["field"]
                    transform = mapping["transform"]
                else:
                    # Auto-map: try matching csv_col name to CRM fields
                    field = csv_col.lower().strip().replace(" ", "_")
                    transform = "none"

                # Apply transform
                if transform == "lowercase":
                    value = value.lower()
                elif transform == "titlecase":
                    value = value.title()

                data[field] = value.strip()

            if not data.get("name"):
                skipped += 1
                continue

            # Convert value to float if present
            if "value" in data:
                try:
                    data["value"] = float(data["value"])
                except (ValueError, TypeError):
                    data.pop("value", None)

            # Check for existing contact by email
            existing = None
            if data.get("email"):
                dupes = await svc.find_duplicates(email=data["email"])
                if dupes:
                    existing = dupes[0]

            if existing:
                await svc.update_contact(existing.id, data, user_id)
                updated += 1
            else:
                await svc.create_contact(data, user_id)
                created += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped += 1

    return success_response({
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:50],  # Cap errors to prevent huge response
    })


# ---------------------------------------------------------------------------
# Merge Contacts
# ---------------------------------------------------------------------------


@router.post("/contacts/merge")
async def merge_contacts(
    body: MergeBody,
    svc: ContactService = Depends(get_contact_service),
    user_id: str = Depends(get_current_user),
):
    """Merge secondary contact into primary, consolidating all data."""
    result = await svc.merge_contacts(body.primary_id, body.secondary_id, user_id)
    if result is None:
        raise ApiError(status_code=404, detail="One or both contacts not found")
    return success_response({"merged_contact_id": result.id})
