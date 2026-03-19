"""Agent built-in tools — list agents and invoke agent-to-agent handoff."""

from __future__ import annotations

from sqlmodel import select

from app.core.db import async_session
from app.models.agents import Agent
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


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
