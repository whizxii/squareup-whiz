"""LiveKit token generation and room management."""

from __future__ import annotations

from livekit.api import AccessToken, VideoGrants

from app.core.config import settings


class LiveKitService:
    """Thin wrapper around LiveKit server-side SDK."""

    @property
    def is_configured(self) -> bool:
        return bool(settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET)

    def create_token(
        self,
        *,
        room_name: str,
        participant_identity: str,
        participant_name: str | None = None,
    ) -> str:
        """Generate a JWT token that allows a participant to join a room."""
        if not self.is_configured:
            raise RuntimeError(
                "LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET."
            )

        token = AccessToken(
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        token.identity = participant_identity
        token.name = participant_name or participant_identity

        grant = VideoGrants(
            room_join=True,
            room=room_name,
        )
        token.video_grant = grant

        return token.to_jwt()


livekit_service = LiveKitService()
