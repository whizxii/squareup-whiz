"""CRM AI Intelligence API — enrichment, scoring, risk, copilot, and insights."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import (
    get_contact_enrichment_service,
    get_lead_scoring_service,
    get_relationship_strength_service,
    get_deal_risk_service,
    get_meeting_prep_service,
    get_next_actions_service,
    get_copilot_service,
)
from app.services.ai.contact_enrichment import ContactEnrichmentService
from app.services.ai.lead_scoring import LeadScoringService
from app.services.ai.relationship_strength import RelationshipStrengthService
from app.services.ai.deal_risk import DealRiskService
from app.services.ai.meeting_prep import MeetingPrepService
from app.services.ai.next_actions import NextActionsService
from app.services.ai.copilot import CopilotService

router = APIRouter(prefix="/api/crm/v2/ai", tags=["crm-ai"])


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------


class CopilotQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    history: list[dict[str, Any]] | None = None


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
    result = await svc.ask(body.query, history=body.history, user_id=user_id)
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
