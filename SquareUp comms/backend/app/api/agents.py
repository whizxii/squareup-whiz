"""AI Agents API routes."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.models.agents import Agent, AgentExecution
from app.services.llm_service import llm_service

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
    trigger_mode: str = Field(default="mention", max_length=20)
    office_x: Optional[int] = None
    office_y: Optional[int] = None
    office_station_icon: Optional[str] = Field(default=None, max_length=10)
    personality: Optional[str] = None


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = Field(default=None, max_length=50)
    tools: Optional[List[str]] = None
    mcp_servers: Optional[List[str]] = None
    trigger_mode: Optional[str] = Field(default=None, max_length=20)
    office_x: Optional[int] = None
    office_y: Optional[int] = None
    office_station_icon: Optional[str] = Field(default=None, max_length=10)
    personality: Optional[str] = None


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
    trigger_mode: str
    schedule_cron: Optional[str]
    personality: Optional[str]
    office_x: Optional[int]
    office_y: Optional[int]
    office_station_icon: Optional[str]
    status: str
    current_task: Optional[str]
    active: bool
    total_executions: int
    total_cost_usd: float
    success_rate: float
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
        trigger_mode=body.trigger_mode,
        office_x=body.office_x,
        office_y=body.office_y,
        office_station_icon=body.office_station_icon,
        personality=body.personality,
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

    update_data = body.model_dump(exclude_unset=True)

    # Serialize list fields to JSON strings for storage
    if "tools" in update_data and update_data["tools"] is not None:
        update_data["tools"] = json.dumps(update_data["tools"])
    if "mcp_servers" in update_data and update_data["mcp_servers"] is not None:
        update_data["mcp_servers"] = json.dumps(update_data["mcp_servers"])

    for field, value in update_data.items():
        setattr(agent, field, value)

    agent.updated_at = datetime.now(timezone.utc)

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

    agent.active = False
    agent.status = "offline"
    agent.updated_at = datetime.now(timezone.utc)

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

    agent.status = body.status
    agent.current_task = body.current_task
    agent.updated_at = datetime.now(timezone.utc)

    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


# ---------------------------------------------------------------------------
# Agent Execution Routes
# ---------------------------------------------------------------------------

@router.post("/{agent_id}/invoke", response_model=ExecutionResponse)
async def invoke_agent(
    agent_id: str,
    body: InvokeRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> AgentExecution:
    """Invoke an agent with a message.

    Sends the user message to the configured LLM (Groq) with the agent's
    system_prompt and records the execution in the database.
    """

    agent = await _get_active_agent(agent_id, session)

    # ── Guard: LLM must be configured ──────────────────────────────
    if not llm_service.available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI agents require a GROQ_API_KEY. "
                "Get one free at https://console.groq.com"
            ),
        )

    start_time = time.monotonic()

    # 1. Set agent status to "thinking"
    agent.status = "thinking"
    agent.current_task = f"Processing message from {user_id}"
    session.add(agent)
    await session.flush()

    # 2. Build messages and call the LLM
    messages: list[dict] = [
        {"role": "system", "content": agent.system_prompt},
        {"role": "user", "content": body.message},
    ]

    exec_status = "success"
    error_message: str | None = None
    error_type: str | None = None
    response_text = ""
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_cost: float | None = None

    try:
        response = await llm_service.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        response_text = response.choices[0].message.content or ""
        input_tokens = getattr(response.usage, "prompt_tokens", None)
        output_tokens = getattr(response.usage, "completion_tokens", None)

        # Rough cost estimate for Groq (adjust rates as needed)
        if input_tokens is not None and output_tokens is not None:
            total_cost = (input_tokens * 0.000003) + (output_tokens * 0.000015)

    except Exception as exc:
        exec_status = "error"
        error_type = type(exc).__name__
        error_message = str(exc)[:500]
        response_text = "Sorry, I encountered an error processing your request."

    elapsed_ms = int((time.monotonic() - start_time) * 1000)

    # 3. Create execution record
    execution = AgentExecution(
        agent_id=agent.id,
        conversation_messages=json.dumps([
            {"role": "system", "content": agent.system_prompt},
            {"role": "user", "content": body.message},
            {"role": "assistant", "content": response_text},
        ]),
        tools_called=json.dumps([]),
        response_text=response_text,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_cost_usd=total_cost,
        duration_ms=elapsed_ms,
        num_tool_calls=0,
        status=exec_status,
        error_message=error_message,
        error_type=error_type,
    )
    session.add(execution)

    # 4. Update agent stats
    agent.total_executions += 1
    if total_cost is not None:
        agent.total_cost_usd += total_cost

    # Recalculate success_rate
    if agent.total_executions > 0:
        success_count_stmt = (
            select(func.count())
            .select_from(AgentExecution)
            .where(
                AgentExecution.agent_id == agent.id,
                AgentExecution.status == "success",
            )
        )
        # Include the current execution (not yet committed) in the count
        pending_success = 1 if exec_status == "success" else 0
        result = await session.execute(success_count_stmt)
        prior_successes = result.scalar_one()
        agent.success_rate = round(
            ((prior_successes + pending_success) / (agent.total_executions)) * 100,
            2,
        )

    # 5. Set agent status back to "idle"
    agent.status = "idle"
    agent.current_task = None
    agent.updated_at = datetime.now(timezone.utc)

    session.add(agent)
    await session.commit()
    await session.refresh(execution)
    return execution


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
