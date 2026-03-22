"""LiveKit token generation, room management, and Egress (recording) control."""

from __future__ import annotations

import os
from typing import Any

from livekit.api import AccessToken, VideoGrants

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Directory where LiveKit Egress stores recordings (local dev)
_EGRESS_OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "uploads", "recordings",
)


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

        token = (
            AccessToken(
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            .with_identity(participant_identity)
            .with_name(participant_name or participant_identity)
            .with_grants(VideoGrants(room_join=True, room=room_name))
        )

        return token.to_jwt()

    # ------------------------------------------------------------------
    # Egress (recording) helpers
    # ------------------------------------------------------------------

    def _get_api(self) -> Any:
        """Lazy-import and return a LiveKitAPI client.

        The ``livekit.api.LiveKitAPI`` class is only available in newer
        versions of ``livekit-api``.  We import lazily so the rest of
        the service works even when Egress is not available.
        """
        try:
            from livekit.api import LiveKitAPI  # type: ignore[attr-defined]
        except ImportError:
            raise RuntimeError(
                "LiveKitAPI class is not available. Upgrade livekit-api to 1.0+."
            )

        livekit_url = settings.LIVEKIT_URL
        # LiveKitAPI needs an HTTP(S) URL, not ws(s)://
        if livekit_url.startswith("ws://"):
            livekit_url = livekit_url.replace("ws://", "http://", 1)
        elif livekit_url.startswith("wss://"):
            livekit_url = livekit_url.replace("wss://", "https://", 1)

        return LiveKitAPI(
            url=livekit_url,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )

    async def start_room_recording(self, room_name: str) -> dict[str, str]:
        """Start a Room Composite Egress recording for *room_name*.

        Returns ``{"egress_id": "<id>"}`` on success.
        """
        if not self.is_configured:
            raise RuntimeError("LiveKit is not configured.")

        try:
            from livekit.protocol.egress import (  # type: ignore[import-untyped]
                EncodedFileOutput,
                EncodedFileType,
                RoomCompositeEgressRequest,
            )
        except ImportError:
            raise RuntimeError(
                "LiveKit Egress protocol classes not available. "
                "Upgrade livekit-api to 1.0+ or install livekit-protocol."
            )

        os.makedirs(_EGRESS_OUTPUT_DIR, exist_ok=True)

        request = RoomCompositeEgressRequest(
            room_name=room_name,
            file=EncodedFileOutput(
                file_type=EncodedFileType.OGG,
                filepath=os.path.join(
                    _EGRESS_OUTPUT_DIR,
                    "{room_name}_{time}.ogg",
                ),
            ),
            audio_only=True,
        )

        api = self._get_api()
        try:
            info = await api.egress.start_room_composite_egress(request)
            egress_id: str = info.egress_id
            logger.info(
                "Started Egress recording %s for room %s", egress_id, room_name,
            )
            return {"egress_id": egress_id}
        finally:
            await api.aclose()

    async def stop_recording(self, egress_id: str) -> dict[str, str]:
        """Stop an active Egress by its ID.

        Returns ``{"egress_id": "<id>", "status": "stopping"}``.
        """
        if not self.is_configured:
            raise RuntimeError("LiveKit is not configured.")

        api = self._get_api()
        try:
            from livekit.protocol.egress import StopEgressRequest  # type: ignore[import-untyped]

            await api.egress.stop_egress(StopEgressRequest(egress_id=egress_id))
            logger.info("Stopped Egress recording %s", egress_id)
            return {"egress_id": egress_id, "status": "stopping"}
        finally:
            await api.aclose()

    def verify_webhook(self, body: bytes, auth_header: str) -> dict | None:
        """Verify a LiveKit webhook signature and return the parsed event.

        Returns ``None`` if verification fails.
        """
        try:
            from livekit.api import WebhookReceiver  # type: ignore[attr-defined]
        except ImportError:
            logger.warning("WebhookReceiver not available — skipping verification")
            return None

        try:
            receiver = WebhookReceiver(
                api_key=settings.LIVEKIT_API_KEY or "",
                api_secret=settings.LIVEKIT_API_SECRET or "",
            )
            event = receiver.receive(body.decode(), auth_header)
            return {
                "event": event.event,
                "egress_info": event.egress_info,
            }
        except Exception:
            logger.exception("LiveKit webhook verification failed")
            return None


livekit_service = LiveKitService()
