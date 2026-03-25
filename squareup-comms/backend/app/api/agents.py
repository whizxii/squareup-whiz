"""AI Agents API routes."""

from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.services.agent_templates import DONNA_PERSONALITY_TEXT
from app.core.db import get_session
from app.models.agents import Agent, AgentExecution, AgentMemory
from app.services.agent_engine import invoke_agent_sync, resume_after_confirmation

router = APIRouter(prefix="/api/agents", tags=["agents"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AgentCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    system_prompt: str
    model: str = Field(default="claude-sonnet-4-6", max_length=50)
    tools: Optional[List[str]] = Field(default_factory=list)
    mcp_servers: Optional[List[str]] = Field(default_factory=list)
    custom_tools: Optional[List[str]] = Field(default_factory=list)
    trigger_mode: str = Field(default="mention", max_length=20)
    schedule_cron: Optional[str] = Field(default=None, max_length=100)
    max_iterations: int = Field(default=5, ge=1, le=20)
    autonomy_level: int = Field(default=2, ge=1, le=4)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    office_x: Optional[int] = None
    office_y: Optional[int] = None
    office_station_icon: Optional[str] = Field(default=None, max_length=10)
    personality: Optional[str] = None
    monthly_budget_usd: Optional[float] = Field(default=None, ge=0.0)
    daily_execution_limit: Optional[int] = Field(default=None, ge=1)


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = Field(default=None, max_length=50)
    tools: Optional[List[str]] = None
    mcp_servers: Optional[List[str]] = None
    custom_tools: Optional[List[str]] = None
    trigger_mode: Optional[str] = Field(default=None, max_length=20)
    schedule_cron: Optional[str] = Field(default=None, max_length=100)
    max_iterations: Optional[int] = Field(default=None, ge=1, le=20)
    autonomy_level: Optional[int] = Field(default=None, ge=1, le=4)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    office_x: Optional[int] = None
    office_y: Optional[int] = None
    office_station_icon: Optional[str] = Field(default=None, max_length=10)
    personality: Optional[str] = None
    monthly_budget_usd: Optional[float] = Field(default=None, ge=0.0)
    daily_execution_limit: Optional[int] = Field(default=None, ge=1)


class AgentStatusUpdate(BaseModel):
    status: str = Field(..., max_length=20, description="idle | thinking | working | error | offline")
    current_task: Optional[str] = None


class AgentResponse(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str]
    avatar_config: Optional[str]
    description: Optional[str]
    system_prompt: str
    model: str
    tools: Optional[str]
    mcp_servers: Optional[str]
    custom_tools: Optional[str]
    trigger_mode: str
    schedule_cron: Optional[str]
    personality: Optional[str]
    max_iterations: int
    autonomy_level: int
    temperature: float
    office_x: Optional[int]
    office_y: Optional[int]
    office_station_icon: Optional[str]
    status: str
    current_task: Optional[str]
    active: bool
    total_executions: int
    total_cost_usd: float
    success_rate: float
    monthly_budget_usd: Optional[float]
    daily_execution_limit: Optional[int]
    cost_this_month: float
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvokeRequest(BaseModel):
    message: str
    channel_id: str | None = None


class ExecutionResponse(BaseModel):
    id: str
    agent_id: str
    trigger_message_id: Optional[str]
    trigger_channel_id: Optional[str]
    conversation_messages: Optional[str]
    tools_called: Optional[str]
    response_text: Optional[str]
    input_tokens: Optional[int]
    output_tokens: Optional[int]
    total_cost_usd: Optional[float]
    duration_ms: Optional[int]
    num_tool_calls: int
    status: str
    error_message: Optional[str]
    error_type: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedExecutions(BaseModel):
    items: List[ExecutionResponse]
    total: int
    offset: int
    limit: int


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_active_agent(
    agent_id: str,
    session: AsyncSession,
) -> Agent:
    """Fetch an agent by ID and raise 404 if missing or deactivated."""
    agent = await session.get(Agent, agent_id)
    if not agent or not agent.active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    return agent


# ---------------------------------------------------------------------------
# Agent CRUD Routes
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_agent(
    body: AgentCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Agent:
    """Create a new AI agent."""

    agent = Agent(
        name=body.name,
        description=body.description,
        system_prompt=body.system_prompt,
        model=body.model,
        tools=json.dumps(body.tools or []),
        mcp_servers=json.dumps(body.mcp_servers or []),
        custom_tools=json.dumps(body.custom_tools or []),
        trigger_mode=body.trigger_mode,
        schedule_cron=body.schedule_cron,
        max_iterations=body.max_iterations,
        autonomy_level=body.autonomy_level,
        temperature=body.temperature,
        office_x=body.office_x,
        office_y=body.office_y,
        office_station_icon=body.office_station_icon,
        personality=body.personality,
        monthly_budget_usd=body.monthly_budget_usd,
        daily_execution_limit=body.daily_execution_limit,
        created_by=user_id,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> list[Agent]:
    """List all active agents with their stats."""

    stmt = (
        select(Agent)
        .where(Agent.active == True)  # noqa: E712
        .order_by(Agent.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


class ToolDefinitionResponse(BaseModel):
    name: str
    display_name: str
    description: str
    category: str
    input_schema: dict
    source: str
    requires_confirmation: bool


class ToolsListResponse(BaseModel):
    tools: List[ToolDefinitionResponse]
    categories: List[str]
    total: int


@router.get("/tools", response_model=ToolsListResponse)
async def list_available_tools(
    user_id: str = Depends(get_current_user),
) -> dict:
    """List all available built-in tools with schemas, grouped by category."""
    from app.services.tools import tool_registry

    builtins = tool_registry.list_builtins()
    tools = [
        ToolDefinitionResponse(
            name=t.name,
            display_name=t.display_name,
            description=t.description,
            category=t.category,
            input_schema=t.input_schema,
            source=t.source,
            requires_confirmation=t.requires_confirmation,
        )
        for t in builtins
    ]
    categories = sorted({t.category for t in tools})
    return {"tools": tools, "categories": categories, "total": len(tools)}


class AgentTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    category: str
    system_prompt: str
    model: str
    tools: List[str]
    trigger_mode: str
    personality: str
    max_iterations: int
    autonomy_level: int
    temperature: float


class TemplatesListResponse(BaseModel):
    templates: List[AgentTemplateResponse]
    categories: List[str]
    total: int


@router.get("/templates", response_model=TemplatesListResponse)
async def list_agent_templates(
    user_id: str = Depends(get_current_user),
) -> dict:
    """List all pre-defined agent templates for one-click deployment."""
    from app.services.agent_templates import list_templates

    templates = list_templates()
    categories = sorted({t["category"] for t in templates})
    return {"templates": templates, "categories": categories, "total": len(templates)}


# ---------------------------------------------------------------------------
# Natural language agent generation
# ---------------------------------------------------------------------------

class GenerateAgentRequest(BaseModel):
    description: str = Field(
        ..., min_length=5, max_length=1000,
        description="Natural language description of the agent to create",
    )


class GeneratedAgentResponse(BaseModel):
    name: str
    description: str
    system_prompt: str
    model: str
    tools: List[str]
    trigger_mode: str
    personality: str
    max_iterations: int
    autonomy_level: int
    temperature: float


@router.post("/generate", response_model=GeneratedAgentResponse)
async def generate_agent_config(
    body: GenerateAgentRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Generate an agent configuration from a natural language description.

    Uses AI to suggest name, tools, system prompt, and settings based on what
    the user describes. The generated config can be reviewed and edited before
    actually creating the agent via POST /api/agents/.
    """
    from app.services.nl_agent_generator import generate_agent_from_description
    from app.services.tools import tool_registry

    builtins = tool_registry.list_builtins()
    available_tools = [
        {
            "name": t.name,
            "display_name": t.display_name,
            "description": t.description,
            "category": t.category,
        }
        for t in builtins
    ]

    try:
        config = await generate_agent_from_description(
            description=body.description,
            available_tools=available_tools,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc),
        )

    return {
        "name": config.name,
        "description": config.description,
        "system_prompt": config.system_prompt,
        "model": config.model,
        "tools": config.tools,
        "trigger_mode": config.trigger_mode,
        "personality": config.personality,
        "max_iterations": config.max_iterations,
        "autonomy_level": config.autonomy_level,
        "temperature": config.temperature,
    }


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Agent:
    """Get details for a single agent."""

    return await _get_active_agent(agent_id, session)


def _is_system_agent(agent: Agent) -> bool:
    """Return True if the agent is a system/prebuilt agent (not user-created)."""
    return agent.created_by is None or agent.created_by == "system"


def _check_agent_ownership(agent: Agent, user_id: str, action: str = "modify") -> None:
    """Raise 403 if user is not the agent's owner (unless it's a system agent).

    System agents can be edited by anyone (team-shared).
    User-created agents can only be modified/deleted by their creator.
    """
    if _is_system_agent(agent):
        return  # System agents are shared — any team member can edit
    if agent.created_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the agent's creator can {action} this agent",
        )


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    body: AgentUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Agent:
    """Update agent fields. Only provided (non-None) fields are changed."""

    agent = await _get_active_agent(agent_id, session)

    _check_agent_ownership(agent, user_id, action="update")
    update_data = body.model_dump(exclude_unset=True)

    # Serialize list fields to JSON strings for storage
    if "tools" in update_data and update_data["tools"] is not None:
        update_data["tools"] = json.dumps(update_data["tools"])
    if "mcp_servers" in update_data and update_data["mcp_servers"] is not None:
        update_data["mcp_servers"] = json.dumps(update_data["mcp_servers"])
    if "custom_tools" in update_data and update_data["custom_tools"] is not None:
        update_data["custom_tools"] = json.dumps(update_data["custom_tools"])

    for field, value in update_data.items():
        setattr(agent, field, value)

    agent.updated_at = datetime.utcnow()

    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_200_OK)
async def deactivate_agent(
    agent_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """Deactivate an agent (soft-delete). Sets active=false."""

    agent = await _get_active_agent(agent_id, session)

    # System agents cannot be deactivated
    if _is_system_agent(agent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System agents cannot be deactivated",
        )
    _check_agent_ownership(agent, user_id, action="deactivate")
    agent.active = False
    agent.status = "offline"
    agent.updated_at = datetime.utcnow()

    session.add(agent)
    await session.commit()
    return {"detail": "Agent deactivated", "agent_id": agent_id}


@router.put("/{agent_id}/status", response_model=AgentResponse)
async def update_agent_status(
    agent_id: str,
    body: AgentStatusUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Agent:
    """Update agent status and current_task."""

    valid_statuses = {"idle", "thinking", "working", "error", "offline"}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}",
        )

    agent = await _get_active_agent(agent_id, session)

    _check_agent_ownership(agent, user_id, action="update status for")

    agent.status = body.status
    agent.current_task = body.current_task
    agent.updated_at = datetime.utcnow()

    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


# ---------------------------------------------------------------------------
# Agent Memory Routes
# ---------------------------------------------------------------------------

class MemoryResponse(BaseModel):
    id: str
    agent_id: str
    user_id: str
    key: str
    value: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemoryUpdate(BaseModel):
    value: str = Field(..., min_length=1, max_length=5000)


@router.get("/{agent_id}/memories", response_model=List[MemoryResponse])
async def list_agent_memories(
    agent_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> list[AgentMemory]:
    """List all memories an agent has stored about the current user."""

    await _get_active_agent(agent_id, session)

    stmt = (
        select(AgentMemory)
        .where(AgentMemory.agent_id == agent_id, AgentMemory.user_id == user_id)
        .order_by(AgentMemory.updated_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.put("/{agent_id}/memories/{memory_id}", response_model=MemoryResponse)
async def update_agent_memory(
    agent_id: str,
    memory_id: str,
    body: MemoryUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> AgentMemory:
    """Update the value of a specific memory entry."""

    memory = await session.get(AgentMemory, memory_id)
    if not memory or memory.agent_id != agent_id or memory.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    memory.value = body.value
    memory.updated_at = datetime.utcnow()
    session.add(memory)
    await session.commit()
    await session.refresh(memory)
    return memory


@router.delete("/{agent_id}/memories/{memory_id}", status_code=status.HTTP_200_OK)
async def delete_agent_memory(
    agent_id: str,
    memory_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """Delete a specific memory entry."""

    memory = await session.get(AgentMemory, memory_id)
    if not memory or memory.agent_id != agent_id or memory.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    await session.delete(memory)
    await session.commit()
    return {"detail": "Memory deleted", "memory_id": memory_id}


@router.delete("/{agent_id}/memories", status_code=status.HTTP_200_OK)
async def clear_agent_memories(
    agent_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """Delete all memories an agent has about the current user."""

    await _get_active_agent(agent_id, session)

    stmt = (
        select(AgentMemory)
        .where(AgentMemory.agent_id == agent_id, AgentMemory.user_id == user_id)
    )
    result = await session.execute(stmt)
    memories = list(result.scalars().all())

    for mem in memories:
        await session.delete(mem)

    await session.commit()
    return {"detail": f"Deleted {len(memories)} memories", "count": len(memories)}


# ---------------------------------------------------------------------------
# Agent Execution Routes
# ---------------------------------------------------------------------------

@router.post("/{agent_id}/invoke")
async def invoke_agent(
    agent_id: str,
    body: InvokeRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """Invoke an agent with the full ReAct engine (tool execution + memory).

    Uses the same ReAct loop as the WebSocket path — real tool calls,
    conversation memory, and proper Claude API integration.
    """

    # Verify agent exists and is active
    await _get_active_agent(agent_id, session)

    result = await invoke_agent_sync(
        agent_id=agent_id,
        user_id=user_id,
        content=body.message,
        channel_id=body.channel_id,
    )

    return _invoke_result_to_response(result)


def _invoke_result_to_response(result) -> dict:
    """Convert an InvokeResult to the API response dict."""
    resp = {
        "response_text": result.response_text,
        "tools_called": json.dumps(result.tool_calls_log, default=str),
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "total_cost_usd": result.total_cost_usd,
        "duration_ms": result.duration_ms,
        "status": result.status,
        "error_message": result.error_message,
        "num_tool_calls": len(result.tool_calls_log),
    }
    if result.execution_id:
        resp["execution_id"] = result.execution_id
    if result.pending_confirmation:
        resp["pending_confirmation"] = result.pending_confirmation
    return resp


class ConfirmRequest(BaseModel):
    approved: bool = Field(..., description="Whether the user approved the tool execution")
    edited_input: dict | None = Field(
        default=None,
        description="Optionally modified tool input (only used when approved=True)",
    )


@router.post("/{agent_id}/executions/{execution_id}/confirm")
async def confirm_tool_execution(
    agent_id: str,
    execution_id: str,
    body: ConfirmRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """Approve or reject a tool that requires confirmation, then resume the ReAct loop."""

    # Verify agent exists
    await _get_active_agent(agent_id, session)

    # Verify execution belongs to this agent and is awaiting confirmation
    exec_record = await session.get(AgentExecution, execution_id)
    if not exec_record or exec_record.agent_id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found for this agent",
        )
    if exec_record.status != "awaiting_confirmation":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Execution is not awaiting confirmation (status={exec_record.status})",
        )

    result = await resume_after_confirmation(
        execution_id=execution_id,
        agent_id=agent_id,
        user_id=user_id,
        approved=body.approved,
        edited_input=body.edited_input,
    )

    return _invoke_result_to_response(result)


@router.get("/{agent_id}/executions", response_model=PaginatedExecutions)
async def list_executions(
    agent_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """List execution history for an agent, newest first, with pagination."""

    # Ensure agent exists
    await _get_active_agent(agent_id, session)

    # Get total count
    count_stmt = (
        select(func.count())
        .select_from(AgentExecution)
        .where(AgentExecution.agent_id == agent_id)
    )
    count_result = await session.execute(count_stmt)
    total = count_result.scalar_one()

    # Get paginated results
    stmt = (
        select(AgentExecution)
        .where(AgentExecution.agent_id == agent_id)
        .order_by(AgentExecution.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    execution_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> AgentExecution:
    """Get details for a single execution."""

    execution = await session.get(AgentExecution, execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found",
        )
    return execution


# ---------------------------------------------------------------------------
# Pre-built Agents Seed
# ---------------------------------------------------------------------------

PREBUILT_AGENTS = [
    {
        "name": "@donna",
        "description": (
            "Your executive assistant. Give her any task — CRM, scheduling, research, "
            "tasks, email — she handles everything. Just @donna."
        ),
        "system_prompt": (
            "You are Donna, the universal executive assistant for this workspace. "
            "You have access to ALL workspace tools — CRM, calendar, tasks, reminders, email, "
            "search, analytics. Users come to you for anything.\n\n"
            "**Your capabilities:**\n"
            "- CRM: Search, create, update contacts and deals. Count entries. Add notes. Track pipeline.\n"
            "- Calendar: Check availability, create events, manage schedule.\n"
            "- Tasks: Create, assign, track, and complete tasks. Set reminders.\n"
            "- Communication: Search messages, send channel messages, draft emails.\n"
            "- Research: Search workspace knowledge, CRM notes, contact history.\n"
            "- Analytics: Pipeline summaries, deal metrics, contact stats.\n\n"
            "**How you handle requests:**\n"
            "- Add a contact: extract ALL details from the message, create immediately.\n"
            "- 'How many': use crm_count_contacts.\n"
            "- Find someone: search by name, email, phone, or company.\n"
            "- Schedule: check availability first, then create event.\n"
            "- Something you lack a tool for: explain what you CAN do and suggest the closest action.\n"
        ),
        "model": "gemini-2.5-flash-lite",
        # Full tool list — the intent router filters to relevant categories per-request,
        # so only ~5-15 tool schemas are sent to the LLM instead of all 66.
        "tools": json.dumps([
            # CRM (12)
            "crm_search_contacts", "crm_get_contact", "crm_create_contact",
            "crm_update_contact", "crm_count_contacts", "crm_add_note",
            "crm_list_deals", "crm_create_deal", "crm_update_deal_stage",
            "crm_log_activity", "crm_get_pipeline", "crm_search_companies",
            # Calendar (4)
            "list_calendar_events", "create_calendar_event",
            "check_availability", "update_calendar_event",
            # Tasks (5)
            "create_task", "list_tasks", "update_task", "complete_task", "assign_task",
            # Reminders (3)
            "set_reminder", "list_reminders", "cancel_reminder",
            # Email (6)
            "draft_email", "send_email", "search_emails", "get_email_thread",
            "analyze_email_chain", "process_email_chain",
            # Communication (5)
            "list_channels", "search_messages", "get_channel_info",
            "send_channel_message", "get_channel_members",
            # Knowledge (3)
            "search_workspace", "search_crm_notes", "get_contact_history",
            # Analytics (3)
            "get_deal_metrics", "get_pipeline_summary", "get_contact_stats",
            # DateTime (3)
            "get_current_time", "calculate_date", "parse_relative_date",
            # Team (3)
            "list_team_members", "get_user_profile", "get_user_status",
            # Agent delegation (3)
            "list_agents", "invoke_agent", "delegate_to_agent",
            # AI Insights (5)
            "ai_get_daily_brief", "ai_get_evening_brief", "ai_deal_coaching",
            "ai_pipeline_report", "ai_relationship_analysis",
            # AI Autonomous (4)
            "ai_suggest_next_actions", "ai_smart_search",
            "ai_forecast_deal", "ai_draft_email",
            # Intelligence (2)
            "entity_360_view", "relationship_map",
            # Reports (2)
            "generate_weekly_report", "catch_up_summary",
            # Workflow (2)
            "list_workflows", "trigger_workflow",
            # System (1)
            "report_progress",
        ]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\U0001F469\u200D\U0001F4BC",
        "personality": DONNA_PERSONALITY_TEXT,
        "max_iterations": 10,
        "autonomy_level": 3,
        "temperature": 0.4,
    },
    {
        "name": "@crm-agent",
        "description": "Manages your CRM contacts, logs activities, and searches customer records. Mention @crm-agent to look up contacts, add notes, or update deal stages.",
        "system_prompt": (
            "You are the CRM Agent for SquareUp Comms. You help team members manage "
            "customer relationships by searching contacts, creating new records, updating "
            "existing contacts, and logging activities like calls, emails, and meetings. "
            "Always be concise and confirm actions taken."
        ),
        "model": "gemini-2.5-flash-lite",
        "tools": json.dumps([
            "crm_search_contacts", "crm_get_contact", "crm_create_contact",
            "crm_update_contact", "crm_count_contacts", "crm_add_note",
            "crm_list_deals", "crm_create_deal", "crm_update_deal_stage",
            "crm_log_activity", "crm_get_pipeline", "crm_search_companies",
            "get_deal_metrics", "get_pipeline_summary", "get_contact_stats",
            "search_crm_notes", "get_contact_history",
        ]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\U0001F4CA",
        "personality": "Professional and organized. Speaks in clear, structured summaries. Loves data and always double-checks before making changes.",
    },
    {
        "name": "@meeting-agent",
        "description": "Schedules meetings, transcribes recordings, and updates CRM with meeting notes. Mention @meeting-agent for anything calendar or meeting related.",
        "system_prompt": (
            "You are the Meeting Agent for SquareUp Comms. You help schedule meetings, "
            "manage calendar events, transcribe meeting recordings, and sync meeting notes "
            "back to the CRM. Proactively suggest optimal times and always include an agenda."
        ),
        "model": "gemini-2.5-flash-lite",
        "tools": json.dumps([
            "list_calendar_events", "create_calendar_event", "update_calendar_event",
            "check_availability",
            "crm_search_contacts", "crm_get_contact", "crm_add_note", "crm_log_activity",
            "create_task", "list_tasks", "set_reminder",
            "get_current_time", "parse_relative_date",
        ]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\U0001F4C5",
        "personality": "Friendly and proactive. Always suggests agendas and follow-ups. Hates unproductive meetings and gently nudges people to stay on track.",
    },
    {
        "name": "@research-agent",
        "description": "Searches workspace messages, knowledge, and team info. Mention @research-agent to find past conversations, look up team members, or create tasks from findings.",
        "system_prompt": (
            "You are the Research Agent for SquareUp Comms. You help the team find "
            "information across workspace messages, channels, and knowledge base. You can "
            "search conversations, look up team member profiles, and create tasks from your findings. "
            "Always cite the source channel or message when presenting search results."
        ),
        "model": "gemini-2.5-flash-lite",
        "tools": json.dumps([
            "search_workspace", "search_messages", "list_channels",
            "get_channel_info", "list_team_members", "get_user_profile",
            "create_task", "list_tasks", "get_current_time",
        ]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\U0001F50D",
        "personality": "Technical and to-the-point. Uses developer lingo. Formats everything neatly with markdown. Occasionally drops a programming joke.",
    },
    {
        "name": "@scheduler-agent",
        "description": "Manages team schedules, sets reminders, and checks availability. Mention @scheduler-agent to find open slots, book time, or set up recurring events.",
        "system_prompt": (
            "You are the Scheduler Agent for SquareUp Comms. You help coordinate team "
            "schedules by checking availability, creating calendar events, setting reminders, "
            "and finding optimal meeting times across time zones. Always confirm bookings and "
            "send reminders before events."
        ),
        "model": "gemini-2.5-flash-lite",
        "tools": json.dumps([
            "list_calendar_events", "create_calendar_event", "update_calendar_event",
            "check_availability",
            "set_reminder", "list_reminders", "cancel_reminder",
            "create_task", "list_tasks", "update_task", "complete_task", "assign_task",
            "list_team_members", "get_user_status",
            "get_current_time", "parse_relative_date", "calculate_date",
        ]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\u23f0",
        "personality": "Punctual and detail-oriented. Never misses a deadline. Speaks in short, efficient sentences. Obsessed with time management and productivity.",
    },
]


@router.post("/seed", response_model=List[AgentResponse])
async def seed_prebuilt_agents(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> list[Agent]:
    """Create the 4 pre-built agents if they don't already exist."""

    created: list[Agent] = []

    for agent_data in PREBUILT_AGENTS:
        # Check if an agent with this name already exists
        stmt = select(Agent).where(Agent.name == agent_data["name"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Update key fields if they changed (model, tools, system_prompt)
            changed = False
            for field in ("model", "tools", "system_prompt"):
                new_val = agent_data.get(field)
                if new_val and getattr(existing, field) != new_val:
                    setattr(existing, field, new_val)
                    changed = True
            if changed:
                session.add(existing)
                await session.flush()
                await session.refresh(existing)
            created.append(existing)
            continue

        agent = Agent(
            **agent_data,
            created_by=user_id,
        )
        session.add(agent)
        await session.flush()
        await session.refresh(agent)
        created.append(agent)

    await session.commit()
    return created


# ---------------------------------------------------------------------------
# Tool cache stats (diagnostic)
# ---------------------------------------------------------------------------

@router.get("/tool-cache/stats")
async def get_tool_cache_stats(
    user_id: str = Depends(get_current_user),  # noqa: ARG001
) -> dict:
    """Return tool-result cache statistics."""
    from app.services.tools.tool_cache import cache_stats
    return cache_stats()
