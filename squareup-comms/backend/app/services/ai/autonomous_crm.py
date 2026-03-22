"""Autonomous CRM operations — AI-driven, confidence-gated actions.

High-confidence (>= 0.8): auto-execute and log.
Low-confidence (< 0.8): flag for human review via AutomationLog.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from app.models.automation_log import AutomationLog
from app.models.crm import CRMActivity
from app.services.base import BaseService

logger = logging.getLogger(__name__)

_AUTO_EXECUTE_THRESHOLD = 0.80


class AutonomousCRMService(BaseService):
    """AI-driven CRM automation with confidence-gated execution."""

    # ── Contact creation ────────────────────────────────────────────

    async def auto_create_contact(
        self,
        *,
        name: str,
        email: str | None = None,
        phone: str | None = None,
        company: str | None = None,
        confidence: float,
        source_event: str = "chat.message_analyzed",
        performed_by: str = "system",
        ai_reasoning: str = "",
    ) -> AutomationLog:
        """Create a contact if confidence is high, else flag for review."""
        entity_name = name or email or "Unknown"

        if confidence >= _AUTO_EXECUTE_THRESHOLD:
            from app.services.crm_contact_service import ContactService

            svc = ContactService(
                self.session, self.events, self.background, self.cache
            )
            contact = await svc.create_contact(
                {
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "company": company,
                    "stage": "lead",
                    "tags": ["auto-captured"],
                },
                user_id=performed_by,
            )

            log = await self._write_log(
                action_type="create_contact",
                entity_type="contact",
                entity_id=contact.id,
                entity_name=entity_name,
                confidence=confidence,
                status="auto_executed",
                performed_by=performed_by,
                result=json.dumps({"contact_id": contact.id}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            logger.info("Auto-created contact '%s' (confidence=%.2f)", name, confidence)
        else:
            log = await self._write_log(
                action_type="create_contact",
                entity_type="contact",
                entity_id="",
                entity_name=entity_name,
                confidence=confidence,
                status="pending_review",
                performed_by=performed_by,
                result=json.dumps({
                    "proposed": {"name": name, "email": email, "phone": phone, "company": company}
                }),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            await self.events.emit("automation.pending_review", {
                "log_id": log.id,
                "action_type": "create_contact",
                "entity_name": entity_name,
            })
            logger.info("Flagged contact creation '%s' for review (confidence=%.2f)", name, confidence)

        return log

    # ── Deal progression ────────────────────────────────────────────

    async def auto_progress_deal(
        self,
        *,
        deal_id: str,
        deal_name: str,
        new_stage: str,
        confidence: float,
        source_event: str = "chat.message_analyzed",
        performed_by: str = "system",
        ai_reasoning: str = "",
    ) -> AutomationLog:
        """Progress a deal to a new stage if confidence is high."""
        from app.models.crm import CRMDeal

        if confidence >= _AUTO_EXECUTE_THRESHOLD:
            from app.services.crm_deal_service import DealService

            svc = DealService(
                self.session, self.events, self.background, self.cache
            )
            await svc.move_stage(deal_id, new_stage, user_id=performed_by)

            log = await self._write_log(
                action_type="progress_deal",
                entity_type="deal",
                entity_id=deal_id,
                entity_name=deal_name,
                confidence=confidence,
                status="auto_executed",
                performed_by=performed_by,
                result=json.dumps({"new_stage": new_stage}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            logger.info("Auto-progressed deal '%s' → %s (confidence=%.2f)", deal_name, new_stage, confidence)
        else:
            log = await self._write_log(
                action_type="progress_deal",
                entity_type="deal",
                entity_id=deal_id,
                entity_name=deal_name,
                confidence=confidence,
                status="pending_review",
                performed_by=performed_by,
                result=json.dumps({"proposed_stage": new_stage}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            await self.events.emit("automation.pending_review", {
                "log_id": log.id,
                "action_type": "progress_deal",
                "entity_name": deal_name,
            })

        return log

    # ── Follow-up scheduling ────────────────────────────────────────

    async def auto_schedule_followup(
        self,
        *,
        contact_id: str,
        contact_name: str,
        due_at: datetime,
        title: str,
        confidence: float,
        source_event: str = "chat.message_analyzed",
        performed_by: str = "system",
        ai_reasoning: str = "",
    ) -> AutomationLog:
        """Schedule a follow-up activity if confidence is high."""
        if confidence >= _AUTO_EXECUTE_THRESHOLD:
            activity = CRMActivity(
                contact_id=contact_id,
                type="follow_up",
                title=title,
                content=f"Auto-scheduled follow-up: {title}",
                activity_metadata=json.dumps({"due_at": due_at.isoformat()}),
                performed_by=performed_by,
                performer_type="system",
            )
            self.session.add(activity)
            await self.session.flush()

            await self.events.emit("activity.logged", {
                "contact_id": contact_id,
                "activity_type": "follow_up",
                "source": "autonomous_crm",
            })

            log = await self._write_log(
                action_type="schedule_followup",
                entity_type="contact",
                entity_id=contact_id,
                entity_name=contact_name,
                confidence=confidence,
                status="auto_executed",
                performed_by=performed_by,
                result=json.dumps({"activity_id": activity.id, "due_at": due_at.isoformat()}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            logger.info("Auto-scheduled follow-up for '%s' (confidence=%.2f)", contact_name, confidence)
        else:
            log = await self._write_log(
                action_type="schedule_followup",
                entity_type="contact",
                entity_id=contact_id,
                entity_name=contact_name,
                confidence=confidence,
                status="pending_review",
                performed_by=performed_by,
                result=json.dumps({"proposed_title": title, "proposed_due_at": due_at.isoformat()}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            await self.events.emit("automation.pending_review", {
                "log_id": log.id,
                "action_type": "schedule_followup",
                "entity_name": contact_name,
            })

        return log

    # ── Field update ────────────────────────────────────────────────

    async def auto_update_fields(
        self,
        *,
        entity_type: str,
        entity_id: str,
        entity_name: str,
        fields: dict[str, Any],
        confidence: float,
        source_event: str = "chat.message_analyzed",
        performed_by: str = "system",
        ai_reasoning: str = "",
    ) -> AutomationLog:
        """Update CRM fields if confidence is high."""
        if confidence >= _AUTO_EXECUTE_THRESHOLD:
            if entity_type == "contact":
                from app.services.crm_contact_service import ContactService

                svc = ContactService(
                    self.session, self.events, self.background, self.cache
                )
                await svc.update_contact(
                    entity_id, fields, user_id=performed_by
                )

            log = await self._write_log(
                action_type="update_field",
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                confidence=confidence,
                status="auto_executed",
                performed_by=performed_by,
                result=json.dumps({"updated_fields": fields}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            logger.info("Auto-updated fields on %s '%s' (confidence=%.2f)", entity_type, entity_name, confidence)
        else:
            log = await self._write_log(
                action_type="update_field",
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                confidence=confidence,
                status="pending_review",
                performed_by=performed_by,
                result=json.dumps({"proposed_fields": fields}),
                source_event=source_event,
                ai_reasoning=ai_reasoning,
            )
            await self.events.emit("automation.pending_review", {
                "log_id": log.id,
                "action_type": "update_field",
                "entity_name": entity_name,
            })

        return log

    # ── Private helpers ─────────────────────────────────────────────

    async def _write_log(self, **kwargs: Any) -> AutomationLog:
        log = AutomationLog(id=str(uuid.uuid4()), **kwargs)
        self.session.add(log)
        await self.session.flush()
        return log
