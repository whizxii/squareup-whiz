"""Voice/video call API routes (LiveKit-backed)."""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.logging_config import get_logger
from app.api.deps import get_session, get_event_bus, get_background, get_cache
from app.models.crm_recording import CRMCallRecording
from app.services.ai.call_intelligence import CallIntelligenceService
from app.services.livekit_service import livekit_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/calls", tags=["calls"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str | None = None


class TokenResponse(BaseModel):
    token: str
    livekit_url: str


class RoomResponse(BaseModel):
    room_name: str
    livekit_url: str


class RecordRequest(BaseModel):
    room_name: str
    contact_id: str
    deal_id: str | None = None
    title: str | None = None


class RecordResponse(BaseModel):
    egress_id: str


class StopRecordRequest(BaseModel):
    egress_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/token", response_model=TokenResponse)
async def create_call_token(
    body: TokenRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Generate a LiveKit access token so the user can join a room."""
    if not livekit_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
        )

    token = livekit_service.create_token(
        room_name=body.room_name,
        participant_identity=user_id,
        participant_name=body.participant_name,
    )

    return {"token": token, "livekit_url": settings.LIVEKIT_URL}


@router.post("/rooms", response_model=RoomResponse)
async def create_room(
    body: TokenRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Create (or join) a room and return the connection info."""
    if not livekit_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured.",
        )

    return {"room_name": body.room_name, "livekit_url": settings.LIVEKIT_URL}


@router.get("/status")
async def livekit_status(
    _user_id: str = Depends(get_current_user),
) -> dict:
    """Health check — reports whether LiveKit credentials are configured."""
    return {
        "configured": livekit_service.is_configured,
    }


# ---------------------------------------------------------------------------
# Recording (Egress) routes
# ---------------------------------------------------------------------------

# In-memory map of egress_id → metadata for linking recordings to CRM.
# Replaced by a DB table in production; sufficient for single-process dev.
_egress_metadata: dict[str, dict] = {}


@router.post("/record/start", response_model=RecordResponse)
async def start_recording(
    body: RecordRequest,
    user_id: str = Depends(get_current_user),
) -> dict:
    """Start a LiveKit Egress recording for a room.

    Links the recording to a CRM contact (and optionally a deal) so
    the webhook handler can create a ``CRMCallRecording`` when done.
    """
    if not livekit_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured.",
        )

    try:
        result = await livekit_service.start_room_recording(body.room_name)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    egress_id = result["egress_id"]

    # Stash CRM metadata so the webhook can link the file later
    _egress_metadata[egress_id] = {
        "contact_id": body.contact_id,
        "deal_id": body.deal_id,
        "title": body.title or f"Call recording — {body.room_name}",
        "room_name": body.room_name,
        "created_by": user_id,
    }

    return {"egress_id": egress_id}


@router.post("/record/stop")
async def stop_recording(
    body: StopRecordRequest,
    _user_id: str = Depends(get_current_user),
) -> dict:
    """Stop an active Egress recording."""
    if not livekit_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured.",
        )

    try:
        result = await livekit_service.stop_recording(body.egress_id)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    return result


@router.post("/webhook")
async def livekit_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
    events=Depends(get_event_bus),
    background=Depends(get_background),
    cache=Depends(get_cache),
) -> dict:
    """Receive LiveKit webhook events (e.g. egress_ended).

    When an Egress recording finishes, creates a ``CRMCallRecording``
    and triggers transcription via ``CallIntelligenceService``.
    """
    body = await request.body()
    auth_header = request.headers.get("Authorization", "")

    event_data = livekit_service.verify_webhook(body, auth_header)
    if event_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook")

    event_name = event_data.get("event")
    egress_info = event_data.get("egress_info")

    if event_name != "egress_ended" or egress_info is None:
        return {"ok": True, "handled": False}

    egress_id = getattr(egress_info, "egress_id", None) or ""
    meta = _egress_metadata.pop(egress_id, None)
    if meta is None:
        logger.warning("Egress %s completed but no CRM metadata found", egress_id)
        return {"ok": True, "handled": False}

    # Find the output file
    file_results = getattr(egress_info, "file_results", []) or []
    if not file_results:
        logger.warning("Egress %s completed with no output files", egress_id)
        return {"ok": True, "handled": False}

    filepath = getattr(file_results[0], "filename", "") or ""
    file_size = getattr(file_results[0], "size", 0) or 0
    duration_secs = int(getattr(file_results[0], "duration", 0) / 1_000_000_000)  # ns → s

    # Build a relative URL for the recording
    filename = os.path.basename(filepath)
    file_url = f"/uploads/recordings/{filename}"

    recording_id = str(uuid.uuid4())
    recording = CRMCallRecording(
        id=recording_id,
        contact_id=meta["contact_id"],
        deal_id=meta.get("deal_id"),
        title=meta["title"],
        duration_seconds=duration_secs,
        file_url=file_url,
        file_size_bytes=file_size,
        transcription_status="pending",
        created_by=meta.get("created_by"),
    )

    session.add(recording)
    await session.commit()
    await session.refresh(recording)

    logger.info(
        "Created CRM recording %s from Egress %s", recording_id, egress_id,
    )

    # Trigger transcription in the background
    intel = CallIntelligenceService(session, events, background, cache)
    await intel.process_recording(recording_id)

    return {"ok": True, "handled": True, "recording_id": recording_id}
