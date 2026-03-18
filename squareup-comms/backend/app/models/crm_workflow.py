"""CRM Workflow model — trigger → condition → action automation rules."""

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class CRMWorkflow(SQLModel, table=True):
    __tablename__ = "crm_workflows"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=200)
    description: Optional[str] = None

    # Trigger config: {type, conditions: [{field, operator, value}]}
    trigger: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))

    # Actions: [{type, params: {}}]
    actions: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))

    is_active: bool = Field(default=False, index=True)
    execution_count: int = Field(default=0)
    last_executed_at: Optional[datetime] = None

    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(), index=True
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.utcnow()
    )


class CRMWorkflowExecution(SQLModel, table=True):
    """Audit log for each workflow execution."""

    __tablename__ = "crm_workflow_executions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workflow_id: str = Field(foreign_key="crm_workflows.id", index=True)
    trigger_event: str = Field(max_length=100)
    trigger_entity_id: Optional[str] = Field(default=None, max_length=128)
    status: str = Field(default="success", max_length=20)  # success / partial / failed
    actions_executed: int = Field(default=0)
    actions_failed: int = Field(default=0)
    error_details: Optional[str] = None
    executed_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(), index=True
    )
