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
from app.models.agents import Agent, AgentExecution
from app.services.agent_engine import invoke_agent_sync

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


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    body: AgentUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Agent:
    """Update agent fields. Only provided (non-None) fields are changed."""

    agent = await _get_active_agent(agent_id, session)

    # Allow any team member to update agents (small team workspace)
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

    # Allow any team member to deactivate agents (small team workspace)
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

    # Allow any team member to update agent status (small team workspace)
    _ = user_id  # kept for auth dependency

    agent.status = body.status
    agent.current_task = body.current_task
    agent.updated_at = datetime.utcnow()

    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


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
    )

    return {
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
        "model": "claude-sonnet-4-6",
        "tools": json.dumps([
            "crm_search_contacts", "crm_get_contact", "crm_create_contact",
            "crm_update_contact", "crm_count_contacts", "crm_add_note",
            "crm_list_deals", "crm_create_deal", "crm_update_deal_stage",
            "crm_log_activity", "crm_get_pipeline", "crm_search_companies",
            "list_calendar_events", "create_calendar_event", "check_availability",
            "create_task", "list_tasks", "update_task", "complete_task",
            "assign_task", "set_reminder", "list_reminders",
            "search_messages", "send_channel_message", "draft_email",
            "search_workspace", "search_crm_notes", "get_contact_history",
            "list_team_members", "get_user_profile",
            "list_channels", "get_channel_info",
            "get_deal_metrics", "get_pipeline_summary", "get_contact_stats",
            "get_current_time", "parse_relative_date", "calculate_date",
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
        "model": "claude-sonnet-4-6",
        "tools": json.dumps(["crm_search", "crm_create_contact", "crm_update_contact", "crm_log_activity"]),
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
        "model": "claude-sonnet-4-6",
        "tools": json.dumps(["calendar_read", "calendar_create", "transcribe", "crm_update"]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\U0001F4C5",
        "personality": "Friendly and proactive. Always suggests agendas and follow-ups. Hates unproductive meetings and gently nudges people to stay on track.",
    },
    {
        "name": "@github-agent",
        "description": "Tracks GitHub issues, pull requests, and repository activity. Mention @github-agent to check PR status, create issues, or get repo summaries.",
        "system_prompt": (
            "You are the GitHub Agent for SquareUp Comms. You help the engineering team "
            "track issues, review pull request statuses, and provide repository summaries. "
            "Format code references with backticks and link to relevant PRs or issues when possible."
        ),
        "model": "claude-sonnet-4-6",
        "tools": json.dumps(["github_issues", "github_prs", "github_repos"]),
        "mcp_servers": json.dumps([]),
        "trigger_mode": "mention",
        "office_station_icon": "\U0001F419",
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
        "model": "claude-sonnet-4-6",
        "tools": json.dumps(["calendar_read", "calendar_create", "reminders", "team_availability"]),
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
