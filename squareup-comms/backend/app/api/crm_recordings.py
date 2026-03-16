"""CRM Recordings API — upload, transcribe, and manage call recordings."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Depends, Form, Query, UploadFile, File, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_recording_service
from app.services.crm_recording_service import RecordingService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-recordings"])


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------


class TranscriptSegmentSchema(BaseModel):
    speaker: str
    text: str
    start_ms: int
    end_ms: int
    confidence: float


class ActionItemSchema(BaseModel):
    text: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    is_completed: bool = False


class KeyTopicSchema(BaseModel):
    topic: str
    relevance_score: float


class ObjectionSchema(BaseModel):
    text: str
    context: str
    resolved: bool = False


class RecordingResponse(BaseModel):
    id: str
    contact_id: str
    deal_id: Optional[str] = None
    calendar_event_id: Optional[str] = None
    title: str
    duration_seconds: int
    file_url: str
    file_size_bytes: int
    transcript: Optional[str] = None
    transcript_segments: List[TranscriptSegmentSchema] = Field(default_factory=list)
    ai_summary: Optional[str] = None
    ai_action_items: List[ActionItemSchema] = Field(default_factory=list)
    ai_sentiment: Optional[str] = None
    ai_key_topics: List[KeyTopicSchema] = Field(default_factory=list)
    ai_objections: List[ObjectionSchema] = Field(default_factory=list)
    ai_next_steps: List[str] = Field(default_factory=list)
    transcription_status: str
    created_by: Optional[str] = None
    created_at: str


def _safe_json(raw: str | None, fallback: Any = None) -> Any:
    """Parse a JSON string safely, returning fallback on failure."""
    if not raw:
        return fallback if fallback is not None else []
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return fallback if fallback is not None else []


def _to_response(rec: Any) -> dict[str, Any]:
    """Convert a CRMCallRecording model to a response dict with parsed JSON fields."""
    return RecordingResponse(
        id=rec.id,
        contact_id=rec.contact_id,
        deal_id=rec.deal_id,
        calendar_event_id=rec.calendar_event_id,
        title=rec.title,
        duration_seconds=rec.duration_seconds,
        file_url=rec.file_url,
        file_size_bytes=rec.file_size_bytes,
        transcript=rec.transcript,
        transcript_segments=_safe_json(rec.transcript_segments),
        ai_summary=rec.ai_summary,
        ai_action_items=_safe_json(rec.ai_action_items),
        ai_sentiment=rec.ai_sentiment,
        ai_key_topics=_safe_json(rec.ai_key_topics),
        ai_objections=_safe_json(rec.ai_objections),
        ai_next_steps=_safe_json(rec.ai_next_steps),
        transcription_status=rec.transcription_status,
        created_by=rec.created_by,
        created_at=rec.created_at.isoformat(),
    ).model_dump()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/recordings/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a call recording",
)
async def upload_recording(
    file: UploadFile = File(...),
    contact_id: str = Form(...),
    deal_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    duration_seconds: int = Form(0),
    calendar_event_id: Optional[str] = Form(None),
    svc: RecordingService = Depends(get_recording_service),
    user_id: str = Depends(get_current_user),
):
    """Upload a recording file and create a recording record.

    In production this would upload to cloud storage.
    In dev/mock mode, stores a local reference.
    """
    try:
        recording = await svc.upload_recording(
            file=file,
            contact_id=contact_id,
            deal_id=deal_id,
            title=title,
            duration_seconds=duration_seconds,
            calendar_event_id=calendar_event_id,
            created_by=user_id,
        )
    except ValueError as exc:
        raise ApiError(status_code=400, detail=str(exc))
    return success_response(data=_to_response(recording))


@router.get(
    "/recordings/{recording_id}",
    summary="Get a recording by ID",
)
async def get_recording(
    recording_id: str,
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    recording = await svc.get_recording(recording_id)
    if recording is None:
        raise ApiError(status_code=404, detail="Recording not found")
    return success_response(data=_to_response(recording))


@router.post(
    "/recordings/{recording_id}/transcribe",
    summary="Trigger transcription for a recording",
)
async def trigger_transcription(
    recording_id: str,
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    recording = await svc.trigger_transcription(recording_id)
    if recording is None:
        raise ApiError(status_code=404, detail="Recording not found")
    return success_response(data=_to_response(recording))


@router.get(
    "/recordings/{recording_id}/transcript",
    summary="Get transcript for a recording",
)
async def get_transcript(
    recording_id: str,
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    recording = await svc.get_recording(recording_id)
    if recording is None:
        raise ApiError(status_code=404, detail="Recording not found")
    if recording.transcription_status != "completed":
        raise ApiError(status_code=400, detail="Transcription not yet completed")

    return success_response(data={
        "transcript": recording.transcript,
        "segments": _safe_json(recording.transcript_segments),
    })


@router.get(
    "/recordings/{recording_id}/action-items",
    summary="Get action items from a recording",
)
async def get_action_items(
    recording_id: str,
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    recording = await svc.get_recording(recording_id)
    if recording is None:
        raise ApiError(status_code=404, detail="Recording not found")

    return success_response(data={
        "action_items": _safe_json(recording.ai_action_items),
    })


@router.patch(
    "/recordings/{recording_id}/action-items/{item_index}",
    summary="Toggle an action item's completion status",
)
async def toggle_action_item(
    recording_id: str,
    item_index: int,
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    recording = await svc.toggle_action_item(recording_id, item_index)
    if recording is None:
        raise ApiError(status_code=404, detail="Recording or action item not found")
    return success_response(data=_to_response(recording))


@router.get(
    "/contacts/{contact_id}/recordings",
    summary="List recordings for a contact",
)
async def get_contact_recordings(
    contact_id: str,
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    result = await svc.get_recordings_for_contact(
        contact_id=contact_id,
        cursor=cursor,
        limit=limit,
    )
    return success_response(
        data=[_to_response(r) for r in result.items],
        meta={
            "next_cursor": result.next_cursor,
            "has_more": result.has_more,
            "total": result.total,
        },
    )


@router.get(
    "/recordings/{recording_id}/summary",
    summary="Get AI summary for a recording",
)
async def get_recording_summary(
    recording_id: str,
    svc: RecordingService = Depends(get_recording_service),
    _user_id: str = Depends(get_current_user),
):
    recording = await svc.get_recording(recording_id)
    if recording is None:
        raise ApiError(status_code=404, detail="Recording not found")
    if recording.transcription_status != "completed":
        raise ApiError(status_code=400, detail="Transcription not yet completed")

    return success_response(data={
        "summary": recording.ai_summary,
        "sentiment": recording.ai_sentiment,
        "key_topics": _safe_json(recording.ai_key_topics),
        "objections": _safe_json(recording.ai_objections),
        "next_steps": _safe_json(recording.ai_next_steps),
    })
