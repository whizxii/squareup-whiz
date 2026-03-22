"""CRM Notes API — contact note CRUD with pin/unpin."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_note_service
from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.models.crm_note import CRMNote
from app.services.crm_note_service import NoteService

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
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new note on a contact."""
    data = body.model_dump(exclude_unset=False)
    note = await svc.create_note(data, user_id)
    return success_response(NoteResponse.from_model(note))


@router.get("/contacts/{contact_id}/notes")
async def list_contact_notes(
    contact_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """List notes for a contact (pinned first, then newest)."""
    notes = await svc.list_for_contact(contact_id, limit=limit)
    return success_response([NoteResponse.from_model(n).model_dump(mode="json") for n in notes])


@router.get("/notes/{note_id}")
async def get_note(
    note_id: str,
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single note."""
    note = await svc.repo.get_by_id(note_id)
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    return success_response(NoteResponse.from_model(note))


@router.put("/notes/{note_id}")
async def update_note(
    note_id: str,
    body: NoteUpdateBody,
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """Update a note."""
    updates = body.model_dump(exclude_unset=True)
    try:
        note = await svc.update_note(note_id, updates, user_id)
    except PermissionError as exc:
        raise ApiError(status_code=403, detail=str(exc))
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    return success_response(NoteResponse.from_model(note))


@router.delete("/notes/{note_id}", status_code=status.HTTP_200_OK)
async def delete_note(
    note_id: str,
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """Delete a note."""
    try:
        deleted = await svc.delete_note(note_id, user_id)
    except PermissionError as exc:
        raise ApiError(status_code=403, detail=str(exc))
    if not deleted:
        raise ApiError(status_code=404, detail="Note not found")
    return success_response({"deleted": True})


@router.put("/notes/{note_id}/pin")
async def pin_note(
    note_id: str,
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """Pin a note to the top."""
    try:
        note = await svc.pin_note(note_id, user_id, pinned=True)
    except PermissionError as exc:
        raise ApiError(status_code=403, detail=str(exc))
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    return success_response(NoteResponse.from_model(note))


@router.put("/notes/{note_id}/unpin")
async def unpin_note(
    note_id: str,
    svc: NoteService = Depends(get_note_service),
    user_id: str = Depends(get_current_user),
):
    """Unpin a note."""
    try:
        note = await svc.pin_note(note_id, user_id, pinned=False)
    except PermissionError as exc:
        raise ApiError(status_code=403, detail=str(exc))
    if note is None:
        raise ApiError(status_code=404, detail="Note not found")
    return success_response(NoteResponse.from_model(note))
