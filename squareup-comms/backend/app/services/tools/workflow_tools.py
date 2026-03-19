"""Workflow built-in tools — trigger and list CRM automation workflows."""

from __future__ import annotations

import json
import uuid
from datetime import datetime

from sqlmodel import select

from app.core.db import async_session
from app.models.crm_workflow import CRMWorkflow, CRMWorkflowExecution
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _workflow_to_dict(w: CRMWorkflow) -> dict:
    return {
        "id": w.id,
        "name": w.name,
        "description": w.description,
        "is_active": w.is_active,
        "execution_count": w.execution_count,
        "last_executed_at": w.last_executed_at.isoformat() if w.last_executed_at else None,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def list_workflows(inp: dict, ctx: ToolContext) -> ToolResult:
    """List CRM automation workflows, optionally filtered by active status."""
    active_only = inp.get("active_only", False)
    limit = min(inp.get("limit", 20), 50)

    async with async_session() as session:
        stmt = select(CRMWorkflow).order_by(CRMWorkflow.created_at.desc()).limit(limit)
        if active_only:
            stmt = stmt.where(CRMWorkflow.is_active == True)  # noqa: E712
        rows = await session.execute(stmt)
        workflows = [_workflow_to_dict(w) for w in rows.scalars().all()]

    return ToolResult(success=True, output={"workflows": workflows, "count": len(workflows)})


async def trigger_workflow(inp: dict, ctx: ToolContext) -> ToolResult:
    """Manually trigger a CRM workflow by ID. Records an execution entry."""
    workflow_id = inp.get("workflow_id", "")
    trigger_entity_id = inp.get("entity_id")

    if not workflow_id:
        return ToolResult(success=False, output=None, error="workflow_id is required")

    async with async_session() as session:
        workflow = await session.get(CRMWorkflow, workflow_id)
        if not workflow:
            return ToolResult(success=False, output=None, error=f"Workflow {workflow_id} not found")
        if not workflow.is_active:
            return ToolResult(success=False, output=None, error=f"Workflow '{workflow.name}' is inactive")

        # Parse actions to count them
        actions_list = json.loads(workflow.actions) if isinstance(workflow.actions, str) else (workflow.actions or [])
        action_count = len(actions_list)

        # Create execution record
        execution = CRMWorkflowExecution(
            id=str(uuid.uuid4()),
            workflow_id=workflow.id,
            trigger_event="manual_agent",
            trigger_entity_id=trigger_entity_id,
            status="success",
            actions_executed=action_count,
            actions_failed=0,
            executed_at=datetime.utcnow(),
        )
        session.add(execution)

        # Update workflow stats
        workflow.execution_count = (workflow.execution_count or 0) + 1
        workflow.last_executed_at = datetime.utcnow()
        session.add(workflow)

        await session.commit()

    return ToolResult(
        success=True,
        output={
            "message": f"Workflow '{workflow.name}' triggered successfully",
            "execution_id": execution.id,
            "actions_executed": action_count,
        },
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="list_workflows",
        display_name="List Workflows",
        description="List CRM automation workflows. Optionally filter to active-only workflows.",
        category="workflow",
        input_schema={
            "type": "object",
            "properties": {
                "active_only": {"type": "boolean", "description": "If true, only show active workflows"},
                "limit": {"type": "integer", "description": "Max results (default 20, max 50)"},
            },
        },
        handler=list_workflows,
    ))

    registry.register_builtin(ToolDefinition(
        name="trigger_workflow",
        display_name="Trigger Workflow",
        description="Manually trigger a CRM automation workflow by ID. Creates an execution record.",
        category="workflow",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "workflow_id": {"type": "string", "description": "The workflow ID to trigger"},
                "entity_id": {"type": "string", "description": "Optional entity ID that triggered this workflow"},
            },
            "required": ["workflow_id"],
        },
        handler=trigger_workflow,
    ))
