"""AI Insight tools — give Donna access to daily briefs, deal coaching, and pipeline reports."""

from __future__ import annotations

from app.core.db import async_session
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def _handle_get_daily_brief(inp: dict, ctx: ToolContext) -> ToolResult:
    """Fetch (or generate) today's daily brief for the current user."""
    from app.core.background import BackgroundTaskManager
    from app.core.events import EventBus
    from app.services.ai.insights_engine import AIInsightsEngine

    try:
        async with async_session() as session:
            engine = AIInsightsEngine(
                session=session,
                events=EventBus(),
                background=BackgroundTaskManager(),
            )
            brief = await engine.generate_daily_brief(ctx.user_id)
        return ToolResult(success=True, output=brief)
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


async def _handle_deal_coaching(inp: dict, ctx: ToolContext) -> ToolResult:
    """Generate AI coaching for a specific deal."""
    deal_id = inp.get("deal_id", "").strip()
    if not deal_id:
        return ToolResult(success=False, error="deal_id is required")

    from app.core.background import BackgroundTaskManager
    from app.core.events import EventBus
    from app.services.ai.insights_engine import AIInsightsEngine

    try:
        async with async_session() as session:
            engine = AIInsightsEngine(
                session=session,
                events=EventBus(),
                background=BackgroundTaskManager(),
            )
            coaching = await engine.generate_deal_coaching(deal_id)
        if coaching is None:
            return ToolResult(success=False, error=f"Deal '{deal_id}' not found")
        return ToolResult(success=True, output=coaching)
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


async def _handle_pipeline_report(inp: dict, ctx: ToolContext) -> ToolResult:
    """Generate a pipeline risk report for all open deals."""
    from app.core.background import BackgroundTaskManager
    from app.core.events import EventBus
    from app.services.ai.insights_engine import AIInsightsEngine

    try:
        async with async_session() as session:
            engine = AIInsightsEngine(
                session=session,
                events=EventBus(),
                background=BackgroundTaskManager(),
            )
            report = await engine.generate_pipeline_risk_report()
        return ToolResult(success=True, output=report)
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


async def _handle_relationship_analysis(inp: dict, ctx: ToolContext) -> ToolResult:
    """Analyze relationship strength for a contact."""
    contact_id = inp.get("contact_id", "").strip()
    if not contact_id:
        return ToolResult(success=False, error="contact_id is required")

    from sqlmodel import select

    from app.core.background import BackgroundTaskManager
    from app.core.events import EventBus
    from app.models.crm import CRMContact
    from app.services.ai.relationship_strength import RelationshipStrengthService

    try:
        async with async_session() as session:
            result = await session.execute(
                select(CRMContact).where(CRMContact.id == contact_id)
            )
            contact = result.scalars().first()
            if contact is None:
                return ToolResult(success=False, error=f"Contact '{contact_id}' not found")

            svc = RelationshipStrengthService(
                session=session,
                events=EventBus(),
                background=BackgroundTaskManager(),
            )
            score = await svc.calculate(contact_id)

        return ToolResult(success=True, output={
            "contact_id": contact_id,
            "contact_name": contact.name,
            "relationship_score": score.score if hasattr(score, "score") else score,
            "level": score.level if hasattr(score, "level") else "unknown",
            "signals": score.signals if hasattr(score, "signals") else [],
        })
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="ai_get_daily_brief",
        display_name="Get Daily Brief",
        description=(
            "Get your AI-generated daily brief with prioritized actions, open deals, "
            "overdue tasks, and missed follow-ups for today."
        ),
        category="ai_insights",
        input_schema={"type": "object", "properties": {}},
        handler=_handle_get_daily_brief,
    ))

    registry.register_builtin(ToolDefinition(
        name="ai_deal_coaching",
        display_name="Deal Coaching",
        description=(
            "Get AI coaching for a specific deal — analysis of current state, risk factors, "
            "and the single most important next action."
        ),
        category="ai_insights",
        input_schema={
            "type": "object",
            "properties": {
                "deal_id": {"type": "string", "description": "The deal ID to get coaching for"},
            },
            "required": ["deal_id"],
        },
        handler=_handle_deal_coaching,
    ))

    registry.register_builtin(ToolDefinition(
        name="ai_pipeline_report",
        display_name="Pipeline Risk Report",
        description=(
            "Generate an AI pipeline risk report analyzing all open deals — "
            "health, concentration risks, stale deals, and recommended actions."
        ),
        category="ai_insights",
        input_schema={"type": "object", "properties": {}},
        handler=_handle_pipeline_report,
    ))

    registry.register_builtin(ToolDefinition(
        name="ai_relationship_analysis",
        display_name="Relationship Analysis",
        description=(
            "Analyze relationship strength with a contact based on interaction history, "
            "communication frequency, and engagement signals."
        ),
        category="ai_insights",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The contact ID to analyze"},
            },
            "required": ["contact_id"],
        },
        handler=_handle_relationship_analysis,
    ))
