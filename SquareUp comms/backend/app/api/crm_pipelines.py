"""CRM Pipelines API — pipeline CRUD and stage management."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_pipeline_service
from app.services.crm_pipeline_service import PipelineService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-pipelines"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class StageSchema(BaseModel):
    id: str
    label: str
    order: int
    color: str = "#6366F1"
    probability: int = 0
    sla_days: int = 7


class PipelineCreateBody(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    stages: Optional[List[StageSchema]] = None
    is_default: bool = False


class PipelineUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    stages: Optional[List[StageSchema]] = None
    is_default: Optional[bool] = None


class PipelineResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    stages: List[StageSchema] = []
    is_default: bool = False
    is_archived: bool = False
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, pipeline: Any) -> "PipelineResponse":
        stages: List[StageSchema] = []
        try:
            raw = json.loads(pipeline.stages) if pipeline.stages else []
            stages = [StageSchema(**s) for s in raw]
        except (json.JSONDecodeError, TypeError):
            stages = []
        return cls(
            id=pipeline.id,
            name=pipeline.name,
            description=pipeline.description,
            stages=stages,
            is_default=pipeline.is_default or False,
            is_archived=pipeline.is_archived or False,
            created_by=pipeline.created_by,
            created_at=pipeline.created_at,
            updated_at=pipeline.updated_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/pipelines",
    status_code=status.HTTP_201_CREATED,
)
async def create_pipeline(
    body: PipelineCreateBody,
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new CRM pipeline."""
    data: dict[str, Any] = body.model_dump(exclude_unset=True)
    if "stages" in data and data["stages"] is not None:
        data["stages"] = [s.model_dump() if isinstance(s, BaseModel) else s for s in data["stages"]]
    pipeline = await svc.create_pipeline(data, user_id)
    return success_response(PipelineResponse.from_model(pipeline))


@router.get("/pipelines")
async def list_pipelines(
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """List all active pipelines."""
    pipelines = await svc.list_pipelines()
    return success_response([
        PipelineResponse.from_model(p).model_dump(mode="json")
        for p in pipelines
    ])


@router.get("/pipelines/default")
async def get_default_pipeline(
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """Get or create the default pipeline."""
    pipeline = await svc.get_default_pipeline()
    return success_response(PipelineResponse.from_model(pipeline))


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(
    pipeline_id: str,
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single pipeline."""
    pipeline = await svc.get_pipeline(pipeline_id)
    if pipeline is None:
        raise ApiError(status_code=404, detail="Pipeline not found")
    return success_response(PipelineResponse.from_model(pipeline))


@router.put("/pipelines/{pipeline_id}")
async def update_pipeline(
    pipeline_id: str,
    body: PipelineUpdateBody,
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """Update a pipeline."""
    updates: dict[str, Any] = body.model_dump(exclude_unset=True)
    if "stages" in updates and updates["stages"] is not None:
        updates["stages"] = [s.model_dump() if isinstance(s, BaseModel) else s for s in updates["stages"]]
    pipeline = await svc.update_pipeline(pipeline_id, updates, user_id)
    if pipeline is None:
        raise ApiError(status_code=404, detail="Pipeline not found")
    return success_response(PipelineResponse.from_model(pipeline))


@router.get("/pipelines/{pipeline_id}/stages")
async def get_pipeline_stages(
    pipeline_id: str,
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """Get stages for a pipeline."""
    pipeline = await svc.get_pipeline(pipeline_id)
    if pipeline is None:
        raise ApiError(status_code=404, detail="Pipeline not found")
    stages = svc.parse_stages(pipeline)
    return success_response(stages)


@router.put("/pipelines/{pipeline_id}/stages")
async def update_pipeline_stages(
    pipeline_id: str,
    stages: List[StageSchema],
    svc: PipelineService = Depends(get_pipeline_service),
    user_id: str = Depends(get_current_user),
):
    """Replace all stages for a pipeline."""
    pipeline = await svc.update_pipeline(
        pipeline_id,
        {"stages": [s.model_dump() for s in stages]},
        user_id,
    )
    if pipeline is None:
        raise ApiError(status_code=404, detail="Pipeline not found")
    return success_response(PipelineResponse.from_model(pipeline))
