"""Pipeline service — business logic for CRM pipelines."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Sequence

from app.models.crm_pipeline import CRMPipeline
from app.repositories.crm_pipeline_repo import PipelineRepository
from app.services.base import BaseService

# Default pipeline stages for new workspaces
DEFAULT_STAGES = [
    {"id": "lead", "label": "Lead", "order": 0, "color": "#6366F1", "probability": 10, "sla_days": 5},
    {"id": "qualified", "label": "Qualified", "order": 1, "color": "#3B82F6", "probability": 20, "sla_days": 5},
    {"id": "proposal", "label": "Proposal", "order": 2, "color": "#F59E0B", "probability": 40, "sla_days": 7},
    {"id": "negotiation", "label": "Negotiation", "order": 3, "color": "#F97316", "probability": 60, "sla_days": 7},
    {"id": "closed_won", "label": "Closed Won", "order": 4, "color": "#10B981", "probability": 100, "sla_days": 0},
    {"id": "closed_lost", "label": "Closed Lost", "order": 5, "color": "#EF4444", "probability": 0, "sla_days": 0},
]


class PipelineService(BaseService):
    """Business logic for pipeline operations."""

    @property
    def repo(self) -> PipelineRepository:
        return PipelineRepository(self.session)

    async def list_pipelines(self) -> Sequence[CRMPipeline]:
        """List all active pipelines."""
        return await self.repo.list_active()

    async def get_pipeline(self, pipeline_id: str) -> CRMPipeline | None:
        return await self.repo.get_by_id(pipeline_id)

    async def get_default_pipeline(self) -> CRMPipeline:
        """Get or create the default pipeline."""
        pipeline = await self.repo.get_default()
        if pipeline is not None:
            return pipeline

        # Auto-create default pipeline
        pipeline = CRMPipeline(
            name="Sales Pipeline",
            description="Default sales pipeline",
            stages=json.dumps(DEFAULT_STAGES),
            is_default=True,
        )
        return await self.repo.create(pipeline)

    async def create_pipeline(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMPipeline:
        """Create a new pipeline."""
        now = datetime.now(timezone.utc)
        stages = data.get("stages", DEFAULT_STAGES)

        pipeline = CRMPipeline(
            name=data["name"],
            description=data.get("description"),
            stages=json.dumps(stages),
            is_default=data.get("is_default", False),
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        pipeline = await self.repo.create(pipeline)

        if pipeline.is_default:
            await self.repo.ensure_single_default(pipeline.id)

        await self.events.emit("pipeline.created", {"pipeline_id": pipeline.id})
        return pipeline

    async def update_pipeline(
        self,
        pipeline_id: str,
        updates: dict[str, Any],
        user_id: str,
    ) -> CRMPipeline | None:
        """Update a pipeline."""
        pipeline = await self.repo.get_by_id(pipeline_id)
        if pipeline is None:
            return None

        if "stages" in updates:
            updates["stages"] = json.dumps(updates["stages"])

        updates["updated_at"] = datetime.now(timezone.utc)
        pipeline = await self.repo.update(pipeline, updates)

        if pipeline.is_default:
            await self.repo.ensure_single_default(pipeline.id)

        await self.events.emit("pipeline.updated", {"pipeline_id": pipeline_id})
        return pipeline

    def parse_stages(self, pipeline: CRMPipeline) -> list[dict[str, Any]]:
        """Parse the stages JSON from a pipeline."""
        try:
            return json.loads(pipeline.stages)
        except (json.JSONDecodeError, TypeError):
            return []

    def get_stage_probability(self, pipeline: CRMPipeline, stage_id: str) -> int:
        """Get the probability for a specific stage in a pipeline."""
        for s in self.parse_stages(pipeline):
            if s["id"] == stage_id:
                return s.get("probability", 0)
        return 0

    def get_stage_sla(self, pipeline: CRMPipeline, stage_id: str) -> int:
        """Get the SLA days for a specific stage."""
        for s in self.parse_stages(pipeline):
            if s["id"] == stage_id:
                return s.get("sla_days", 7)
        return 7
