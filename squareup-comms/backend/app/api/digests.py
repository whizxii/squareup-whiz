"""Digests API — weekly AI-generated team recaps."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, col

from app.core.auth import get_current_user
from app.core.background import BackgroundTaskManager
from app.core.db import get_session
from app.core.events import EventBus
from app.models.digest import Digest
from app.services.ai.digest_service import DigestService

router = APIRouter(prefix="/api/digests", tags=["digests"])


def _serialize_digest(d: Digest) -> dict[str, Any]:
    highlights_raw = d.highlights or "[]"
    stats_raw = d.stats or "{}"
    try:
        highlights = json.loads(highlights_raw)
    except Exception:
        highlights = []
    try:
        stats = json.loads(stats_raw)
    except Exception:
        stats = {}

    return {
        "id": d.id,
        "digest_type": d.digest_type,
        "title": d.title,
        "summary": d.summary,
        "highlights": highlights,
        "stats": stats,
        "week_start": d.week_start.isoformat() if d.week_start else None,
        "week_end": d.week_end.isoformat() if d.week_end else None,
        "is_read": d.is_read,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@router.get("/latest")
async def get_latest_digest(
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return the most recent digest, generating one if none exists."""
    stmt = (
        select(Digest)
        .order_by(col(Digest.created_at).desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()

    if existing:
        return _serialize_digest(existing)

    # No digest yet — generate one now
    svc = DigestService(
        session=session,
        events=EventBus(),
        background=BackgroundTaskManager(),
    )
    digest = await svc.generate_weekly_digest(target_user_id=user)
    return _serialize_digest(digest)


@router.get("")
async def list_digests(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List recent digests, newest first."""
    stmt = (
        select(Digest)
        .order_by(col(Digest.created_at).desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    digests = result.scalars().all()
    return {"digests": [_serialize_digest(d) for d in digests], "total": len(digests)}
