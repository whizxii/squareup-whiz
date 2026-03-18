"""Message management API routes."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.db import get_session
from app.models.chat import Message, Reaction
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messages", tags=["messages"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    channel_id: str
    content: Optional[str] = None
    content_html: Optional[str] = None
    attachments: Optional[list[str]] = Field(default_factory=list)
    thread_id: Optional[str] = None
    mentions: Optional[list[Any]] = Field(default_factory=list)


class MessageUpdate(BaseModel):
    content: Optional[str] = None
    content_html: Optional[str] = None


class ReactionCreate(BaseModel):
    emoji: str = Field(..., max_length=10)


class ReactionResponse(BaseModel):
    message_id: str
    user_id: str
    emoji: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    channel_id: str
    sender_id: str
    sender_type: str
    content: Optional[str]
    content_html: Optional[str]
    attachments: Optional[list[str]]
    thread_id: Optional[str]
    reply_count: int
    mentions: Optional[list[str]]
    agent_execution_id: Optional[str]
    edited: bool
    pinned: bool
    created_at: datetime
    updated_at: Optional[datetime]
    reactions: list[ReactionResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @classmethod
    def from_message(cls, message: Message, reactions: list[Reaction] | None = None) -> "MessageResponse":
        """Build a response from a Message ORM instance, deserialising JSON fields."""
        attachments_list: list[str] = []
        if message.attachments:
            try:
                attachments_list = json.loads(message.attachments)
            except (json.JSONDecodeError, TypeError):
                attachments_list = []

        mentions_list: list[str] = []
        if message.mentions:
            try:
                mentions_list = json.loads(message.mentions)
            except (json.JSONDecodeError, TypeError):
                mentions_list = []

        reaction_responses = [
            ReactionResponse.model_validate(r) for r in (reactions or [])
        ]

        return cls(
            id=message.id,
            channel_id=message.channel_id,
            sender_id=message.sender_id,
            sender_type=message.sender_type,
            content=message.content,
            content_html=message.content_html,
            attachments=attachments_list,
            thread_id=message.thread_id,
            reply_count=message.reply_count,
            mentions=mentions_list,
            agent_execution_id=message.agent_execution_id,
            edited=message.edited,
            pinned=message.pinned,
            created_at=message.created_at,
            updated_at=message.updated_at,
            reactions=reaction_responses,
        )


class AISearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    channel_ids: Optional[List[str]] = None


class AISearchResponse(BaseModel):
    answer: str
    referenced_message_ids: List[str] = Field(default_factory=list)


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    has_more: bool


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _fetch_reactions_for_messages(
    session: AsyncSession,
    message_ids: list[str],
) -> dict[str, list[Reaction]]:
    """Fetch reactions grouped by message_id."""
    if not message_ids:
        return {}

    stmt = (
        select(Reaction)
        .where(Reaction.message_id.in_(message_ids))
        .order_by(Reaction.created_at.asc())
    )
    result = await session.execute(stmt)
    reactions = result.scalars().all()

    grouped: dict[str, list[Reaction]] = {}
    for r in reactions:
        grouped.setdefault(r.message_id, []).append(r)
    return grouped


async def _get_message_or_404(
    session: AsyncSession,
    message_id: str,
) -> Message:
    """Return a Message or raise 404."""
    message = await session.get(Message, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )
    return message


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    body: MessageCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> MessageResponse:
    """Send a new message to a channel (or as a thread reply)."""

    message = Message(
        id=str(uuid.uuid4()),
        channel_id=body.channel_id,
        sender_id=user_id,
        sender_type="user",
        content=body.content,
        content_html=body.content_html,
        attachments=json.dumps(body.attachments or []),
        thread_id=body.thread_id,
        mentions=json.dumps(body.mentions or []),
    )
    session.add(message)

    # If this is a thread reply, increment the parent's reply_count
    if body.thread_id:
        parent = await session.get(Message, body.thread_id)
        if parent:
            parent.reply_count += 1
            session.add(parent)

    await session.commit()
    await session.refresh(message)

    # Broadcast to other connected users via WebSocket (non-fatal)
    try:
        await hub_manager.broadcast_all({
            "type": "chat.message",
            "id": message.id,
            "channel_id": message.channel_id,
            "sender_id": message.sender_id,
            "sender_type": message.sender_type,
            "content": message.content,
            "content_html": message.content_html,
            "attachments": json.loads(message.attachments) if message.attachments else [],
            "thread_id": message.thread_id,
            "reply_count": message.reply_count,
            "mentions": json.loads(message.mentions) if message.mentions else [],
            "edited": message.edited,
            "pinned": message.pinned,
            "created_at": message.created_at.isoformat(),
            "updated_at": None,
            "reactions": [],
        }, exclude=user_id)
    except Exception as exc:
        logger.warning("WS broadcast failed for message %s: %s", message.id, exc)

    return MessageResponse.from_message(message)


@router.get("/", response_model=MessageListResponse)
async def list_messages(
    channel_id: str = Query(..., description="Channel to fetch messages for"),
    before_id: Optional[str] = Query(
        default=None, description="Cursor: fetch messages created before this message ID"
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Max messages to return"),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> MessageListResponse:
    """Get messages for a channel with cursor-based pagination.

    Returns messages in reverse-chronological order (newest first).
    Pass `before_id` to paginate backwards.
    """

    stmt = (
        select(Message)
        .where(
            Message.channel_id == channel_id,
            Message.thread_id.is_(None),  # Only top-level messages
        )
    )

    if before_id:
        # Look up the cursor message to get its created_at timestamp
        cursor_msg = await session.get(Message, before_id)
        if cursor_msg:
            stmt = stmt.where(Message.created_at < cursor_msg.created_at)

    stmt = stmt.order_by(Message.created_at.desc()).limit(limit + 1)

    result = await session.execute(stmt)
    messages = list(result.scalars().all())

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    # Fetch reactions in bulk
    message_ids = [m.id for m in messages]
    reactions_map = await _fetch_reactions_for_messages(session, message_ids)

    return MessageListResponse(
        messages=[
            MessageResponse.from_message(m, reactions_map.get(m.id, []))
            for m in messages
        ],
        has_more=has_more,
    )


@router.get("/threads/{message_id}", response_model=MessageListResponse)
async def get_thread_replies(
    message_id: str,
    before_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> MessageListResponse:
    """Get thread replies for a parent message."""

    # Ensure the parent message exists
    await _get_message_or_404(session, message_id)

    stmt = select(Message).where(Message.thread_id == message_id)

    if before_id:
        cursor_msg = await session.get(Message, before_id)
        if cursor_msg:
            stmt = stmt.where(Message.created_at < cursor_msg.created_at)

    stmt = stmt.order_by(Message.created_at.desc()).limit(limit + 1)

    result = await session.execute(stmt)
    messages = list(result.scalars().all())

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    message_ids = [m.id for m in messages]
    reactions_map = await _fetch_reactions_for_messages(session, message_ids)

    return MessageListResponse(
        messages=[
            MessageResponse.from_message(m, reactions_map.get(m.id, []))
            for m in messages
        ],
        has_more=has_more,
    )


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> MessageResponse:
    """Get a single message by ID."""

    message = await _get_message_or_404(session, message_id)

    stmt = (
        select(Reaction)
        .where(Reaction.message_id == message_id)
        .order_by(Reaction.created_at.asc())
    )
    result = await session.execute(stmt)
    reactions = list(result.scalars().all())

    return MessageResponse.from_message(message, reactions)


@router.put("/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: str,
    body: MessageUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> MessageResponse:
    """Edit a message's content. Only the sender may edit."""

    message = await _get_message_or_404(session, message_id)

    if message.sender_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own messages",
        )

    if body.content is not None:
        message.content = body.content
    if body.content_html is not None:
        message.content_html = body.content_html

    message.edited = True
    message.updated_at = datetime.utcnow()

    session.add(message)
    await session.commit()
    await session.refresh(message)

    # Broadcast edit to other connected users (non-fatal)
    try:
        await hub_manager.broadcast_all({
            "type": "chat.edited",
            "message_id": message.id,
            "channel_id": message.channel_id,
            "content": message.content,
            "content_html": message.content_html,
            "updated_at": message.updated_at.isoformat() if message.updated_at else None,
        }, exclude=user_id)
    except Exception as exc:
        logger.warning("WS broadcast failed for edit %s: %s", message.id, exc)

    # Fetch reactions for response
    stmt = (
        select(Reaction)
        .where(Reaction.message_id == message_id)
        .order_by(Reaction.created_at.asc())
    )
    result = await session.execute(stmt)
    reactions = list(result.scalars().all())

    return MessageResponse.from_message(message, reactions)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> None:
    """Delete a message. Only the sender may delete."""

    message = await _get_message_or_404(session, message_id)

    if message.sender_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages",
        )

    # If this is a thread reply, decrement the parent's reply_count
    if message.thread_id:
        parent = await session.get(Message, message.thread_id)
        if parent and parent.reply_count > 0:
            parent.reply_count -= 1
            session.add(parent)

    # Capture channel_id before deletion for broadcast
    channel_id = message.channel_id

    # Delete associated reactions first
    stmt = select(Reaction).where(Reaction.message_id == message_id)
    result = await session.execute(stmt)
    reactions = result.scalars().all()
    for r in reactions:
        await session.delete(r)

    await session.delete(message)
    await session.commit()

    # Broadcast deletion to other connected users (non-fatal)
    try:
        await hub_manager.broadcast_all({
            "type": "chat.deleted",
            "message_id": message_id,
            "channel_id": channel_id,
        }, exclude=user_id)
    except Exception as exc:
        logger.warning("WS broadcast failed for delete %s: %s", message_id, exc)


