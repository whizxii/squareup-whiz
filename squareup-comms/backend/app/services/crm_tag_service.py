"""Tag service — business logic for CRM tags with audit logging and events."""

from __future__ import annotations

import json
from typing import Any

from app.models.crm_audit import CRMAuditLog
from app.models.crm_tag import CRMContactTag, CRMTag
from app.repositories.crm_tag_repo import TagRepository
from app.services.base import BaseService


class TagService(BaseService):
    """Business logic for tag operations."""

    @property
    def repo(self) -> TagRepository:
        return TagRepository(self.session)

    async def create_tag(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMTag:
        """Create a tag with audit logging and event emission."""
        tag = CRMTag(
            name=data["name"],
            color=data.get("color"),
            created_by=user_id,
        )
        tag = await self.repo.create(tag)

        audit = CRMAuditLog(
            entity_type="tag",
            entity_id=tag.id,
            action="create",
            changes=json.dumps({"name": tag.name}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("tag.created", {
            "tag_id": tag.id,
            "name": tag.name,
            "user_id": user_id,
        })
        return tag

    async def update_tag(
        self,
        tag_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMTag | None:
        """Update a tag with audit logging."""
        tag = await self.repo.get_by_id(tag_id)
        if tag is None:
            return None

        changes: dict[str, dict[str, Any]] = {}
        for field, value in updates.items():
            old_value = getattr(tag, field, None)
            if old_value != value:
                changes[field] = {"old": str(old_value), "new": str(value)}

        for field, value in updates.items():
            setattr(tag, field, value)

        self.session.add(tag)
        await self.session.commit()
        await self.session.refresh(tag)

        if changes:
            audit = CRMAuditLog(
                entity_type="tag",
                entity_id=tag_id,
                action="update",
                changes=json.dumps(changes),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        await self.events.emit("tag.updated", {
            "tag_id": tag_id,
            "changes": list(changes.keys()),
        })
        return tag

    async def delete_tag(
        self,
        tag_id: str,
        user_id: str,
    ) -> bool:
        """Delete a tag and all its associations with audit logging."""
        tag = await self.repo.get_by_id(tag_id)
        if tag is None:
            return False

        tag_name = tag.name
        await self.repo.delete_all_associations(tag_id)
        await self.session.delete(tag)
        await self.session.commit()

        audit = CRMAuditLog(
            entity_type="tag",
            entity_id=tag_id,
            action="delete",
            changes=json.dumps({"name": tag_name}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("tag.deleted", {
            "tag_id": tag_id,
            "name": tag_name,
        })
        return True

    async def list_all(self) -> list[CRMTag]:
        """List all tags sorted by name."""
        return await self.repo.list_all_sorted()

    async def add_tag_to_contact(
        self,
        contact_id: str,
        tag_id: str,
        user_id: str,
    ) -> dict[str, bool]:
        """Link a tag to a contact."""
        tag = await self.repo.get_by_id(tag_id)
        if tag is None:
            return {"found": False}

        existing = await self.repo.find_contact_tag_link(contact_id, tag_id)
        if existing:
            return {"found": True, "linked": True, "already_existed": True}

        link = CRMContactTag(contact_id=contact_id, tag_id=tag_id)
        self.session.add(link)
        await self.session.commit()

        await self.events.emit("contact.tag_added", {
            "contact_id": contact_id,
            "tag_id": tag_id,
            "tag_name": tag.name,
        })
        return {"found": True, "linked": True, "already_existed": False}

    async def remove_tag_from_contact(
        self,
        contact_id: str,
        tag_id: str,
    ) -> bool:
        """Unlink a tag from a contact. Returns False if not found."""
        link = await self.repo.find_contact_tag_link(contact_id, tag_id)
        if link is None:
            return False

        await self.session.delete(link)
        await self.session.commit()

        await self.events.emit("contact.tag_removed", {
            "contact_id": contact_id,
            "tag_id": tag_id,
        })
        return True

    async def get_contact_tags(self, contact_id: str) -> list[CRMTag]:
        """Get all tags for a contact."""
        return await self.repo.get_contact_tags(contact_id)
