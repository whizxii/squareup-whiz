"""Shared API dependencies for CRM service injection."""

from __future__ import annotations

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.services.crm_contact_service import ContactService
from app.services.crm_company_service import CompanyService
from app.services.crm_deal_service import DealService
from app.services.crm_email_service import EmailService
from app.services.crm_pipeline_service import PipelineService
from app.services.crm_sequence_service import SequenceService
from app.services.crm_calendar_service import CalendarEventService
from app.services.crm_followup_service import FollowUpService
from app.services.crm_recording_service import RecordingService
from app.services.integrations.gmail_sync import GmailSyncService
from app.services.ai.contact_enrichment import ContactEnrichmentService
from app.services.ai.lead_scoring import LeadScoringService
from app.services.ai.relationship_strength import RelationshipStrengthService
from app.services.ai.deal_risk import DealRiskService
from app.services.ai.meeting_prep import MeetingPrepService
from app.services.ai.next_actions import NextActionsService
from app.services.ai.copilot import CopilotService
from app.services.crm_workflow_engine import WorkflowEngineService
from app.services.crm_smart_list_service import SmartListService
from app.services.crm_analytics_service import AnalyticsService
from app.services.crm_dedup_service import DedupService
from app.services.ai.morning_briefing import MorningBriefingService
from app.services.ai.email_draft_service import EmailDraftService


def _get_infra(request: Request) -> tuple:
    """Extract event bus, background manager, and cache from app state."""
    return (
        request.app.state.event_bus,
        request.app.state.background,
        request.app.state.cache,
    )


def get_event_bus(request: Request):
    """Return the EventBus from app state."""
    return request.app.state.event_bus


def get_background(request: Request):
    """Return the BackgroundTaskManager from app state."""
    return request.app.state.background


def get_cache(request: Request):
    """Return the TTLCache from app state."""
    return request.app.state.cache


async def get_contact_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> ContactService:
    events, background, cache = _get_infra(request)
    return ContactService(session, events, background, cache)


async def get_company_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> CompanyService:
    events, background, cache = _get_infra(request)
    return CompanyService(session, events, background, cache)


async def get_deal_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> DealService:
    events, background, cache = _get_infra(request)
    return DealService(session, events, background, cache)


async def get_email_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> EmailService:
    events, background, cache = _get_infra(request)
    return EmailService(session, events, background, cache)


async def get_pipeline_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> PipelineService:
    events, background, cache = _get_infra(request)
    return PipelineService(session, events, background, cache)


async def get_sequence_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> SequenceService:
    events, background, cache = _get_infra(request)
    return SequenceService(session, events, background, cache)


async def get_calendar_event_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> CalendarEventService:
    events, background, cache = _get_infra(request)
    return CalendarEventService(session, events, background, cache)


async def get_followup_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> FollowUpService:
    events, background, cache = _get_infra(request)
    return FollowUpService(session, events, background, cache)


async def get_recording_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> RecordingService:
    events, background, cache = _get_infra(request)
    return RecordingService(session, events, background, cache)


async def get_gmail_sync_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> GmailSyncService:
    events, background, cache = _get_infra(request)
    return GmailSyncService(session, events, background, cache)


# ─── AI Services ─────────────────────────────────────────────────────


async def get_contact_enrichment_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> ContactEnrichmentService:
    events, background, cache = _get_infra(request)
    return ContactEnrichmentService(session, events, background, cache)


async def get_lead_scoring_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> LeadScoringService:
    events, background, cache = _get_infra(request)
    return LeadScoringService(session, events, background, cache)


async def get_relationship_strength_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> RelationshipStrengthService:
    events, background, cache = _get_infra(request)
    return RelationshipStrengthService(session, events, background, cache)


async def get_deal_risk_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> DealRiskService:
    events, background, cache = _get_infra(request)
    return DealRiskService(session, events, background, cache)


async def get_meeting_prep_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> MeetingPrepService:
    events, background, cache = _get_infra(request)
    return MeetingPrepService(session, events, background, cache)


async def get_next_actions_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> NextActionsService:
    events, background, cache = _get_infra(request)
    return NextActionsService(session, events, background, cache)


async def get_copilot_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> CopilotService:
    events, background, cache = _get_infra(request)
    return CopilotService(session, events, background, cache)


# ─── Phase 7: Workflow + Smart List Services ─────────────────────────


async def get_workflow_engine_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> WorkflowEngineService:
    events, background, cache = _get_infra(request)
    return WorkflowEngineService(session, events, background, cache)


async def get_smart_list_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> SmartListService:
    events, background, cache = _get_infra(request)
    return SmartListService(session, events, background, cache)


# ─── Phase 8: Analytics Service ──────────────────────────────────────


async def get_analytics_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> AnalyticsService:
    events, background, cache = _get_infra(request)
    return AnalyticsService(session, events, background, cache)


# ─── Phase 9: Dedup Service ──────────────────────────────────────────


async def get_dedup_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> DedupService:
    events, background, cache = _get_infra(request)
    return DedupService(session, events, background, cache)


# ─── Phase 10: Morning Briefing ─────────────────────────────────────


async def get_morning_briefing_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> MorningBriefingService:
    events, background, cache = _get_infra(request)
    return MorningBriefingService(session, events, background, cache)


async def get_email_draft_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> EmailDraftService:
    events, background, cache = _get_infra(request)
    return EmailDraftService(session, events, background, cache)


# ─── Note & Tag Services ──────────────────────────────────────────────


async def get_note_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> "NoteService":
    from app.services.crm_note_service import NoteService
    events, background, cache = _get_infra(request)
    return NoteService(session, events, background, cache)


async def get_tag_service(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> "TagService":
    from app.services.crm_tag_service import TagService
    events, background, cache = _get_infra(request)
    return TagService(session, events, background, cache)
