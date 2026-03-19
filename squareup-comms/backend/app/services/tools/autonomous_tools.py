"""Autonomous CRM tools — next actions, smart search, deal forecast, email drafting."""

from __future__ import annotations

from app.core.db import async_session
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def _handle_suggest_next_actions(inp: dict, ctx: ToolContext) -> ToolResult:
    """Return AI-prioritized next actions — pending reviews, overdue tasks, missed follow-ups."""
    from datetime import datetime

    from sqlmodel import select

    from app.models.automation_log import AutomationLog
    from app.models.crm import CRMContact
    from app.models.tasks import Task

    try:
        async with async_session() as session:
            now = datetime.utcnow()

            pending_q = await session.execute(
                select(AutomationLog)
                .where(AutomationLog.status == "pending_review")
                .limit(5)
            )
            pending_logs = list(pending_q.scalars().all())

            tasks_q = await session.execute(
                select(Task).where(
                    Task.assigned_to == ctx.user_id,
                    Task.status.in_(["todo", "in_progress"]),
                    Task.due_date < now,
                ).limit(5)
            )
            overdue_tasks = list(tasks_q.scalars().all())

            followup_q = await session.execute(
                select(CRMContact).where(
                    CRMContact.owner_id == ctx.user_id,
                    CRMContact.next_follow_up_at.isnot(None),
                    CRMContact.next_follow_up_at < now,
                ).limit(5)
            )
            followup_contacts = list(followup_q.scalars().all())

        actions = []
        for log in pending_logs:
            actions.append({
                "priority": "high",
                "type": "review_required",
                "title": f"Review AI action: {log.action_type.replace('_', ' ')}",
                "description": log.ai_reasoning or f"Low-confidence action for {log.entity_name} needs approval",
                "entity_id": log.id,
                "entity_type": "automation_log",
            })
        for task in overdue_tasks:
            due_str = task.due_date.strftime("%b %d") if task.due_date else "unknown"
            actions.append({
                "priority": "high",
                "type": "overdue_task",
                "title": f"Overdue task: {task.title}",
                "description": f"Due {due_str}",
                "entity_id": task.id,
                "entity_type": "task",
            })
        for contact in followup_contacts:
            due_str = (
                contact.next_follow_up_at.strftime("%b %d")
                if contact.next_follow_up_at
                else "recently"
            )
            actions.append({
                "priority": "medium",
                "type": "missed_followup",
                "title": f"Follow up with {contact.name}",
                "description": f"Follow-up was due {due_str}",
                "entity_id": contact.id,
                "entity_type": "contact",
            })

        return ToolResult(success=True, output={
            "next_actions": actions,
            "total": len(actions),
            "pending_reviews": len(pending_logs),
            "overdue_tasks": len(overdue_tasks),
            "missed_followups": len(followup_contacts),
        })
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


async def _handle_smart_search(inp: dict, ctx: ToolContext) -> ToolResult:
    """Semantic CRM search across contacts and deals."""
    query = inp.get("query", "").strip()
    entity_types = inp.get("entity_types", ["contacts", "deals"])
    limit = min(int(inp.get("limit", 10)), 30)

    if not query:
        return ToolResult(success=False, error="query is required")

    from sqlmodel import or_, select

    from app.models.crm import CRMContact
    from app.models.crm_deal import CRMDeal

    results: list[dict] = []
    try:
        async with async_session() as session:
            if "contacts" in entity_types:
                contacts_q = await session.execute(
                    select(CRMContact).where(
                        or_(
                            CRMContact.name.ilike(f"%{query}%"),
                            CRMContact.email.ilike(f"%{query}%"),
                            CRMContact.company.ilike(f"%{query}%"),
                        )
                    ).limit(limit)
                )
                for c in contacts_q.scalars().all():
                    results.append({
                        "type": "contact",
                        "id": c.id,
                        "name": c.name,
                        "email": c.email,
                        "company": c.company,
                        "stage": c.lifecycle_stage,
                    })

            if "deals" in entity_types:
                deals_q = await session.execute(
                    select(CRMDeal).where(
                        or_(
                            CRMDeal.title.ilike(f"%{query}%"),
                            CRMDeal.stage.ilike(f"%{query}%"),
                        )
                    ).limit(limit)
                )
                for d in deals_q.scalars().all():
                    results.append({
                        "type": "deal",
                        "id": d.id,
                        "title": d.title,
                        "stage": d.stage,
                        "value": d.value,
                        "status": d.status,
                    })

        return ToolResult(success=True, output={
            "results": results,
            "total": len(results),
            "query": query,
        })
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


async def _handle_forecast_deal(inp: dict, ctx: ToolContext) -> ToolResult:
    """Forecast deal close probability and risk using AI deal risk service."""
    deal_id = inp.get("deal_id", "").strip()
    if not deal_id:
        return ToolResult(success=False, error="deal_id is required")

    from sqlmodel import select

    from app.core.background import BackgroundTaskManager
    from app.core.events import EventBus
    from app.models.crm_deal import CRMDeal
    from app.services.ai.deal_risk import DealRiskService

    try:
        async with async_session() as session:
            result = await session.execute(select(CRMDeal).where(CRMDeal.id == deal_id))
            deal = result.scalars().first()
            if deal is None:
                return ToolResult(success=False, error=f"Deal '{deal_id}' not found")

            svc = DealRiskService(
                session=session,
                events=EventBus(),
                background=BackgroundTaskManager(),
            )
            risk = await svc.assess(deal_id)

        return ToolResult(success=True, output={
            "deal_id": deal_id,
            "deal_title": deal.title,
            "stage": deal.stage,
            "value": deal.value,
            "risk_level": risk.level if hasattr(risk, "level") else "unknown",
            "close_probability": risk.close_probability if hasattr(risk, "close_probability") else None,
            "risk_factors": risk.factors if hasattr(risk, "factors") else [],
            "recommendation": risk.recommendation if hasattr(risk, "recommendation") else "",
        })
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


