"""Agent built-in tools — list agents, invoke (mention-based), and delegate (direct)."""

from __future__ import annotations

import logging

from sqlmodel import select

from app.core.db import async_session
from app.models.agents import Agent
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry

logger = logging.getLogger(__name__)

# Track in-flight delegations to prevent circular loops (agent_id set)
_active_delegations: set[str] = set()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _agent_to_dict(a: Agent) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "description": a.description,
        "status": a.status,
        "trigger_mode": a.trigger_mode,
        "office_station_icon": a.office_station_icon,
        "active": a.active,
    }


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def list_agents(inp: dict, ctx: ToolContext) -> ToolResult:
    """List all active agents in the workspace."""
    include_inactive = inp.get("include_inactive", False)

    async with async_session() as session:
        stmt = select(Agent).order_by(Agent.name)
        if not include_inactive:
            stmt = stmt.where(Agent.active == True)  # noqa: E712
        rows = await session.execute(stmt)
        agents = [_agent_to_dict(a) for a in rows.scalars().all()]

    return ToolResult(success=True, output={"agents": agents, "count": len(agents)})


async def invoke_agent(inp: dict, ctx: ToolContext) -> ToolResult:
    """Hand off a task to another agent by posting a message that mentions them.

    This does NOT directly execute the other agent — it posts a mention message
    in the current channel so the standard WS handler picks it up. This keeps
    the execution flow unified and observable.
    """
    target_agent_id = inp.get("agent_id", "")
    message_text = inp.get("message", "")

    if not target_agent_id:
        return ToolResult(success=False, output=None, error="agent_id is required")
    if not message_text:
        return ToolResult(success=False, output=None, error="message is required")

    async with async_session() as session:
        agent = await session.get(Agent, target_agent_id)
        if not agent:
            return ToolResult(success=False, output=None, error=f"Agent {target_agent_id} not found")
        if not agent.active:
            return ToolResult(success=False, output=None, error=f"Agent '{agent.name}' is inactive")

    # Return handoff instructions — the engine will post this as a mention
    return ToolResult(
        success=True,
        output={
            "handoff": True,
            "target_agent_id": target_agent_id,
            "target_agent_name": agent.name,
            "message": message_text,
            "instruction": f"Post '@{agent.name} {message_text}' in the channel to hand off.",
        },
    )


async def delegate_to_agent(inp: dict, ctx: ToolContext) -> ToolResult:
    """Directly invoke another agent and return their response.

    Unlike ``invoke_agent`` (mention-based handoff), this runs the target
    agent via ``invoke_agent_sync()`` and returns the full response as a tool
    result.  The calling agent can then incorporate the specialist's output
    into its own reply.

    Includes loop prevention: an agent cannot delegate to itself, and
    circular chains (A → B → A) are blocked via ``_active_delegations``.
    """
    target_agent_id = inp.get("agent_id", "")
    task = inp.get("task", "")

    if not target_agent_id:
        return ToolResult(success=False, output=None, error="agent_id is required")
    if not task:
        return ToolResult(success=False, output=None, error="task is required")

    # --- Loop prevention ---
    if target_agent_id == ctx.agent_id:
        return ToolResult(
            success=False, output=None,
            error="Cannot delegate to yourself. Rephrase the task and handle it directly.",
        )
    if target_agent_id in _active_delegations:
        return ToolResult(
            success=False, output=None,
            error=f"Agent {target_agent_id} is already handling a delegation — circular delegation blocked.",
        )

    # Validate target agent
    async with async_session() as session:
        agent = await session.get(Agent, target_agent_id)
        if not agent:
            return ToolResult(success=False, output=None, error=f"Agent {target_agent_id} not found")
        if not agent.active:
            return ToolResult(success=False, output=None, error=f"Agent '{agent.name}' is inactive")

    # Mark as in-flight before invoking
    _active_delegations.add(ctx.agent_id)
    try:
        from app.services.agent_engine import invoke_agent_sync

        result = await invoke_agent_sync(
            agent_id=target_agent_id,
            user_id=ctx.user_id,
            content=task,
            channel_id=ctx.channel_id,
        )
    except Exception as exc:
        logger.error(
            "delegate_to_agent failed: caller=%s target=%s error=%s",
            ctx.agent_id, target_agent_id, exc, exc_info=True,
        )
        return ToolResult(success=False, output=None, error=f"Delegation failed: {str(exc)[:200]}")
    finally:
        _active_delegations.discard(ctx.agent_id)

    # Truncate tool_calls_log to avoid blowing context
    truncated_calls = result.tool_calls_log[:10] if result.tool_calls_log else []

    return ToolResult(
        success=result.status == "success",
        output={
            "agent_name": agent.name,
            "response": result.response_text,
            "tools_used": len(result.tool_calls_log),
            "tool_calls": truncated_calls,
            "status": result.status,
            "duration_ms": result.duration_ms,
        },
        error=result.error_message if result.status != "success" else None,
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="list_agents",
        display_name="List Agents",
        description="List all active AI agents in the workspace. Shows each agent's name, description, and status.",
        category="agents",
        input_schema={
            "type": "object",
            "properties": {
                "include_inactive": {"type": "boolean", "description": "If true, also include inactive agents"},
            },
        },
        handler=list_agents,
    ))

    registry.register_builtin(ToolDefinition(
        name="invoke_agent",
        display_name="Invoke Agent",
        description="Hand off a task to another AI agent. Use this when a request is better handled by a specialist agent.",
        category="agents",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "agent_id": {"type": "string", "description": "The target agent's ID"},
                "message": {"type": "string", "description": "The message/task to hand off to the agent"},
            },
            "required": ["agent_id", "message"],
        },
        handler=invoke_agent,
    ))

    registry.register_builtin(ToolDefinition(
        name="delegate_to_agent",
        display_name="Delegate to Agent",
        description=(
            "Directly invoke a specialist agent and get their response back. "
            "Use this when part of a task is better handled by another agent "
            "(e.g. @crm-agent for deep CRM analysis, @meeting-agent for "
            "calendar tasks, @research-agent for information lookup). "
            "The specialist runs with full tool access and returns their "
            "response so you can incorporate it into your reply."
        ),
        category="agents",
        requires_confirmation=False,
        input_schema={
            "type": "object",
            "properties": {
                "agent_id": {
                    "type": "string",
                    "description": "The target agent's ID. Use list_agents to find available agents.",
                },
                "task": {
                    "type": "string",
                    "description": "The task description for the specialist agent. Be specific about what you need.",
                },
            },
            "required": ["agent_id", "task"],
        },
        handler=delegate_to_agent,
    ))
