"""CRM Notes API — contact note CRUD with pin/unpin."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.crm_note import CRMNote

router = APIRouter(prefix="/api/crm/v2", tags=["crm-notes"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NoteCreateBody(BaseModel):
    contact_id: str
    deal_id: Optional[str] = None
    content: str
    is_pinned: bool = False
    mentions: Optional[list[str]] = Field(default_factory=list)


class NoteUpdateBody(BaseModel):
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    mentions: Optional[list[str]] = None


class NoteResponse(BaseModel):
    id: str
    contact_id: str
    deal_id: Optional[str] = None
    content: Optional[str] = None
    is_pinned: bool = False
    mentions: list[str] = []
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, note: CRMNote) -> "NoteResponse":
        import json
        mentions_list: list[str] = []
        if note.mentions:
            try:
                mentions_list = json.loads(note.mentions)
            except (json.JSONDecodeError, TypeError):
                mentions_list = []
        return cls(
            id=note.id,
            contact_id=note.contact_id,
            deal_id=note.deal_id,
            content=note.content,
            is_pinned=note.is_pinned,
            mentions=mentions_list,
            created_by=note.created_by,
            created_at=note.created_at,
            updated_at=note.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/notes", status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Create a new note on a contact."""
    import json

    now = datetime.now(timezone.utc)
    note = CRMNote(
        contact_id=body.contact_id,
        deal_id=body.deal_id,
        content=body.content,
        is_pinned=body.is_pinned,
        mentions=json.dumps(body.mentions or []),
        created_by=user_id,
        created_at=now,
        updated_at=now,
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return success_response(NoteResponse.from_model(note))


@router.get("/contacts/{contact_id}/notes")
async def list_contact_notes(
    contact_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List notes for a contact (pinned first, then newest)."""
    stmt = (
        select(CRMNote)
        .where(CRMNote.contact_id == contact_id)
        .order_by(CRMNote.is_pinned.desc(), CRMNote.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    notes = list(result.scalars().all())
    return success_response([NoteResponse.from_model(n).model_dump(mode="json") for n in notes])


@router.get("/notes/{note_id}")
async def get_note(
    note_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Get a single note."""
    note = await session.get(CRMNote, note_id)
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    return success_response(NoteResponse.from_model(note))


@router.put("/notes/{note_id}")
async def update_note(
    note_id: str,
    body: NoteUpdateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Update a note."""
    import json

    note = await session.get(CRMNote, note_id)
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "mentions":
            note.mentions = json.dumps(value or [])
        else:
            setattr(note, field, value)

    note.updated_at = datetime.now(timezone.utc)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return success_response(NoteResponse.from_model(note))


@router.delete("/notes/{note_id}", status_code=status.HTTP_200_OK)
async def delete_note(
    note_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Delete a note."""
    note = await session.get(CRMNote, note_id)
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    await session.delete(note)
    await session.commit()
    return success_response({"deleted": True})


@router.put("/notes/{note_id}/pin")
async def pin_note(
    note_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Pin a note to the top."""
    note = await session.get(CRMNote, note_id)
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    note.is_pinned = True
    note.updated_at = datetime.now(timezone.utc)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return success_response(NoteResponse.from_model(note))


@router.put("/notes/{note_id}/unpin")
async def unpin_note(
    note_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Unpin a note."""
    note = await session.get(CRMNote, note_id)
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    note.is_pinned = False
    note.updated_at = datetime.now(timezone.utc)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return success_response(NoteResponse.from_model(note))