async def _handle_draft_email(inp: dict, ctx: ToolContext) -> ToolResult:
    """Draft a professional email to a contact or about a deal using AI."""
    contact_id = inp.get("contact_id", "").strip()
    deal_id = inp.get("deal_id", "").strip()
    purpose = inp.get("purpose", "follow-up").strip()
    tone = inp.get("tone", "professional").strip()

    if not contact_id and not deal_id:
        return ToolResult(success=False, error="Either contact_id or deal_id is required")

    from sqlmodel import select

    from app.models.crm import CRMContact
    from app.models.crm_deal import CRMDeal

    context_parts: list[str] = []
    try:
        async with async_session() as session:
            if contact_id:
                c_result = await session.execute(
                    select(CRMContact).where(CRMContact.id == contact_id)
                )
                contact = c_result.scalars().first()
                if contact:
                    context_parts.append(
                        f"Contact: {contact.name}, {contact.email or 'no email'}, "
                        f"{contact.company or 'no company'}, stage: {contact.lifecycle_stage}"
                    )

            if deal_id:
                d_result = await session.execute(
                    select(CRMDeal).where(CRMDeal.id == deal_id)
                )
                deal = d_result.scalars().first()
                if deal:
                    value_str = f"${deal.value:,.0f}" if deal.value else "no value set"
                    context_parts.append(
                        f"Deal: {deal.title}, stage: {deal.stage}, value: {value_str}"
                    )

        if not context_parts:
            return ToolResult(success=False, error="Could not find the specified contact or deal")

        from app.services.llm_service import get_llm_client, llm_available

        if not llm_available():
            return ToolResult(success=True, output={
                "subject": f"Following up — {purpose}",
                "body": f"Hi,\n\nI wanted to reach out regarding {purpose}.\n\nBest regards",
                "note": "LLM not available — template used",
            })

        client = get_llm_client("claude-sonnet-4-6")
        context_str = "\n".join(context_parts)
        prompt = (
            f"Draft a {tone} email for the following CRM context:\n{context_str}\n"
            f"Purpose: {purpose}\n\n"
            'Return ONLY valid JSON: {"subject": "...", "body": "..."}'
        )
        raw = await client.chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.7,
        )

        from app.services.llm_service import parse_llm_json

        parsed = parse_llm_json(raw) if raw else {}
        return ToolResult(success=True, output={
            "subject": parsed.get("subject", f"Following up — {purpose}"),
            "body": parsed.get("body", "Could not generate email body"),
        })
    except Exception as exc:
        return ToolResult(success=False, error=str(exc))


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="ai_suggest_next_actions",
        display_name="Suggest Next Actions",
        description=(
            "Get AI-prioritized list of next actions — pending automation reviews, "
            "overdue tasks, and missed follow-ups — sorted by urgency."
        ),
        category="ai_autonomous",
        input_schema={"type": "object", "properties": {}},
        handler=_handle_suggest_next_actions,
    ))

    registry.register_builtin(ToolDefinition(
        name="ai_smart_search",
        display_name="Smart CRM Search",
        description="Search across CRM contacts and deals using a natural language query.",
        category="ai_autonomous",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query (name, company, topic)"},
                "entity_types": {
                    "type": "array",
                    "items": {"type": "string", "enum": ["contacts", "deals"]},
                    "description": "Entity types to search (default: contacts and deals)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results per type (default 10, max 30)",
                },
            },
            "required": ["query"],
        },
        handler=_handle_smart_search,
    ))

    registry.register_builtin(ToolDefinition(
        name="ai_forecast_deal",
        display_name="Forecast Deal",
        description=(
            "AI forecast of a deal's close probability, risk level, and recommended "
            "actions to accelerate it."
        ),
        category="ai_autonomous",
        input_schema={
            "type": "object",
            "properties": {
                "deal_id": {"type": "string", "description": "The deal ID to forecast"},
            },
            "required": ["deal_id"],
        },
        handler=_handle_forecast_deal,
    ))

    registry.register_builtin(ToolDefinition(
        name="ai_draft_email",
        display_name="Draft Email",
        description=(
            "Draft a professional email to a contact or about a deal using AI, "
            "with customizable tone and purpose."
        ),
        category="ai_autonomous",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {
                    "type": "string",
                    "description": "Contact ID to write to (optional if deal_id provided)",
                },
                "deal_id": {
                    "type": "string",
                    "description": "Deal ID for context (optional if contact_id provided)",
                },
                "purpose": {
                    "type": "string",
                    "description": "Purpose of the email (e.g. 'follow-up', 'proposal', 'check-in')",
                },
                "tone": {
                    "type": "string",
                    "enum": ["professional", "friendly", "formal", "casual"],
                    "description": "Email tone (default: professional)",
                },
            },
        },
        handler=_handle_draft_email,
    ))
