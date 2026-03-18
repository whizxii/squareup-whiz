"""Workflow engine — event-driven trigger → condition → action execution.

Listens to EventBus for all trigger types, evaluates conditions against
the triggering record, and executes actions sequentially.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm_workflow import CRMWorkflow, CRMWorkflowExecution
from app.repositories.crm_workflow_repo import (
    WorkflowRepository,
    WorkflowExecutionRepository,
)
from app.services.base import BaseService

logger = logging.getLogger(__name__)

# Maps event bus event names → workflow trigger types
EVENT_TO_TRIGGER: dict[str, str] = {
    "contact.created": "contact.created",
    "deal.stage_changed": "deal.stage_changed",
    "activity.logged": "activity.logged",
    "score.changed": "score.changed",
    "contact.updated": "field.updated",
    "deal.updated": "field.updated",
}

# ─── Condition evaluation ────────────────────────────────────────

OPERATOR_EVALUATORS: dict[str, Any] = {
    "equals": lambda field_val, cond_val: field_val == cond_val,
    "not_equals": lambda field_val, cond_val: field_val != cond_val,
    "contains": lambda field_val, cond_val: (
        isinstance(field_val, str) and isinstance(cond_val, str)
        and cond_val.lower() in field_val.lower()
    ),
    "gt": lambda field_val, cond_val: _safe_compare(field_val, cond_val, ">"),
    "lt": lambda field_val, cond_val: _safe_compare(field_val, cond_val, "<"),
    "gte": lambda field_val, cond_val: _safe_compare(field_val, cond_val, ">="),
    "lte": lambda field_val, cond_val: _safe_compare(field_val, cond_val, "<="),
    "is_empty": lambda field_val, _: field_val is None or field_val == "",
    "is_not_empty": lambda field_val, _: field_val is not None and field_val != "",
    "in_list": lambda field_val, cond_val: (
        isinstance(cond_val, list) and field_val in cond_val
    ),
    "not_in_list": lambda field_val, cond_val: (
        isinstance(cond_val, list) and field_val not in cond_val
    ),
}


def _safe_compare(a: Any, b: Any, op: str) -> bool:
    """Safely compare numeric values."""
    try:
        a_num, b_num = float(a), float(b)
    except (TypeError, ValueError):
        return False
    if op == ">":
        return a_num > b_num
    if op == "<":
        return a_num < b_num
    if op == ">=":
        return a_num >= b_num
    if op == "<=":
        return a_num <= b_num
    return False


def evaluate_conditions(
    conditions: list[dict[str, Any]], context: dict[str, Any]
) -> bool:
    """Evaluate a list of conditions against a context dict.

    All conditions are AND-ed together.
    """
    if not conditions:
        return True

    for cond in conditions:
        field = cond.get("field", "")
        operator = cond.get("operator", "equals")
        value = cond.get("value")

        field_value = context.get(field)
        evaluator = OPERATOR_EVALUATORS.get(operator)
        if evaluator is None:
            logger.warning("Unknown operator '%s' in workflow condition", operator)
            return False

        if not evaluator(field_value, value):
            return False

    return True


# ─── Action executors ────────────────────────────────────────────


async def _execute_action(
    action: dict[str, Any],
    context: dict[str, Any],
    service: "WorkflowEngineService",
) -> dict[str, Any]:
    """Execute a single workflow action. Returns result dict."""
    action_type = action.get("type", "")
    params = action.get("params", {})

    try:
        if action_type == "update_field":
            return await _action_update_field(params, context, service)
        elif action_type == "create_activity":
            return await _action_create_activity(params, context, service)
        elif action_type == "send_notification":
            return await _action_send_notification(params, context, service)
        elif action_type == "add_tag":
            return await _action_add_tag(params, context, service)
        elif action_type == "move_stage":
            return await _action_move_stage(params, context, service)
        elif action_type == "assign_owner":
            return await _action_assign_owner(params, context, service)
        elif action_type in ("send_email", "enroll_sequence", "create_task", "webhook"):
            # Placeholder for future implementation
            logger.info("Action '%s' registered but not yet implemented", action_type)
            return {"status": "skipped", "reason": "not_implemented"}
        else:
            return {"status": "error", "reason": f"unknown action type: {action_type}"}
    except Exception as exc:
        logger.exception("Action '%s' failed: %s", action_type, exc)
        return {"status": "error", "reason": str(exc)}


async def _action_update_field(
    params: dict, context: dict, service: "WorkflowEngineService"
) -> dict:
    """Update a field on the triggering entity."""
    from app.models.crm import CRMContact

    entity_id = context.get("contact_id") or context.get("entity_id")
    field_name = params.get("field")
    new_value = params.get("value")

    if not entity_id or not field_name:
        return {"status": "error", "reason": "missing field or entity_id"}

    result = await service.session.get(CRMContact, entity_id)
    if result and hasattr(result, field_name):
        setattr(result, field_name, new_value)
        service.session.add(result)
        await service.session.flush()
        return {"status": "success", "field": field_name, "value": new_value}

    return {"status": "error", "reason": "entity not found or field invalid"}


async def _action_create_activity(
    params: dict, context: dict, service: "WorkflowEngineService"
) -> dict:
    """Create a CRM activity on the contact."""
    from app.models.crm import CRMActivity

    contact_id = context.get("contact_id")
    if not contact_id:
        return {"status": "error", "reason": "no contact_id in context"}

    activity = CRMActivity(
        contact_id=contact_id,
        type=params.get("activity_type", "task"),
        title=params.get("title", "Automated activity"),
        content=params.get("content"),
        performed_by="workflow-engine",
        performer_type="system",
    )
    service.session.add(activity)
    await service.session.flush()
    return {"status": "success", "activity_id": activity.id}


async def _action_send_notification(
    params: dict, context: dict, service: "WorkflowEngineService"
) -> dict:
    """Emit a notification event."""
    await service.events.emit("notification.send", {
        "title": params.get("title", "Workflow notification"),
        "message": params.get("message", ""),
        "contact_id": context.get("contact_id"),
        "workflow_id": context.get("workflow_id"),
    })
    return {"status": "success"}


async def _action_add_tag(
    params: dict, context: dict, service: "WorkflowEngineService"
) -> dict:
    """Add a tag to the contact."""
    contact_id = context.get("contact_id")
    tag_id = params.get("tag_id")
    if not contact_id or not tag_id:
        return {"status": "error", "reason": "missing contact_id or tag_id"}

    await service.events.emit("contact.tag_added", {
        "contact_id": contact_id,
        "tag_id": tag_id,
    })
    return {"status": "success", "tag_id": tag_id}


async def _action_move_stage(
    params: dict, context: dict, service: "WorkflowEngineService"
) -> dict:
    """Move a contact to a new stage."""
    from app.models.crm import CRMContact

    contact_id = context.get("contact_id")
    new_stage = params.get("stage")
    if not contact_id or not new_stage:
        return {"status": "error", "reason": "missing contact_id or stage"}

    contact = await service.session.get(CRMContact, contact_id)
    if contact:
        contact.stage = new_stage
        contact.updated_at = datetime.utcnow()
        service.session.add(contact)
        await service.session.flush()
        return {"status": "success", "stage": new_stage}

    return {"status": "error", "reason": "contact not found"}


async def _action_assign_owner(
    params: dict, context: dict, service: "WorkflowEngineService"
) -> dict:
    """Assign an owner to the contact."""
    from app.models.crm import CRMContact

    contact_id = context.get("contact_id")
    owner_id = params.get("owner_id")
    if not contact_id or not owner_id:
        return {"status": "error", "reason": "missing contact_id or owner_id"}

    contact = await service.session.get(CRMContact, contact_id)
    if contact:
        contact.owner_id = owner_id
        contact.updated_at = datetime.utcnow()
        service.session.add(contact)
        await service.session.flush()
        return {"status": "success", "owner_id": owner_id}

    return {"status": "error", "reason": "contact not found"}


# ─── Workflow Engine Service ─────────────────────────────────────


class WorkflowEngineService(BaseService):
    """Orchestrates workflow evaluation and execution."""

    @property
    def repo(self) -> WorkflowRepository:
        return WorkflowRepository(self.session)

    @property
    def execution_repo(self) -> WorkflowExecutionRepository:
        return WorkflowExecutionRepository(self.session)

    # ─── CRUD ────────────────────────────────────────────────────

    async def create_workflow(
        self, data: dict[str, Any], user_id: str
    ) -> CRMWorkflow:
        """Create a new workflow."""
        now = datetime.utcnow()
        workflow = CRMWorkflow(
            name=data["name"],
            description=data.get("description"),
            trigger=data.get("trigger", {}),
            actions=data.get("actions", []),
            is_active=data.get("is_active", False),
            execution_count=0,
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        workflow = await self.repo.create(workflow)

        await self.events.emit("workflow.created", {
            "workflow_id": workflow.id,
            "name": workflow.name,
        })
        return workflow

    async def update_workflow(
        self, workflow_id: str, data: dict[str, Any]
    ) -> CRMWorkflow:
        """Update an existing workflow."""
        workflow = await self.repo.get_by_id(workflow_id)
        if not workflow:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Workflow not found")

        updates = {
            k: v for k, v in data.items()
            if k in ("name", "description", "trigger", "actions")
            and v is not None
        }
        updates["updated_at"] = datetime.utcnow()

        return await self.repo.update(workflow, updates)

    async def get_workflow(self, workflow_id: str) -> CRMWorkflow | None:
        return await self.repo.get_by_id(workflow_id)

    async def list_workflows(
        self,
        *,
        is_active: bool | None = None,
        query: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ):
        return await self.repo.search(
            is_active=is_active, query=query, cursor=cursor, limit=limit
        )

    async def delete_workflow(self, workflow_id: str) -> bool:
        return await self.repo.delete(workflow_id)

    # ─── Activate / Deactivate ───────────────────────────────────

    async def activate(self, workflow_id: str) -> CRMWorkflow:
        workflow = await self.repo.get_by_id(workflow_id)
        if not workflow:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Workflow not found")

        return await self.repo.update(workflow, {
            "is_active": True,
            "updated_at": datetime.utcnow(),
        })

    async def deactivate(self, workflow_id: str) -> CRMWorkflow:
        workflow = await self.repo.get_by_id(workflow_id)
        if not workflow:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Workflow not found")

        return await self.repo.update(workflow, {
            "is_active": False,
            "updated_at": datetime.utcnow(),
        })

    # ─── Execution ───────────────────────────────────────────────

    async def execute_workflow(
        self,
        workflow: CRMWorkflow,
        context: dict[str, Any],
    ) -> CRMWorkflowExecution:
        """Execute a workflow against a context (the triggering record data).

        Evaluates conditions, then runs actions sequentially.
        """
        now = datetime.utcnow()
        trigger_type = workflow.trigger.get("type", "manual")
        conditions = workflow.trigger.get("conditions", [])

        # Evaluate conditions
        if not evaluate_conditions(conditions, context):
            execution = CRMWorkflowExecution(
                workflow_id=workflow.id,
                trigger_event=trigger_type,
                trigger_entity_id=context.get("entity_id") or context.get("contact_id"),
                status="skipped",
                actions_executed=0,
                actions_failed=0,
                executed_at=now,
            )
            execution = await self.execution_repo.create(execution)
            return execution

        # Execute actions sequentially
        executed = 0
        failed = 0
        errors: list[str] = []
        enriched_context = {**context, "workflow_id": workflow.id}

        for action in workflow.actions:
            result = await _execute_action(action, enriched_context, self)
            if result.get("status") == "error":
                failed += 1
                errors.append(
                    f"{action.get('type', '?')}: {result.get('reason', 'unknown')}"
                )
            else:
                executed += 1

        # Update workflow stats
        status = "success" if failed == 0 else ("partial" if executed > 0 else "failed")
        await self.repo.update(workflow, {
            "execution_count": workflow.execution_count + 1,
            "last_executed_at": now,
            "updated_at": now,
        })

        # Log execution
        execution = CRMWorkflowExecution(
            workflow_id=workflow.id,
            trigger_event=trigger_type,
            trigger_entity_id=context.get("entity_id") or context.get("contact_id"),
            status=status,
            actions_executed=executed,
            actions_failed=failed,
            error_details=json.dumps(errors) if errors else None,
            executed_at=now,
        )
        execution = await self.execution_repo.create(execution)

        await self.events.emit("workflow.executed", {
            "workflow_id": workflow.id,
            "execution_id": execution.id,
            "status": status,
        })

        return execution

    async def test_workflow(
        self, workflow_id: str, test_context: dict[str, Any]
    ) -> dict[str, Any]:
        """Dry-run a workflow without persisting side effects."""
        workflow = await self.repo.get_by_id(workflow_id)
        if not workflow:
            from app.core.responses import ApiError
            raise ApiError(status_code=404, detail="Workflow not found")

        conditions = workflow.trigger.get("conditions", [])
        conditions_met = evaluate_conditions(conditions, test_context)

        action_previews = []
        for action in workflow.actions:
            action_previews.append({
                "type": action.get("type"),
                "params": action.get("params", {}),
                "would_execute": conditions_met,
            })

        return {
            "conditions_met": conditions_met,
            "conditions_evaluated": len(conditions),
            "actions": action_previews,
        }

    async def get_execution_history(
        self,
        workflow_id: str,
        *,
        cursor: str | None = None,
        limit: int = 50,
    ):
        return await self.execution_repo.get_for_workflow(
            workflow_id, cursor=cursor, limit=limit
        )

    # ─── Event handler (called from EventBus) ────────────────────

    async def handle_event(
        self, event_name: str, data: dict[str, Any]
    ) -> None:
        """Handle an EventBus event — find matching workflows and execute."""
        trigger_type = EVENT_TO_TRIGGER.get(event_name)
        if not trigger_type:
            return

        workflows = await self.repo.get_active_by_trigger(trigger_type)
        for workflow in workflows:
            try:
                await self.execute_workflow(workflow, data)
            except Exception:
                logger.exception(
                    "Failed to execute workflow %s for event %s",
                    workflow.id,
                    event_name,
                )
