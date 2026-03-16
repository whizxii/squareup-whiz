"""CRM Workflows API — CRUD, activate/deactivate, test, execution history."""

from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_workflow_engine_service
from app.services.crm_workflow_engine import WorkflowEngineService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-workflows"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class WorkflowConditionBody(BaseModel):
    field: str
    operator: str = "equals"
    value: Any = None


class WorkflowTriggerBody(BaseModel):
    type: str = Field(..., description="Trigger type: contact.created, deal.stage_changed, etc.")
    conditions: List[WorkflowConditionBody] = Field(default_factory=list)


class WorkflowActionBody(BaseModel):
    type: str = Field(..., description="Action type: update_field, create_activity, etc.")
    params: dict[str, Any] = Field(default_factory=dict)


class WorkflowCreateBody(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    trigger: WorkflowTriggerBody
    actions: List[WorkflowActionBody] = Field(default_factory=list)
    is_active: bool = False


class WorkflowUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    trigger: Optional[WorkflowTriggerBody] = None
    actions: Optional[List[WorkflowActionBody]] = None


class WorkflowTestBody(BaseModel):
    context: dict[str, Any] = Field(
        ..., description="Test context with fields matching trigger conditions"
    )


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    trigger: dict[str, Any] = {}
    actions: list[dict[str, Any]] = []
    is_active: bool = False
    execution_count: int = 0
    last_executed_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, wf: Any) -> "WorkflowResponse":
        return cls(
            id=wf.id,
            name=wf.name,
            description=wf.description,
            trigger=wf.trigger or {},
            actions=wf.actions or [],
            is_active=wf.is_active,
            execution_count=wf.execution_count,
            last_executed_at=wf.last_executed_at.isoformat() if wf.last_executed_at else None,
            created_by=wf.created_by,
            created_at=wf.created_at.isoformat() if wf.created_at else None,
            updated_at=wf.updated_at.isoformat() if wf.updated_at else None,
        )


class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    trigger_event: str
    trigger_entity_id: Optional[str] = None
    status: str
    actions_executed: int
    actions_failed: int
    error_details: Optional[str] = None
    executed_at: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, ex: Any) -> "ExecutionResponse":
        return cls(
            id=ex.id,
            workflow_id=ex.workflow_id,
            trigger_event=ex.trigger_event,
            trigger_entity_id=ex.trigger_entity_id,
            status=ex.status,
            actions_executed=ex.actions_executed,
            actions_failed=ex.actions_failed,
            error_details=ex.error_details,
            executed_at=ex.executed_at.isoformat() if ex.executed_at else None,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/workflows", status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: WorkflowCreateBody,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new workflow automation rule."""
    data = body.model_dump()
    # Convert nested pydantic to plain dicts
    data["trigger"] = body.trigger.model_dump()
    data["actions"] = [a.model_dump() for a in body.actions]
    workflow = await svc.create_workflow(data, user_id)
    return success_response(WorkflowResponse.from_model(workflow))


@router.get("/workflows")
async def list_workflows(
    is_active: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """List workflows with optional filters."""
    page = await svc.list_workflows(
        is_active=is_active, query=search, cursor=cursor, limit=limit
    )
    return success_response({
        "items": [WorkflowResponse.from_model(w).model_dump(mode="json") for w in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single workflow by ID."""
    workflow = await svc.get_workflow(workflow_id)
    if not workflow:
        raise ApiError(status_code=404, detail="Workflow not found")
    return success_response(WorkflowResponse.from_model(workflow))


@router.put("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    body: WorkflowUpdateBody,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Update a workflow."""
    data = body.model_dump(exclude_unset=True)
    if "trigger" in data and body.trigger:
        data["trigger"] = body.trigger.model_dump()
    if "actions" in data and body.actions:
        data["actions"] = [a.model_dump() for a in body.actions]
    workflow = await svc.update_workflow(workflow_id, data)
    return success_response(WorkflowResponse.from_model(workflow))


@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Delete a workflow."""
    deleted = await svc.delete_workflow(workflow_id)
    if not deleted:
        raise ApiError(status_code=404, detail="Workflow not found")


@router.put("/workflows/{workflow_id}/activate")
async def activate_workflow(
    workflow_id: str,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Activate a workflow so it responds to trigger events."""
    workflow = await svc.activate(workflow_id)
    return success_response(WorkflowResponse.from_model(workflow))


@router.put("/workflows/{workflow_id}/deactivate")
async def deactivate_workflow(
    workflow_id: str,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Deactivate a workflow."""
    workflow = await svc.deactivate(workflow_id)
    return success_response(WorkflowResponse.from_model(workflow))


@router.post("/workflows/{workflow_id}/test")
async def test_workflow(
    workflow_id: str,
    body: WorkflowTestBody,
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Dry-run a workflow with test context data."""
    result = await svc.test_workflow(workflow_id, body.context)
    return success_response(result)


@router.get("/workflows/{workflow_id}/history")
async def get_execution_history(
    workflow_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: WorkflowEngineService = Depends(get_workflow_engine_service),
    user_id: str = Depends(get_current_user),
):
    """Get the execution history for a workflow."""
    page = await svc.get_execution_history(
        workflow_id, cursor=cursor, limit=limit
    )
    return success_response({
        "items": [ExecutionResponse.from_model(e).model_dump(mode="json") for e in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })
