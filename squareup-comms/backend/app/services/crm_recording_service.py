"""Recording service — business logic for CRM call recordings."""

from __future__ import annotations

import asyncio
import os
import re
import uuid
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from app.core.logging_config import get_logger
from app.core.pagination import PaginatedResponse
from app.models.crm_recording import CRMCallRecording
from app.repositories.crm_recording_repo import RecordingRepository
from app.services.ai.call_intelligence import CallIntelligenceService
from app.services.base import BaseService

logger = get_logger(__name__)

# Mock upload directory for development
_MOCK_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings")

# Upload constraints
_MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
_ALLOWED_CONTENT_TYPES = frozenset({
    "audio/mpeg", "audio/wav", "audio/webm", "audio/x-m4a",
    "audio/ogg", "audio/flac", "audio/mp4",
    "video/mp4", "video/webm",
})
_ALLOWED_EXTENSIONS = frozenset({
    ".mp3", ".wav", ".webm", ".m4a", ".ogg", ".flac", ".mp4",
})


def _sanitize_filename(raw: str) -> str:
    """Sanitize a filename: strip path components, remove unsafe chars."""
    # Extract just the filename (no directory traversal)
    name = Path(raw).name
    # Remove anything that's not alphanumeric, dash, underscore, or dot
    name = re.sub(r"[^\w\-.]", "_", name)
    return name or "recording"


class RecordingService(BaseService):
    """Business logic for call recording operations."""

    @property
    def repo(self) -> RecordingRepository:
        return RecordingRepository(self.session)

    @property
    def intelligence(self) -> CallIntelligenceService:
        return CallIntelligenceService(
            self.session, self.events, self.background, self.cache
        )

    async def upload_recording(
        self,
        *,
        file: UploadFile,
        contact_id: str,
        deal_id: str | None = None,
        title: str | None = None,
        duration_seconds: int = 0,
        calendar_event_id: str | None = None,
        created_by: str = "system",
    ) -> CRMCallRecording:
        """Upload a recording file and create a database record.

        In dev mode, saves to local filesystem. In production, would upload
        to cloud storage (Firebase Storage, S3, etc.).
        """
        # Validate content type
        content_type = (file.content_type or "").lower()
        if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Unsupported file type: {content_type}")

        recording_id = str(uuid.uuid4())
        raw_name = file.filename or f"{recording_id}.webm"
        filename = _sanitize_filename(raw_name)

        # Validate extension
        ext = Path(filename).suffix.lower()
        if ext and ext not in _ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file extension: {ext}")

        final_title = title or filename

        # Read file content with size limit
        content = await file.read()
        file_size = len(content)
        if file_size > _MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"File too large ({file_size / (1024 * 1024):.1f} MB). "
                f"Max allowed: {_MAX_FILE_SIZE_BYTES / (1024 * 1024):.0f} MB."
            )

        # File storage — save locally when possible (dev mode).
        # On ephemeral filesystems (Render, etc.) the write may fail;
        # we still create the DB record so the metadata is preserved.
        file_url = f"/uploads/recordings/{recording_id}_{filename}"
        try:
            os.makedirs(_MOCK_UPLOAD_DIR, exist_ok=True)
            file_path = os.path.join(_MOCK_UPLOAD_DIR, f"{recording_id}_{filename}")
            await asyncio.to_thread(Path(file_path).write_bytes, content)
        except OSError:
            logger.warning(
                "File write failed for recording %s (no writable storage); "
                "DB record will still be created.",
                recording_id,
                exc_info=True,
            )

        recording = CRMCallRecording(
            id=recording_id,
            contact_id=contact_id,
            deal_id=deal_id,
            calendar_event_id=calendar_event_id,
            title=final_title,
            duration_seconds=duration_seconds,
            file_url=file_url,
            file_size_bytes=file_size,
            transcription_status="pending",
            created_by=created_by,
        )

        created = await self.repo.create(recording)

        # Emit upload event
        await self.events.emit("recording.uploaded", {
            "recording_id": created.id,
            "contact_id": contact_id,
            "title": final_title,
        })

        logger.info("Recording %s uploaded for contact %s", created.id, contact_id)
        return created

    async def get_recording(self, recording_id: str) -> CRMCallRecording | None:
        """Fetch a single recording by ID."""
        return await self.repo.get_by_id(recording_id)

    async def trigger_transcription(self, recording_id: str) -> CRMCallRecording | None:
        """Trigger transcription for a recording.

        Runs the transcription pipeline via CallIntelligenceService.
        """
        recording = await self.repo.get_by_id(recording_id)
        if recording is None:
            return None

        # Run transcription (in a real app, this would be enqueued as background task)
        result = await self.intelligence.process_recording(recording_id)
        return result

    async def toggle_action_item(
        self,
        recording_id: str,
        item_index: int,
    ) -> CRMCallRecording | None:
        """Toggle completion status of an action item."""
        return await self.intelligence.toggle_action_item(recording_id, item_index)

    async def get_recordings_for_contact(
        self,
        *,
        contact_id: str,
        cursor: str | None = None,
        limit: int = 50,
    ) -> PaginatedResponse[CRMCallRecording]:
        """List recordings for a contact with pagination."""
        return await self.repo.search(
            contact_id=contact_id,
            cursor=cursor,
            limit=limit,
        )
