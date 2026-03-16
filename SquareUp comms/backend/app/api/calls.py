"""Voice/video call API routes (LiveKit-backed)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.config import settings
from app.services.livekit_service import livekit_service

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
async def livekit_status() -> dict:
    """Health check — reports whether LiveKit credentials are configured."""
    return {
        "configured": livekit_service.is_configured,
        "livekit_url": settings.LIVEKIT_URL if livekit_service.is_configured else None,
    }
