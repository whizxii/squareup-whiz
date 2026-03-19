"""Drive file management API routes — Supabase Storage backend."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.models.files import File

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/drive", tags=["drive"])

BUCKET = "drive-files"


def _storage_url(path: str) -> str:
    """Build the Supabase Storage REST URL for a given object path."""
    base = (settings.SUPABASE_URL or "").rstrip("/")
    return f"{base}/storage/v1/object/{BUCKET}/{path}"


def _storage_headers(content_type: str = "application/octet-stream") -> dict[str, str]:
    """Headers for authenticated Supabase Storage requests."""
    return {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_KEY or "",
        "Content-Type": content_type,
    }


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class FileResponse_(BaseModel):
    id: str
    name: str
    storage_path: str
    mime_type: Optional[str]
    size_bytes: Optional[int]
    folder: str
    thumbnail_url: Optional[str]
    channel_id: Optional[str]
    message_id: Optional[str]
    contact_id: Optional[str]
    agent_id: Optional[str]
    uploaded_by: Optional[str]
    uploaded_by_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=FileResponse_,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    file: UploadFile,
    folder: str = "/",
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> File:
    """Upload a file to Supabase Storage and create a DB record."""

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage backend not configured.",
        )

    file_uuid = str(uuid.uuid4())
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    object_path = f"{user_id}/{file_uuid}_{safe_name}"

    content = await file.read()
    size_bytes = len(content)
    content_type = file.content_type or "application/octet-stream"

    # Upload to Supabase Storage
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            _storage_url(object_path),
            content=content,
            headers=_storage_headers(content_type),
        )

    if resp.status_code not in (200, 201):
        logger.error("Supabase Storage upload failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to upload file to storage.",
        )

    record = File(
        name=safe_name,
        storage_path=object_path,
        mime_type=content_type,
        size_bytes=size_bytes,
        folder=folder,
        uploaded_by=user_id,
        uploaded_by_type="user",
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/files", response_model=list[FileResponse_])
async def list_files(
    folder: Optional[str] = None,
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> list[File]:
    """List files for the current user, optionally filtered by folder or search term."""

    stmt = select(File).where(File.uploaded_by == user_id)

    if folder and folder != "/":
        stmt = stmt.where(File.folder == folder)

    if search:
        stmt = stmt.where(File.name.ilike(f"%{search}%"))

    stmt = stmt.order_by(File.created_at.desc())

    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/files/{file_id}", response_model=FileResponse_)
async def get_file(
    file_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> File:
    """Get file metadata by ID."""

    record = await session.get(File, file_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found.",
        )

    if record.uploaded_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this file.",
        )

    return record


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Response:
    """Download a file from Supabase Storage."""

    record = await session.get(File, file_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found.",
        )

    if record.uploaded_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this file.",
        )

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage backend not configured.",
        )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(
            _storage_url(record.storage_path),
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_KEY or "",
            },
        )

    if resp.status_code != 200:
        logger.error("Supabase Storage download failed: %s", resp.status_code)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage.",
        )

    return Response(
        content=resp.content,
        media_type=record.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{record.name}"',
        },
    )


@router.delete(
    "/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_file(
    file_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> None:
    """Delete a file from Supabase Storage and DB. Only the owner can delete."""

    record = await session.get(File, file_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found.",
        )

    if record.uploaded_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the file owner can delete this file.",
        )

    # Remove from Supabase Storage
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.delete(
                    _storage_url(record.storage_path),
                    headers={
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                        "apikey": settings.SUPABASE_SERVICE_KEY or "",
                    },
                )
        except httpx.HTTPError:
            logger.warning("Failed to delete file from storage: %s", record.storage_path)

    await session.delete(record)
    await session.commit()
