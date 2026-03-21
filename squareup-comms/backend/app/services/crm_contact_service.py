"""Contact service — business logic for CRM contacts."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Sequence

from sqlalchemy import func, select, update as sa_update

from app.models.crm import CRMContact, CRMActivity
from app.models.crm_audit import CRMAuditLog
from app.models.crm_company import CRMCompany
from app.models.crm_deal import CRMDeal
from app.models.crm_pipeline import CRMPipeline
from app.repositories.crm_contact_repo import ContactRepository
from app.services.base import BaseService


class ContactService(BaseService):
    """Business logic for contact operations."""

    @property
    def repo(self) -> ContactRepository:
        return ContactRepository(self.session)

    async def create_contact(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMContact:
        """Create a contact with duplicate check and audit logging."""
        now = datetime.utcnow()

        # Build tags JSON from list
        tags_list = data.pop("tags", [])
        tags_json = json.dumps(tags_list) if tags_list else "[]"

        contact = CRMContact(
            name=data["name"],
            email=data.get("email"),
            phone=data.get("phone"),
            company=data.get("company"),
            company_id=data.get("company_id"),
            title=data.get("title"),
            stage=data.get("stage", "lead"),
            lifecycle_stage=data.get("lifecycle_stage", "lead"),
            stage_changed_at=now,
            value=data.get("value"),
            currency=data.get("currency", "INR"),
            source=data.get("source"),
            tags=tags_json,
            notes=data.get("notes"),
            owner_id=data.get("owner_id") or user_id,
            created_by=user_id,
            created_by_type="user",
            created_at=now,
            updated_at=now,
        )
        contact = await self.repo.create(contact)

        # ── Auto-link or create company ──────────────────────────────
        company_name = (data.get("company") or "").strip() if isinstance(data.get("company"), str) else ""
        if company_name and not contact.company_id:
            result = await self.session.execute(
                select(CRMCompany).where(
                    func.lower(CRMCompany.name) == company_name.lower(),
                    CRMCompany.is_archived == False,  # noqa: E712
                ).limit(1)
            )
            company = result.scalars().first()
            if not company:
                company = CRMCompany(
                    id=str(uuid.uuid4()),
                    name=company_name,
                    created_by=user_id,
                    created_at=now,
                    updated_at=now,
                )
                self.session.add(company)
                await self.session.flush()
            contact.company_id = company.id
            await self.session.flush()

        # ── Auto-create deal for pipeline visibility ─────────────────
        auto_create_deal = data.get("auto_create_deal", True)
        if auto_create_deal:
            pipeline_result = await self.session.execute(
                select(CRMPipeline).where(
                    CRMPipeline.is_default == True,  # noqa: E712
                    CRMPipeline.is_archived == False,  # noqa: E712
                ).limit(1)
            )
            pipeline = pipeline_result.scalars().first()
            if pipeline:
                deal = CRMDeal(
                    id=str(uuid.uuid4()),
                    title=f"Deal — {contact.name}",
                    contact_id=contact.id,
                    company_id=contact.company_id,
                    pipeline_id=pipeline.id,
                    stage=contact.stage or "lead",
                    status="open",
                    owner_id=user_id,
                    created_by=user_id,
                    created_at=now,
                    updated_at=now,
                    stage_entered_at=now,
                )
                self.session.add(deal)

        # Audit log
        audit = CRMAuditLog(
            entity_type="contact",
            entity_id=contact.id,
            action="create",
            changes=json.dumps({"name": contact.name, "email": contact.email}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        # Emit event
        await self.events.emit("contact.created", {
            "contact_id": contact.id,
            "name": contact.name,
            "email": contact.email,
            "company_id": contact.company_id,
        })

        return contact

    async def update_contact(
        self,
        contact_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMContact | None:
        """Update a contact with audit logging and event emission."""
        contact = await self.repo.get_by_id(contact_id)
        if contact is None:
            return None

        now = datetime.utcnow()
        changes: dict[str, dict[str, Any]] = {}

        # Track stage change
        new_stage = updates.get("stage")
        if new_stage and new_stage != contact.stage:
            changes["stage"] = {"old": contact.stage, "new": new_stage}
            updates["stage_changed_at"] = now

        # Convert tags list to JSON
        if "tags" in updates:
            tags_val = updates.pop("tags")
            updates["tags"] = json.dumps(tags_val) if tags_val is not None else "[]"

        # Track all field changes for audit
        for field, value in updates.items():
            old_value = getattr(contact, field, None)
            if old_value != value:
                changes[field] = {"old": str(old_value), "new": str(value)}

        updates["updated_at"] = now
        contact = await self.repo.update(contact, updates)

        # Audit log
        if changes:
            audit = CRMAuditLog(
                entity_type="contact",
                entity_id=contact_id,
                action="stage_change" if "stage" in changes else "update",
                changes=json.dumps(changes),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        # Events
        if "stage" in changes:
            await self.events.emit("contact.stage_changed", {
                "contact_id": contact_id,
                "old_stage": changes["stage"]["old"],
                "new_stage": changes["stage"]["new"],
            })
        else:
            await self.events.emit("contact.updated", {"contact_id": contact_id})

        return contact

    async def archive_contact(self, contact_id: str, user_id: str) -> bool:
        """Soft-delete a contact by setting is_archived=True."""
        contact = await self.repo.get_by_id(contact_id)
        if contact is None:
            return False

        await self.repo.update(contact, {
            "is_archived": True,
            "updated_at": datetime.utcnow(),
        })

        audit = CRMAuditLog(
            entity_type="contact",
            entity_id=contact_id,
            action="delete",
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        return True

    async def restore_contact(self, contact_id: str, user_id: str) -> CRMContact | None:
        """Unarchive a contact."""
        contact = await self.repo.get_by_id(contact_id)
        if contact is None:
            return None

        return await self.repo.update(contact, {
            "is_archived": False,
            "updated_at": datetime.utcnow(),
        })

    async def get_360(self, contact_id: str) -> dict[str, Any] | None:
        """Get full Contact 360 data."""
        return await self.repo.get_360(contact_id)

    async def find_duplicates(
        self, name: str | None = None, email: str | None = None, phone: str | None = None
    ) -> list[CRMContact]:
        """Find potential duplicate contacts."""
        return list(await self.repo.find_duplicates(name=name, email=email, phone=phone))

    async def increment_activity_count(self, contact_id: str) -> None:
        """Increment the denormalized activity_count and update last_activity_at."""
        contact = await self.repo.get_by_id(contact_id)
        if contact is None:
            return
        now = datetime.utcnow()
        await self.repo.update(contact, {
            "activity_count": contact.activity_count + 1,
            "last_activity_at": now,
            "updated_at": now,
        })

    # ─── Bulk Operations ──────────────────────────────────────────────

    async def bulk_update_stage(
        self, contact_ids: list[str], stage: str, user_id: str
    ) -> int:
        """Bulk update stage for multiple contacts. Returns count updated."""
        now = datetime.utcnow()
        stmt = (
            sa_update(CRMContact)
            .where(CRMContact.id.in_(contact_ids))
            .where(CRMContact.is_archived == False)  # noqa: E712
            .values(stage=stage, stage_changed_at=now, updated_at=now)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()

        count = result.rowcount or 0
        if count > 0:
            audit = CRMAuditLog(
                entity_type="contact",
                entity_id=json.dumps(contact_ids[:50]),
                action="bulk_stage_update",
                changes=json.dumps({"stage": stage, "count": count}),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        return count

    async def bulk_add_tag(
        self, contact_ids: list[str], tag_id: str, user_id: str
    ) -> int:
        """Bulk add a tag to multiple contacts. Returns count added."""
        result = await self.session.execute(
            select(CRMContact)
            .where(CRMContact.id.in_(contact_ids))
            .where(CRMContact.is_archived == False)  # noqa: E712
        )
        contacts = list(result.scalars().all())
        now = datetime.utcnow()
        added = 0

        for contact in contacts:
            try:
                tags = json.loads(contact.tags or "[]")
            except (json.JSONDecodeError, TypeError):
                tags = []
            if tag_id not in tags:
                tags.append(tag_id)
                contact.tags = json.dumps(tags)
                contact.updated_at = now
                self.session.add(contact)
                added += 1

        if added > 0:
            await self.session.commit()
            audit = CRMAuditLog(
                entity_type="contact",
                entity_id=json.dumps(contact_ids[:50]),
                action="bulk_tag_add",
                changes=json.dumps({"tag_id": tag_id, "count": added}),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        return added

    async def bulk_assign_owner(
        self, contact_ids: list[str], owner_id: str, user_id: str
    ) -> int:
        """Bulk assign owner to multiple contacts. Returns count updated."""
        now = datetime.utcnow()
        stmt = (
            sa_update(CRMContact)
            .where(CRMContact.id.in_(contact_ids))
            .where(CRMContact.is_archived == False)  # noqa: E712
            .values(owner_id=owner_id, updated_at=now)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()

        count = result.rowcount or 0
        if count > 0:
            audit = CRMAuditLog(
                entity_type="contact",
                entity_id=json.dumps(contact_ids[:50]),
                action="bulk_owner_assign",
                changes=json.dumps({"owner_id": owner_id, "count": count}),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        return count

    async def bulk_archive(
        self, contact_ids: list[str], user_id: str
    ) -> int:
        """Bulk archive multiple contacts. Returns count archived."""
        now = datetime.utcnow()
        stmt = (
            sa_update(CRMContact)
            .where(CRMContact.id.in_(contact_ids))
            .where(CRMContact.is_archived == False)  # noqa: E712
            .values(is_archived=True, updated_at=now)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()

        count = result.rowcount or 0
        if count > 0:
            audit = CRMAuditLog(
                entity_type="contact",
                entity_id=json.dumps(contact_ids[:50]),
                action="bulk_archive",
                changes=json.dumps({"count": count}),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        return count

    # ─── Merge ────────────────────────────────────────────────────────

    async def merge_contacts(
        self, primary_id: str, secondary_id: str, user_id: str
    ) -> CRMContact | None:
        """Merge secondary contact into primary, filling empty fields.

        Strategy: primary wins for all populated fields; secondary fills gaps.
        Activities, emails, and notes from secondary are re-parented.
        Secondary is archived after merge.
        """
        primary = await self.repo.get_by_id(primary_id)
        secondary = await self.repo.get_by_id(secondary_id)
        if primary is None or secondary is None:
            return None

        now = datetime.utcnow()

        # Fill empty fields on primary from secondary
        fill_fields = [
            "email", "phone", "company", "company_id", "title",
            "avatar_url", "source", "notes",
        ]
        merged_changes: dict[str, Any] = {}
        for field in fill_fields:
            primary_val = getattr(primary, field, None)
            secondary_val = getattr(secondary, field, None)
            if not primary_val and secondary_val:
                merged_changes[field] = secondary_val

        # Merge tags (union)
        try:
            p_tags = json.loads(primary.tags or "[]")
        except (json.JSONDecodeError, TypeError):
            p_tags = []
        try:
            s_tags = json.loads(secondary.tags or "[]")
        except (json.JSONDecodeError, TypeError):
            s_tags = []
        all_tags = list(dict.fromkeys(p_tags + s_tags))  # dedupe, preserve order
        merged_changes["tags"] = json.dumps(all_tags)

        # Merge custom fields (secondary fills gaps)
        try:
            p_custom = json.loads(primary.custom_fields or "{}")
        except (json.JSONDecodeError, TypeError):
            p_custom = {}
        try:
            s_custom = json.loads(secondary.custom_fields or "{}")
        except (json.JSONDecodeError, TypeError):
            s_custom = {}
        merged_custom = {**s_custom, **p_custom}  # primary overwrites
        merged_changes["custom_fields"] = json.dumps(merged_custom)

        # Sum activity counts, take higher scores
        merged_changes["activity_count"] = (
            primary.activity_count + secondary.activity_count
        )
        if secondary.value and (not primary.value or secondary.value > primary.value):
            merged_changes["value"] = secondary.value
        if secondary.lead_score and (
            not primary.lead_score or secondary.lead_score > primary.lead_score
        ):
            merged_changes["lead_score"] = secondary.lead_score

        merged_changes["updated_at"] = now

        # Apply changes to primary
        primary = await self.repo.update(primary, merged_changes)

        # Re-parent secondary's activities to primary
        stmt = (
            sa_update(CRMActivity)
            .where(CRMActivity.contact_id == secondary_id)
            .values(contact_id=primary_id)
        )
        await self.session.execute(stmt)

        # Archive secondary
        await self.repo.update(secondary, {
            "is_archived": True,
            "updated_at": now,
        })

        # Audit log
        audit = CRMAuditLog(
            entity_type="contact",
            entity_id=primary_id,
            action="merge",
            changes=json.dumps({
                "secondary_id": secondary_id,
                "fields_merged": list(merged_changes.keys()),
            }),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("contact.merged", {
            "primary_id": primary_id,
            "secondary_id": secondary_id,
        })

        return primary
