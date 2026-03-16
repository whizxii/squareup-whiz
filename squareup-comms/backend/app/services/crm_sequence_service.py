"""Sequence service — business logic for email sequences and enrollment engine."""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Sequence

from app.models.crm_audit import CRMAuditLog
from app.models.crm_sequence import CRMEmailSequence, CRMSequenceEnrollment
from app.repositories.crm_sequence_repo import EnrollmentRepository, SequenceRepository
from app.services.base import BaseService
from app.services.crm_email_service import EmailService


class SequenceService(BaseService):
    """Business logic for email sequences and the enrollment engine."""

    @property
    def repo(self) -> SequenceRepository:
        return SequenceRepository(self.session)

    @property
    def enrollment_repo(self) -> EnrollmentRepository:
        return EnrollmentRepository(self.session)

    # ─── Sequence CRUD ────────────────────────────────────────────

    async def create_sequence(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMEmailSequence:
        """Create a new email sequence."""
        now = datetime.now(timezone.utc)

        sequence = CRMEmailSequence(
            name=data["name"],
            description=data.get("description"),
            steps=json.dumps(data.get("steps", [])),
            status=data.get("status", "active"),
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        sequence = await self.repo.create(sequence)

        audit = CRMAuditLog(
            entity_type="sequence",
            entity_id=sequence.id,
            action="create",
            changes=json.dumps({"name": sequence.name}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("sequence.created", {
            "sequence_id": sequence.id,
            "name": sequence.name,
        })

        return sequence

    async def update_sequence(
        self,
        sequence_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMEmailSequence | None:
        """Update a sequence (name, steps, status)."""
        sequence = await self.repo.get_by_id(sequence_id)
        if sequence is None:
            return None

        now = datetime.now(timezone.utc)
        changes: dict[str, dict[str, Any]] = {}

        if "steps" in updates:
            updates["steps"] = json.dumps(updates["steps"])
            changes["steps"] = {"old": "(redacted)", "new": "(updated)"}

        for field in ("name", "description", "status"):
            if field in updates:
                old = getattr(sequence, field, None)
                if old != updates[field]:
                    changes[field] = {"old": str(old), "new": str(updates[field])}

        updates["updated_at"] = now
        sequence = await self.repo.update(sequence, updates)

        if changes:
            audit = CRMAuditLog(
                entity_type="sequence",
                entity_id=sequence_id,
                action="update",
                changes=json.dumps(changes),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        await self.events.emit("sequence.updated", {"sequence_id": sequence_id})
        return sequence

    async def get_sequence(self, sequence_id: str) -> CRMEmailSequence | None:
        """Get a sequence by ID."""
        return await self.repo.get_by_id(sequence_id)

    async def pause_sequence(self, sequence_id: str, user_id: str) -> CRMEmailSequence | None:
        """Pause an active sequence."""
        return await self.update_sequence(sequence_id, {"status": "paused"}, user_id)

    async def activate_sequence(self, sequence_id: str, user_id: str) -> CRMEmailSequence | None:
        """Activate a paused sequence."""
        return await self.update_sequence(sequence_id, {"status": "active"}, user_id)

    # ─── Enrollment Engine ────────────────────────────────────────

    async def enroll_contact(
        self,
        sequence_id: str,
        contact_id: str,
        user_id: str,
    ) -> CRMSequenceEnrollment | None:
        """Enroll a contact in a sequence. Returns None if sequence not found."""
        sequence = await self.repo.get_by_id(sequence_id)
        if sequence is None or sequence.status != "active":
            return None

        # Check if already enrolled
        existing = await self.enrollment_repo.get_active_for_contact(sequence_id, contact_id)
        if existing is not None:
            return existing  # Already enrolled — return existing

        steps = json.loads(sequence.steps)
        first_step = steps[0] if steps else None
        delay_hours = 0
        if first_step:
            delay_hours = first_step.get("delay_days", 0) * 24 + first_step.get("delay_hours", 0)

        now = datetime.now(timezone.utc)
        next_send = now + timedelta(hours=delay_hours) if delay_hours > 0 else now

        enrollment = CRMSequenceEnrollment(
            sequence_id=sequence_id,
            contact_id=contact_id,
            current_step=0,
            status="active",
            enrolled_at=now,
            next_send_at=next_send,
            created_at=now,
        )
        enrollment = await self.enrollment_repo.create(enrollment)

        # Increment total_enrolled counter
        await self.repo.update(sequence, {
            "total_enrolled": sequence.total_enrolled + 1,
            "updated_at": now,
        })

        await self.events.emit("sequence.contact_enrolled", {
            "sequence_id": sequence_id,
            "contact_id": contact_id,
            "enrollment_id": enrollment.id,
        })

        return enrollment

    async def unenroll_contact(
        self,
        enrollment_id: str,
        user_id: str,
    ) -> CRMSequenceEnrollment | None:
        """Unenroll a contact from a sequence."""
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        if enrollment is None:
            return None

        now = datetime.now(timezone.utc)
        enrollment = await self.enrollment_repo.update(enrollment, {
            "status": "unenrolled",
            "next_send_at": None,
        })

        await self.events.emit("sequence.contact_unenrolled", {
            "sequence_id": enrollment.sequence_id,
            "contact_id": enrollment.contact_id,
        })

        return enrollment

    async def advance_enrollment(
        self,
        enrollment_id: str,
    ) -> CRMSequenceEnrollment | None:
        """Advance an enrollment to the next step (called after sending a step email)."""
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        if enrollment is None or enrollment.status != "active":
            return None

        sequence = await self.repo.get_by_id(enrollment.sequence_id)
        if sequence is None:
            return None

        steps = json.loads(sequence.steps)
        next_step_index = enrollment.current_step + 1

        now = datetime.now(timezone.utc)

        if next_step_index >= len(steps):
            # Sequence completed
            enrollment = await self.enrollment_repo.update(enrollment, {
                "status": "completed",
                "completed_at": now,
                "next_send_at": None,
                "current_step": next_step_index,
            })
            await self.repo.update(sequence, {
                "total_completed": sequence.total_completed + 1,
                "updated_at": now,
            })
            await self.events.emit("sequence.enrollment_completed", {
                "enrollment_id": enrollment_id,
                "sequence_id": sequence.id,
                "contact_id": enrollment.contact_id,
            })
        else:
            # Move to next step
            next_step = steps[next_step_index]
            delay_hours = next_step.get("delay_days", 0) * 24 + next_step.get("delay_hours", 0)
            next_send = now + timedelta(hours=delay_hours)

            enrollment = await self.enrollment_repo.update(enrollment, {
                "current_step": next_step_index,
                "next_send_at": next_send,
            })

        return enrollment

    async def mark_replied(
        self,
        enrollment_id: str,
    ) -> CRMSequenceEnrollment | None:
        """Mark enrollment as replied (stops the sequence for this contact)."""
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        if enrollment is None:
            return None

        now = datetime.now(timezone.utc)
        enrollment = await self.enrollment_repo.update(enrollment, {
            "status": "replied",
            "next_send_at": None,
        })

        sequence = await self.repo.get_by_id(enrollment.sequence_id)
        if sequence:
            await self.repo.update(sequence, {
                "total_replied": sequence.total_replied + 1,
                "updated_at": now,
            })

        await self.events.emit("sequence.contact_replied", {
            "enrollment_id": enrollment_id,
            "sequence_id": enrollment.sequence_id,
            "contact_id": enrollment.contact_id,
        })

        return enrollment

    async def send_step_email(
        self,
        enrollment: CRMSequenceEnrollment,
        user_id: str = "sequence-engine",
    ) -> None:
        """Send the current step's email for an enrollment, resolving merge fields."""
        sequence = await self.repo.get_by_id(enrollment.sequence_id)
        if sequence is None:
            return

        steps = json.loads(sequence.steps)
        if enrollment.current_step >= len(steps):
            return

        step = steps[enrollment.current_step]
        email_svc = EmailService(self.session, self.events, self.background, self.cache)

        await email_svc.send_email(
            {
                "contact_id": enrollment.contact_id,
                "subject": step.get("template_subject", ""),
                "body_html": step.get("template_body", ""),
                "body_text": step.get("template_body", ""),
                "sequence_id": enrollment.sequence_id,
                "sequence_step": enrollment.current_step,
            },
            user_id,
        )

        await self.advance_enrollment(enrollment.id)

    async def get_due_enrollments(self) -> Sequence[CRMSequenceEnrollment]:
        """Get enrollments ready to send their next step."""
        return await self.enrollment_repo.get_due_enrollments()

    async def get_sequence_stats(self, sequence_id: str) -> dict[str, int]:
        """Get enrollment stats for a sequence."""
        return await self.enrollment_repo.get_sequence_stats(sequence_id)

    async def get_enrollments_for_contact(self, contact_id: str) -> Sequence[CRMSequenceEnrollment]:
        """Get all enrollments for a contact."""
        return await self.enrollment_repo.get_for_contact(contact_id)
