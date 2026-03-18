"""Deal service — business logic for CRM deals."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Sequence

from app.models.crm import CRMActivity
from app.models.crm_audit import CRMAuditLog
from app.models.crm_deal import CRMDeal
from app.repositories.crm_deal_repo import DealRepository
from app.services.crm_pipeline_service import PipelineService
from app.services.base import BaseService


class DealService(BaseService):
    """Business logic for deal operations."""

    @property
    def repo(self) -> DealRepository:
        return DealRepository(self.session)

    @property
    def pipeline_svc(self) -> PipelineService:
        return PipelineService(self.session, self.events, self.background, self.cache)

    async def create_deal(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMDeal:
        """Create a deal with auto-probability from pipeline stage."""
        now = datetime.utcnow()

        # Resolve pipeline and probability
        pipeline_id = data.get("pipeline_id")
        if not pipeline_id:
            default = await self.pipeline_svc.get_default_pipeline()
            pipeline_id = default.id

        pipeline = await self.pipeline_svc.get_pipeline(pipeline_id)
        stage = data.get("stage", "lead")
        probability = data.get("probability")
        if probability is None and pipeline is not None:
            probability = self.pipeline_svc.get_stage_probability(pipeline, stage)

        deal = CRMDeal(
            title=data["title"],
            contact_id=data["contact_id"],
            company_id=data.get("company_id"),
            pipeline_id=pipeline_id,
            stage=stage,
            value=data.get("value"),
            currency=data.get("currency", "INR"),
            probability=probability or 0,
            expected_close_date=data.get("expected_close_date"),
            status="open",
            owner_id=data.get("owner_id") or user_id,
            stage_entered_at=now,
            deal_health="green",
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        deal = await self.repo.create(deal)

        # Log activity on the contact
        activity = CRMActivity(
            contact_id=deal.contact_id,
            type="deal_created",
            title=f"Deal created: {deal.title}",
            content=f"Value: {deal.value} {deal.currency}" if deal.value else None,
            performed_by=user_id,
            performer_type="user",
        )
        self.session.add(activity)

        # Audit log
        audit = CRMAuditLog(
            entity_type="deal",
            entity_id=deal.id,
            action="create",
            changes=json.dumps({"title": deal.title, "value": deal.value}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("deal.created", {
            "deal_id": deal.id,
            "contact_id": deal.contact_id,
            "title": deal.title,
        })

        return deal

    async def update_deal(
        self,
        deal_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMDeal | None:
        """Update a deal with audit logging."""
        deal = await self.repo.get_by_id(deal_id)
        if deal is None:
            return None

        now = datetime.utcnow()
        changes: dict[str, dict[str, Any]] = {}

        for field, value in updates.items():
            old_value = getattr(deal, field, None)
            if old_value != value:
                changes[field] = {"old": str(old_value), "new": str(value)}

        updates["updated_at"] = now
        deal = await self.repo.update(deal, updates)

        if changes:
            audit = CRMAuditLog(
                entity_type="deal",
                entity_id=deal_id,
                action="update",
                changes=json.dumps(changes),
                performed_by=user_id,
            )
            self.session.add(audit)
            await self.session.commit()

        await self.events.emit("deal.updated", {"deal_id": deal_id})
        return deal

    async def move_stage(
        self,
        deal_id: str,
        new_stage: str,
        user_id: str,
    ) -> CRMDeal | None:
        """Move a deal to a new stage — updates probability, logs activity."""
        deal = await self.repo.get_by_id(deal_id)
        if deal is None:
            return None

        old_stage = deal.stage
        if old_stage == new_stage:
            return deal

        now = datetime.utcnow()

        # Get probability from pipeline stage config
        pipeline = await self.pipeline_svc.get_pipeline(deal.pipeline_id)
        new_probability = self.pipeline_svc.get_stage_probability(pipeline, new_stage) if pipeline else 0

        deal = await self.repo.update(deal, {
            "stage": new_stage,
            "probability": new_probability,
            "stage_entered_at": now,
            "deal_health": "green",
            "updated_at": now,
        })

        # Log activity
        activity = CRMActivity(
            contact_id=deal.contact_id,
            type="stage_change",
            title=f"Deal stage: {old_stage} → {new_stage}",
            content=f"{deal.title} moved to {new_stage}",
            performed_by=user_id,
            performer_type="user",
        )
        self.session.add(activity)

        # Audit
        audit = CRMAuditLog(
            entity_type="deal",
            entity_id=deal_id,
            action="stage_change",
            changes=json.dumps({"stage": {"old": old_stage, "new": new_stage}}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("deal.stage_changed", {
            "deal_id": deal_id,
            "old_stage": old_stage,
            "new_stage": new_stage,
        })

        return deal

    async def win_deal(self, deal_id: str, user_id: str) -> CRMDeal | None:
        """Mark a deal as won."""
        deal = await self.repo.get_by_id(deal_id)
        if deal is None:
            return None

        now = datetime.utcnow()
        deal = await self.repo.update(deal, {
            "status": "won",
            "stage": "closed_won",
            "probability": 100,
            "actual_close_date": now,
            "updated_at": now,
        })

        activity = CRMActivity(
            contact_id=deal.contact_id,
            type="deal_won",
            title=f"Deal won: {deal.title}",
            content=f"Value: {deal.value} {deal.currency}" if deal.value else None,
            performed_by=user_id,
            performer_type="user",
        )
        self.session.add(activity)

        audit = CRMAuditLog(
            entity_type="deal",
            entity_id=deal_id,
            action="update",
            changes=json.dumps({"status": {"old": "open", "new": "won"}}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("deal.won", {"deal_id": deal_id, "value": deal.value})
        return deal

    async def lose_deal(
        self,
        deal_id: str,
        reason: str,
        detail: str | None,
        user_id: str,
    ) -> CRMDeal | None:
        """Mark a deal as lost with a reason."""
        deal = await self.repo.get_by_id(deal_id)
        if deal is None:
            return None

        now = datetime.utcnow()
        deal = await self.repo.update(deal, {
            "status": "lost",
            "stage": "closed_lost",
            "probability": 0,
            "actual_close_date": now,
            "loss_reason": reason,
            "loss_reason_detail": detail,
            "updated_at": now,
        })

        activity = CRMActivity(
            contact_id=deal.contact_id,
            type="deal_lost",
            title=f"Deal lost: {deal.title}",
            content=f"Reason: {reason}" + (f" — {detail}" if detail else ""),
            performed_by=user_id,
            performer_type="user",
        )
        self.session.add(activity)

        audit = CRMAuditLog(
            entity_type="deal",
            entity_id=deal_id,
            action="update",
            changes=json.dumps({
                "status": {"old": "open", "new": "lost"},
                "loss_reason": {"old": None, "new": reason},
            }),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("deal.lost", {"deal_id": deal_id, "reason": reason})
        return deal

    async def get_deals_for_contact(self, contact_id: str) -> Sequence[CRMDeal]:
        """Get all deals for a contact."""
        return await self.repo.get_for_contact(contact_id)

    async def get_pipeline_deals(self, pipeline_id: str) -> dict[str, list[CRMDeal]]:
        """Get deals grouped by stage for kanban view."""
        return await self.repo.get_by_pipeline_grouped(pipeline_id)

    async def get_stale_deals(self) -> Sequence[CRMDeal]:
        """Get deals that have been in their current stage past SLA."""
        return await self.repo.get_stale_deals()
