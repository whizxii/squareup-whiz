"""CRM AI Intelligence API — enrichment, scoring, risk, copilot, and insights."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, col

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.crm import CRMContact
from app.models.crm_deal import CRMDeal
from app.models.tasks import Task
from app.api.deps import (
    get_contact_enrichment_service,
    get_lead_scoring_service,
    get_relationship_strength_service,
    get_deal_risk_service,
    get_meeting_prep_service,
    get_next_actions_service,
    get_copilot_service,
    get_morning_briefing_service,
    get_email_draft_service,
)
from app.services.ai.contact_enrichment import ContactEnrichmentService
from app.services.ai.lead_scoring import LeadScoringService
from app.services.ai.relationship_strength import RelationshipStrengthService
from app.services.ai.deal_risk import DealRiskService
from app.services.ai.meeting_prep import MeetingPrepService
from app.services.ai.next_actions import NextActionsService
from app.services.ai.copilot import CopilotService
from app.services.ai.morning_briefing import MorningBriefingService
from app.services.ai.email_draft_service import EmailDraftService

router = APIRouter(prefix="/api/crm/v2/ai", tags=["crm-ai"])


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------


class CopilotQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    history: list[dict[str, Any]] | None = None


class EmailDraftRequest(BaseModel):
    trigger: str = Field(..., description="meeting_completed | deal_advanced | contact_cold")
    contact_id: str
    deal_id: str | None = None
    extra_context: dict[str, Any] | None = None


class SuggestFieldsRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    company: str | None = None


# ---------------------------------------------------------------------------
# AI Suggest Fields (pre-creation enrichment)
# ---------------------------------------------------------------------------


@router.post("/suggest-fields", dependencies=[Depends(get_current_user)])
async def suggest_fields(body: SuggestFieldsRequest):
    """Suggest autofill fields for a new contact based on partial data (name/email/company).

    Uses LLM to infer likely company, title, and other fields from minimal input.
    Returns quickly — best-effort suggestions, empty dict if LLM unavailable.
    """
    from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

    if not llm_available():
        return success_response(data={})

    parts = []
    if body.name:
        parts.append(f"Name: {body.name}")
    if body.email:
        parts.append(f"Email: {body.email}")
    if body.company:
        parts.append(f"Company: {body.company}")

    if not parts:
        return success_response(data={})

    prompt = (
        "Given partial contact info, suggest plausible professional fields.\n\n"
        + "\n".join(parts)
        + "\n\nReturn ONLY valid JSON with suggested fields (omit any you can't infer):\n"
        '{"company": "", "title": "", "source": "", "tags": [""], '
        '"notes": "brief professional context"}'
    )

    try:
        client = get_llm_client()
        response = await client.chat(
            messages=[{"role": "user", "content": prompt}],
            system=(
                "You are a CRM data assistant. Infer professional details from partial contact info. "
                "If the email domain reveals the company, use it. Return minimal JSON — only fields you "
                "can reasonably infer. Be concise. Max 50 words for notes."
            ),
            max_tokens=300,
            temperature=0.3,
        )
        parsed = parse_llm_json(response)
        return success_response(data=parsed or {})
    except Exception:
        return success_response(data={})


# ---------------------------------------------------------------------------
# Contact Enrichment
# ---------------------------------------------------------------------------


@router.post("/enrich/{contact_id}", dependencies=[Depends(get_current_user)])
async def enrich_contact(
    contact_id: str,
    svc: ContactEnrichmentService = Depends(get_contact_enrichment_service),
):
    """Enrich a contact with external data (LinkedIn, company info, etc.)."""
    result = await svc.enrich_contact(contact_id)
    if result is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(data=result)


# ---------------------------------------------------------------------------
# Lead Scoring
# ---------------------------------------------------------------------------


@router.post("/score/batch", dependencies=[Depends(get_current_user)])
async def score_batch(
    svc: LeadScoringService = Depends(get_lead_scoring_service),
):
    """Re-score all non-archived contacts."""
    scored = await svc.score_batch()
    return success_response(data={"scored": scored})


@router.post("/score/{contact_id}", dependencies=[Depends(get_current_user)])
async def score_contact(
    contact_id: str,
    svc: LeadScoringService = Depends(get_lead_scoring_service),
):
    """Score a contact using AI-powered lead scoring."""
    result = await svc.score_contact(contact_id)
    if result is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(data=result)


# ---------------------------------------------------------------------------
# Relationship Strength
# ---------------------------------------------------------------------------


@router.post("/relationship/{contact_id}", dependencies=[Depends(get_current_user)])
async def analyze_relationship(
    contact_id: str,
    svc: RelationshipStrengthService = Depends(get_relationship_strength_service),
):
    """Analyze relationship strength for a contact."""
    result = await svc.analyze_relationship(contact_id)
    if result is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(data=result)


# ---------------------------------------------------------------------------
# Deal Risk Assessment
# ---------------------------------------------------------------------------


@router.post("/deal-risk/{deal_id}", dependencies=[Depends(get_current_user)])
async def assess_deal_risk(
    deal_id: str,
    svc: DealRiskService = Depends(get_deal_risk_service),
):
    """Assess risk for a deal."""
    result = await svc.assess_deal(deal_id)
    if result is None:
        raise ApiError(status_code=404, detail="Deal not found")
    return success_response(data=result)


# ---------------------------------------------------------------------------
# Meeting Prep
# ---------------------------------------------------------------------------


@router.get("/meeting-prep/{event_id}", dependencies=[Depends(get_current_user)])
async def get_meeting_prep(
    event_id: str,
    svc: MeetingPrepService = Depends(get_meeting_prep_service),
):
    """Generate an AI meeting prep briefing for a calendar event."""
    result = await svc.prepare_meeting(event_id)
    if result is None:
        raise ApiError(status_code=404, detail="Event or associated contact not found")
    return success_response(data=result)


# ---------------------------------------------------------------------------
# Next Actions / Follow-up Suggestions
# NOTE: /dashboard must be registered before /{contact_id} to avoid FastAPI
#       treating "dashboard" as a path parameter.
# ---------------------------------------------------------------------------


@router.get("/next-actions/dashboard", dependencies=[Depends(get_current_user)])
async def get_dashboard_actions(
    svc: NextActionsService = Depends(get_next_actions_service),
):
    """Get dashboard-level AI action recommendations."""
    result = await svc.get_dashboard_actions()
    return success_response(data=result)


@router.get("/next-actions/{contact_id}", dependencies=[Depends(get_current_user)])
async def get_next_actions(
    contact_id: str,
    svc: NextActionsService = Depends(get_next_actions_service),
):
    """Get AI-suggested next actions for a contact."""
    result = await svc.get_contact_actions(contact_id)
    if result is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(data=result)


# ---------------------------------------------------------------------------
# AI Copilot
# ---------------------------------------------------------------------------


@router.post("/copilot")
async def ai_copilot(
    body: CopilotQuery,
    user_id: str = Depends(get_current_user),
    svc: CopilotService = Depends(get_copilot_service),
):
    """Natural language CRM assistant with tool-use and conversation history."""
    try:
        result = await svc.ask(body.query, history=body.history, user_id=user_id)
        return success_response(data=result)
    except Exception as exc:
        logger.exception("Copilot endpoint error for query: %s", body.query[:80])
        return success_response(data={
            "type": "error",
            "message": "The AI copilot is temporarily unavailable. Please try again in a moment.",
            "data": None,
        })


# ---------------------------------------------------------------------------
# Morning Briefing
# ---------------------------------------------------------------------------


@router.get("/morning-briefing", dependencies=[Depends(get_current_user)])
async def get_morning_briefing(
    svc: MorningBriefingService = Depends(get_morning_briefing_service),
):
    """Get a personalized morning briefing with attention items and pipeline summary."""
    result = await svc.generate_briefing()
    return success_response(data=result)


# ---------------------------------------------------------------------------
# AI Insights
# ---------------------------------------------------------------------------


@router.get("/insights/at-risk-deals", dependencies=[Depends(get_current_user)])
async def get_at_risk_deals(
    svc: DealRiskService = Depends(get_deal_risk_service),
):
    """Get all open deals with yellow/red health status."""
    from app.api.crm_deals import DealResponse

    deals = await svc.get_at_risk_deals()
    return success_response(
        data=[DealResponse.from_model(d).model_dump(mode="json") for d in deals],
    )


@router.get("/insights/stale-contacts", dependencies=[Depends(get_current_user)])
async def get_stale_contacts(
    svc: NextActionsService = Depends(get_next_actions_service),
):
    """Get contacts with no recent activity (stale > 14 days)."""
    from app.api.crm_contacts import ContactResponse

    contacts = await svc.get_stale_contacts()
    return success_response(
        data=[ContactResponse.from_model(c).model_dump(mode="json") for c in contacts],
    )


@router.get("/insights/hot-leads", dependencies=[Depends(get_current_user)])
async def get_hot_leads(
    svc: NextActionsService = Depends(get_next_actions_service),
):
    """Get contacts with high lead scores (70+)."""
    from app.api.crm_contacts import ContactResponse

    contacts = await svc.get_hot_leads()
    return success_response(
        data=[ContactResponse.from_model(c).model_dump(mode="json") for c in contacts],
    )


# ---------------------------------------------------------------------------
# Attention Items — persistent banner data for relationship decay alerts
# ---------------------------------------------------------------------------

_DEAL_STALE_DAYS = 7
_DEAL_AT_RISK_DAYS = 14
_CONTACT_COLD_DAYS = 14
_TASK_DUE_SOON_HOURS = 24


@router.get("/attention-items", dependencies=[Depends(get_current_user)])
async def get_attention_items(
    session: AsyncSession = Depends(get_session),
):
    """Aggregate at-risk deals, cold contacts, overdue tasks, and missed follow-ups."""
    now = datetime.utcnow()
    items: list[dict[str, Any]] = []

    # 1. Stale / at-risk deals
    stale_cutoff = now - timedelta(days=_DEAL_STALE_DAYS)
    deal_stmt = (
        select(CRMDeal)
        .where(CRMDeal.status == "open", CRMDeal.updated_at < stale_cutoff)
        .order_by(col(CRMDeal.updated_at).asc())
        .limit(20)
    )
    deal_result = await session.execute(deal_stmt)
    for deal in deal_result.scalars().all():
        days_stale = (now - deal.updated_at).days
        is_critical = days_stale >= _DEAL_AT_RISK_DAYS
        value_str = f" (${deal.value:,.0f})" if deal.value else ""
        items.append({
            "id": deal.id,
            "type": "deal_at_risk" if is_critical else "deal_stale",
            "severity": "critical" if is_critical else "warning",
            "title": f"{'At risk' if is_critical else 'Stale'}: {deal.title}{value_str}",
            "description": (
                f"No updates in {days_stale} days — stuck in '{deal.stage}' stage."
            ),
            "entity_type": "deal",
            "entity_id": deal.id,
            "entity_name": deal.title,
            "metadata": {
                "days_stale": days_stale,
                "stage": deal.stage,
                "value": deal.value,
            },
        })

    # 2. Cold contacts
    cold_cutoff = now - timedelta(days=_CONTACT_COLD_DAYS)
    contact_stmt = (
        select(CRMContact)
        .where(
            CRMContact.last_activity_at < cold_cutoff,
            CRMContact.lifecycle_stage.in_(["lead", "mql", "sql", "opportunity"]),
        )
        .order_by(col(CRMContact.last_activity_at).asc())
        .limit(20)
    )
    contact_result = await session.execute(contact_stmt)
    for contact in contact_result.scalars().all():
        days_cold = (now - contact.last_activity_at).days if contact.last_activity_at else 999
        items.append({
            "id": contact.id,
            "type": "contact_cold",
            "severity": "warning",
            "title": f"Cold contact: {contact.name}",
            "description": (
                f"No activity in {days_cold} days ({contact.lifecycle_stage})."
            ),
            "entity_type": "contact",
            "entity_id": contact.id,
            "entity_name": contact.name,
            "metadata": {
                "days_cold": days_cold,
                "lifecycle_stage": contact.lifecycle_stage,
                "lead_score": contact.lead_score,
            },
        })

    # 3. Overdue tasks
    task_stmt = (
        select(Task)
        .where(
            Task.status.in_(["todo", "in_progress"]),
            Task.due_date.isnot(None),  # type: ignore[union-attr]
            Task.due_date < now,
        )
        .order_by(col(Task.due_date).asc())
        .limit(20)
    )
    task_result = await session.execute(task_stmt)
    for task in task_result.scalars().all():
        hours_overdue = int((now - task.due_date).total_seconds() / 3600)
        items.append({
            "id": task.id,
            "type": "task_overdue",
            "severity": "critical" if hours_overdue > _TASK_DUE_SOON_HOURS else "warning",
            "title": f"Overdue: {task.title}",
            "description": f"Overdue by {hours_overdue}h ({task.priority} priority).",
            "entity_type": "task",
            "entity_id": task.id,
            "entity_name": task.title,
            "metadata": {
                "hours_overdue": hours_overdue,
                "priority": task.priority,
                "status": task.status,
            },
        })

    # 4. Missed follow-ups
    followup_stmt = (
        select(CRMContact)
        .where(
            CRMContact.next_follow_up_at.isnot(None),  # type: ignore[union-attr]
            CRMContact.next_follow_up_at < now,
        )
        .order_by(col(CRMContact.next_follow_up_at).asc())
        .limit(20)
    )
    followup_result = await session.execute(followup_stmt)
    for contact in followup_result.scalars().all():
        if contact.last_activity_at and contact.last_activity_at > contact.next_follow_up_at:
            continue
        hours_overdue = int((now - contact.next_follow_up_at).total_seconds() / 3600)
        items.append({
            "id": contact.id,
            "type": "missing_follow_up",
            "severity": "critical" if hours_overdue >= 48 else "warning",
            "title": f"Missed follow-up: {contact.name}",
            "description": (
                f"Follow-up was due {hours_overdue}h ago — no activity logged."
            ),
            "entity_type": "contact",
            "entity_id": contact.id,
            "entity_name": contact.name,
            "metadata": {
                "hours_overdue": hours_overdue,
                "follow_up_at": contact.next_follow_up_at.isoformat(),
            },
        })

    # Sort: critical first, then by type
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    items.sort(key=lambda i: (severity_order.get(i["severity"], 9),))

    return success_response(data={
        "items": items,
        "count": len(items),
        "generated_at": now.isoformat(),
    })


# ---------------------------------------------------------------------------
# Email Auto-Draft
# ---------------------------------------------------------------------------


@router.get("/email-drafts")
async def list_email_drafts(
    contact_id: str | None = None,
    limit: int = 20,
    svc: EmailDraftService = Depends(get_email_draft_service),
    user_id: str = Depends(get_current_user),
):
    """List AI-generated email drafts, optionally filtered by contact."""
    drafts = await svc.list_drafts(contact_id=contact_id, limit=limit)
    return success_response(data=drafts)


@router.post("/email-drafts/generate")
async def generate_email_draft(
    body: EmailDraftRequest,
    svc: EmailDraftService = Depends(get_email_draft_service),
    user_id: str = Depends(get_current_user),
):
    """Generate an AI email draft on demand for a given trigger and contact."""
    draft = await svc.generate_draft(
        trigger=body.trigger,
        contact_id=body.contact_id,
        deal_id=body.deal_id,
        extra_context=body.extra_context,
    )
    if draft is None:
        raise ApiError(status_code=404, detail="Contact not found")
    return success_response(data=draft)
