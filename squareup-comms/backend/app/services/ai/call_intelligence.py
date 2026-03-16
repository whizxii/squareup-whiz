"""Call intelligence service — post-transcription automation and event emission.

Orchestrates the transcription pipeline:
1. Receives a recording ID
2. Delegates transcription to MockTranscriptionService
3. Persists results to the recording record
4. Emits "recording.transcribed" event for activity auto-capture
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from app.core.logging_config import get_logger
from app.models.crm_recording import CRMCallRecording
from app.repositories.crm_recording_repo import RecordingRepository
from app.services.ai.transcription import MockTranscriptionService, serialize_transcription_result
from app.services.base import BaseService

logger = get_logger(__name__)


class CallIntelligenceService(BaseService):
    """Orchestrates transcription and AI analysis for call recordings."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._transcription = MockTranscriptionService()

    @property
    def repo(self) -> RecordingRepository:
        return RecordingRepository(self.session)

    async def process_recording(self, recording_id: str) -> CRMCallRecording | None:
        """Run transcription + AI analysis on a recording.

        Updates the recording in-place with results and emits events.
        Returns the updated recording or None if not found.
        """
        recording = await self.repo.get_by_id(recording_id)
        if recording is None:
            logger.warning("Recording %s not found for transcription", recording_id)
            return None

        if recording.transcription_status == "completed":
            logger.info("Recording %s already transcribed, skipping", recording_id)
            return recording

        # Mark as processing
        recording.transcription_status = "processing"
        recording.updated_at = datetime.now(timezone.utc)
        self.session.add(recording)
        await self.session.commit()

        try:
            # Run transcription (mock)
            tx_result = await self._transcription.transcribe(recording.duration_seconds)
            serialized = serialize_transcription_result(tx_result)

            # Persist results
            recording.transcript = serialized["transcript"]
            recording.transcript_segments = serialized["transcript_segments"]
            recording.ai_summary = serialized["ai_summary"]
            recording.ai_action_items = serialized["ai_action_items"]
            recording.ai_sentiment = serialized["ai_sentiment"]
            recording.ai_key_topics = serialized["ai_key_topics"]
            recording.ai_objections = serialized["ai_objections"]
            recording.ai_next_steps = serialized["ai_next_steps"]
            recording.transcription_status = "completed"
            recording.transcription_error = None
            recording.updated_at = datetime.now(timezone.utc)
            self.session.add(recording)
            await self.session.commit()
            await self.session.refresh(recording)

            # Emit event for activity auto-capture
            await self.events.emit("recording.transcribed", {
                "recording_id": recording.id,
                "contact_id": recording.contact_id,
                "deal_id": recording.deal_id,
                "title": recording.title,
                "duration_seconds": recording.duration_seconds,
                "summary": tx_result.summary,
                "action_item_count": len(tx_result.action_items),
                "sentiment": tx_result.sentiment,
            })

            logger.info("Recording %s transcribed successfully", recording_id)
            return recording

        except Exception as exc:
            logger.error("Transcription failed for recording %s: %s", recording_id, exc)
            # Rollback any partial state before marking as failed
            await self.session.rollback()
            # Re-fetch to get a clean object after rollback
            recording = await self.repo.get_by_id(recording_id)
            if recording is not None:
                recording.transcription_status = "failed"
                recording.transcription_error = str(exc)
                recording.updated_at = datetime.now(timezone.utc)
                self.session.add(recording)
                await self.session.commit()
            return recording

    async def toggle_action_item(
        self,
        recording_id: str,
        item_index: int,
    ) -> CRMCallRecording | None:
        """Toggle the is_completed status of an action item by index."""
        recording = await self.repo.get_by_id(recording_id)
        if recording is None:
            return None

        items = json.loads(recording.ai_action_items)
        if item_index < 0 or item_index >= len(items):
            return None

        # Create new list with toggled item (immutable pattern)
        updated_items = [
            {**item, "is_completed": not item["is_completed"]}
            if i == item_index
            else item
            for i, item in enumerate(items)
        ]

        recording.ai_action_items = json.dumps(updated_items)
        recording.updated_at = datetime.now(timezone.utc)
        self.session.add(recording)
        await self.session.commit()
        await self.session.refresh(recording)
        return recording