@router.post(
    "/{message_id}/reactions",
    response_model=ReactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_reaction(
    message_id: str,
    body: ReactionCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Reaction:
    """Add an emoji reaction to a message."""

    # Ensure the message exists and get channel_id for broadcast
    msg = await _get_message_or_404(session, message_id)

    # Check for duplicate
    stmt = select(Reaction).where(
        Reaction.message_id == message_id,
        Reaction.user_id == user_id,
        Reaction.emoji == body.emoji,
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reacted with this emoji",
        )

    reaction = Reaction(
        message_id=message_id,
        user_id=user_id,
        emoji=body.emoji,
    )
    session.add(reaction)
    await session.commit()
    await session.refresh(reaction)

    # Broadcast reaction to other connected users (non-fatal)
    try:
        await hub_manager.broadcast_all({
            "type": "chat.reaction",
            "message_id": message_id,
            "channel_id": msg.channel_id,
            "emoji": reaction.emoji,
            "user_id": user_id,
            "created_at": reaction.created_at.isoformat(),
        }, exclude=user_id)
    except Exception as exc:
        logger.warning("WS broadcast failed for reaction on %s: %s", message_id, exc)

    return reaction


@router.post("/ai-search", response_model=AISearchResponse)
async def ai_search_messages(
    body: AISearchRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> dict:
    """
    Search chat history using an LLM.
    1. Fetches recent messages from allowed channels.
    2. Builds a context window.
    3. Asks the LLM to answer the search query based ONLY on that context.
    """
    from app.models.chat import ChannelMember
    from app.services.llm_service import llm_service
    from app.core.config import settings

    if not llm_service.available:
        raise HTTPException(status_code=503, detail="LLM service unavailable")

    # 1. Determine allowed channels
    allowed_channels_stmt = select(ChannelMember.channel_id).where(ChannelMember.user_id == user_id)
    result = await session.execute(allowed_channels_stmt)
    allowed_ids = set(result.scalars().all())

    if body.channel_ids:
        search_ids = [cid for cid in body.channel_ids if cid in allowed_ids]
    else:
        search_ids = list(allowed_ids)

    if not search_ids:
        return {"answer": "You don't have access to any channels to search.", "referenced_message_ids": []}

    # 2. Fetch the last N messages across those channels to form a context baseline
    # (In a true production app with millions of messages, you'd use pgvector here)
    stmt = (
        select(Message)
        .where(Message.channel_id.in_(search_ids))
        .order_by(Message.created_at.desc())
        .limit(100)
    )
    result = await session.execute(stmt)
    recent_messages = list(result.scalars().all())
    recent_messages.reverse() # chronological

    # 3. Format Context
    context_lines = []
    referenced_ids = []
    for m in recent_messages:
        # We include ID so the LLM can cite it
        line = f"[{m.created_at.strftime('%Y-%m-%d %H:%M')}] {m.sender_type} ({m.sender_id}): {m.content} [ID:{m.id}]"
        context_lines.append(line)
        referenced_ids.append(m.id)

    context_str = "\n".join(context_lines)

    system_prompt = (
        "You are an AI Search Assistant for a team chat app. You will be provided with a raw chat log.\n"
        "Your job is to answer the user's search query using ONLY the provided chat log.\n"
        "If the answer is not in the chat log, say 'I could not find the answer to that in recent history.'\n"
        "When you use information from a specific message, you MUST cite its [ID:xxx] at the end of your sentence."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"CHAT LOG CONTEXT:\n{context_str}\n\nUSER QUERY: {body.query}"}
    ]

    try:
        response = await llm_service.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            max_tokens=600,
            temperature=0.3,
        )
        answer = response.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Extract cited IDs (very basic extraction)
    import re
    cited_ids = re.findall(r'\[ID:([a-f0-9\-]+)\]', answer)
    unique_cited_ids = list(set(cited_ids))

    return {
        "answer": answer,
        "referenced_message_ids": unique_cited_ids
    }


@router.delete(
    "/{message_id}/reactions/{emoji}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_reaction(
    message_id: str,
    emoji: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> None:
    """Remove your emoji reaction from a message."""

    # Get message for channel_id broadcast
    msg = await _get_message_or_404(session, message_id)

    stmt = select(Reaction).where(
        Reaction.message_id == message_id,
        Reaction.user_id == user_id,
        Reaction.emoji == emoji,
    )
    result = await session.execute(stmt)
    reaction = result.scalar_one_or_none()

    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )

    await session.delete(reaction)
    await session.commit()

    # Broadcast reaction removal to other connected users (non-fatal)
    try:
        await hub_manager.broadcast_all({
            "type": "chat.reaction",
            "message_id": message_id,
            "channel_id": msg.channel_id,
            "emoji": emoji,
            "user_id": user_id,
            "removed": True,
        }, exclude=user_id)
    except Exception as exc:
        logger.warning("WS broadcast failed for reaction removal on %s: %s", message_id, exc)
