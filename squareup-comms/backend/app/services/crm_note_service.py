"""Note service — business logic for CRM notes with audit logging and events."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.models.crm_audit import CRMAuditLog
from app.models.crm_note import CRMNote
from app.repositories.crm_note_repo import NoteRepository
from app.services.base import BaseService


class NoteService(BaseService):
    """Business logic for note operations."""

    @property
    def repo(self) -> NoteRepository:
        return NoteRepository(self.session)

    async def create_note(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMNote:
        """Create a note with audit logging and event emission."""
        now = datetime.utcnow()
        mentions = data.get("mentions") or []

        note = CRMNote(
            contact_id=data["contact_id"],
            deal_id=data.get("deal_id"),
            content=data.get("content"),
            is_pinned=data.get("is_pinned", False),
            mentions=json.dumps(mentions),
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        note = await self.repo.create(note)

        audit = CRMAuditLog(
            entity_type="note",
            entity_id=note.id,
            action="create",
            changes=json.dumps({"contact_id": note.contact_id}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("note.created", {
            "note_id": note.id,
            "contact_id": note.contact_id,
            "user_id": user_id,
        })

        # Embed note in background (async — non-blocking)
        from app.services.embedding_service import embed_crm_note_background
        embed_crm_note_background(note.id)

        return note

    async def update_note(
        self,
        note_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMNote | None:
        """Update a note with ownership check and audit logging."""
        note = await self.repo.get_by_id(note_id)
        if note is None:
            return None

        if note.created_by and note.created_by != user_id:
            raise PermissionError("Only the note creator can update this note.")

        changes: dict[str, dict[str, Any]] = {}
        for field, value in updates.items():
            if field == "mentions":
                old = note.mentions
                new_val = json.dumps(value or [])
                if old != new_val:
                    changes[field] = {"old": old, "new": new_val}
            else:
                old_value = getattr(note, field, None)
                if old_value != value:
                    changes[field] = {"old": str(old_value), "new": str(value)}

        # Apply updates
        for field, value in updates.items():
            if field == "mentions":
                note.mentions = json.dumps(value or [])
            else:
                setattr(note, field, value)

        note.updated_at = datetime.utcnow()
        self.session.add(note)
        await self.session.commit()
        await self.session.refresh(note)

        if changes:
            audit = CRMAuditLog(
                entity_type="note",
                entity_id=note_id,
                action="update",
                changes=json.dumps(changes),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        await self.events.emit("note.updated", {
            "note_id": note_id,
            "contact_id": note.contact_id,
        })
        return note

    async def delete_note(
        self,
        note_id: str,
        user_id: str,
    ) -> bool:
        """Delete a note with ownership check and audit logging."""
        note = await self.repo.get_by_id(note_id)
        if note is None:
            return False

        if note.created_by and note.created_by != user_id:
            raise PermissionError("Only the note creator can delete this note.")

        contact_id = note.contact_id
        await self.session.delete(note)
        await self.session.commit()

        audit = CRMAuditLog(
            entity_type="note",
            entity_id=note_id,
            action="delete",
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("note.deleted", {
            "note_id": note_id,
            "contact_id": contact_id,
        })
        return True

    async def pin_note(
        self,
        note_id: str,
        user_id: str,
        *,
        pinned: bool = True,
    ) -> CRMNote | None:
        """Pin or unpin a note."""
        note = await self.repo.get_by_id(note_id)
        if note is None:
            return None

        if note.created_by and note.created_by != user_id:
            raise PermissionError("Only the note creator can pin/unpin this note.")

        note.is_pinned = pinned
        note.updated_at = datetime.utcnow()
        self.session.add(note)
        await self.session.commit()
        await self.session.refresh(note)

        await self.events.emit("note.updated", {
            "note_id": note_id,
            "contact_id": note.contact_id,
            "pinned": pinned,
        })
        return note

    async def list_for_contact(
        self,
        contact_id: str,
        *,
        limit: int = 50,
    ) -> list[CRMNote]:
        """List notes for a contact (pinned first, then newest)."""
        return await self.repo.list_for_contact(contact_id, limit=limit)
