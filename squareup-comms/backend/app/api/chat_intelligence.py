"""Chat Intelligence API routes — chat signals and contact chat history."""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col

from app.core.auth import get_current_user
from app.core.db import get_session
from app.models.chat_signal import ChatSignal

router = APIRouter(prefix="/api/chat-intelligence", tags=["chat-intelligence"])


@router.get("/signals/{channel_id}")
async def get_channel_signals(
    channel_id: str,
    signal_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get chat signals for a channel, optionally filtered by type."""
    stmt = select(ChatSignal).where(ChatSignal.channel_id == channel_id)

    if signal_type:
        stmt = stmt.where(ChatSignal.signal_type == signal_type)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    # Fetch page
    stmt = stmt.order_by(col(ChatSignal.created_at).desc()).offset(offset).limit(limit)
    result = await session.execute(stmt)
    signals = result.scalars().all()

    return {
        "signals": [_serialize_signal(s) for s in signals],
        "total": total,
    }


@router.get("/contacts/{contact_id}/chat-mentions")
async def get_contact_chat_mentions(
    contact_id: str,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all chat signals linked to a specific CRM contact."""
    stmt = (
        select(ChatSignal)
        .where(
            ChatSignal.entity_type == "contact",
            ChatSignal.entity_id == contact_id,
        )
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(col(ChatSignal.created_at).desc()).offset(offset).limit(limit)
    result = await session.execute(stmt)
    signals = result.scalars().all()

    return {
        "mentions": [_serialize_signal(s) for s in signals],
        "total": total,
    }


@router.get("/stats")
async def get_intelligence_stats(
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get aggregate stats about chat intelligence processing."""
    total_stmt = select(func.count()).select_from(ChatSignal)
    total = (await session.execute(total_stmt)).scalar() or 0

    processed_stmt = select(func.count()).select_from(
        select(ChatSignal).where(ChatSignal.processed == True).subquery()  # noqa: E712
    )
    processed = (await session.execute(processed_stmt)).scalar() or 0

    # Count by signal type
    type_stmt = (
        select(ChatSignal.signal_type, func.count())
        .group_by(ChatSignal.signal_type)
    )
    type_result = await session.execute(type_stmt)
    by_type = {row[0]: row[1] for row in type_result.all()}

    return {
        "total_signals": total,
        "processed": processed,
        "pending": total - processed,
        "by_type": by_type,
    }


@router.post("/analyze/{channel_id}")
async def analyze_channel_history(
    channel_id: str,
    limit: int = Query(50, ge=1, le=200),
    user: str = Depends(get_current_user),
):
    """Trigger historical analysis of recent messages in a channel."""
    from app.core.db import async_session
    from app.core.events import EventBus

    # Get the ChatIntelligenceService from app state
    # For now, create an ad-hoc instance for manual trigger
    from app.services.ai.chat_intelligence import ChatIntelligenceService

    service = ChatIntelligenceService(
        event_bus=EventBus(),  # Throwaway bus for manual analysis
        session_factory=async_session,
    )

    signal_count = await service.analyze_historical(channel_id, limit=limit)

    return {
        "channel_id": channel_id,
        "messages_analyzed": limit,
        "signals_created": signal_count,
    }


def _serialize_signal(signal: ChatSignal) -> dict:
    """Convert a ChatSignal to API-friendly dict."""
    extracted = signal.extracted_data
    if isinstance(extracted, str):
        try:
            extracted = json.loads(extracted)
        except (json.JSONDecodeError, TypeError):
            extracted = {}

    return {
        "id": signal.id,
        "message_id": signal.message_id,
        "channel_id": signal.channel_id,
        "sender_id": signal.sender_id,
        "signal_type": signal.signal_type,
        "entity_type": signal.entity_type,
        "entity_id": signal.entity_id,
        "confidence": signal.confidence,
        "extracted_data": extracted,
        "ai_reasoning": signal.ai_reasoning,
        "processed": signal.processed,
        "processed_at": signal.processed_at.isoformat() if signal.processed_at else None,
        "created_at": signal.created_at.isoformat() if signal.created_at else None,
    }
