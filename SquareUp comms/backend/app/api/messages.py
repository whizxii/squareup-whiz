"""Message management API routes."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.models.chat import Message, Reaction

router = APIRouter(prefix="/api/messages", tags=["messages"])


# ---------------------------------------------------------------------------
# Dev auth dependency
# ---------------------------------------------------------------------------

async def get_current_user_id(
    x_user_id: Optional[str] = Header(default="dev-user-001"),
) -> str:
    """Extract user ID from the X-User-Id header.

    Falls back to 'dev-user-001' during development.
    """
    return x_user_id or "dev-user-001"


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    channel_id: str
    content: Optional[str] = None
    content_html: Optional[str] = None
    attachments: Optional[list[str]] = Field(default_factory=list)
    thread_id: Optional[str] = None
    mentions: Optional[list[str]] = Field(default_factory=list)


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


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    has_more: bool


# ---------------------------------------------------------------------------
# Helpers
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
    user_id: str = Depends(get_current_user_id),
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
    return MessageResponse.from_message(message)


@router.get("/", response_model=MessageListResponse)
async def list_messages(
    channel_id: str = Query(..., description="Channel to fetch messages for"),
    before_id: Optional[str] = Query(
        default=None, description="Cursor: fetch messages created before this message ID"
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Max messages to return"),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
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
    user_id: str = Depends(get_current_user_id),
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
    user_id: str = Depends(get_current_user_id),
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
    user_id: str = Depends(get_current_user_id),
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
    message.updated_at = datetime.now(timezone.utc)

    session.add(message)
    await session.commit()
    await session.refresh(message)

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
    user_id: str = Depends(get_current_user_id),
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

    # Delete associated reactions first
    stmt = select(Reaction).where(Reaction.message_id == message_id)
    result = await session.execute(stmt)
    reactions = result.scalars().all()
    for r in reactions:
        await session.delete(r)

    await session.delete(message)
    await session.commit()


@router.post(
    "/{message_id}/reactions",
    response_model=ReactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_reaction(
    message_id: str,
    body: ReactionCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> Reaction:
    """Add an emoji reaction to a message."""

    # Ensure the message exists
    await _get_message_or_404(session, message_id)

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
    return reaction


@router.delete(
    "/{message_id}/reactions/{emoji}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_reaction(
    message_id: str,
    emoji: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> None:
    """Remove your emoji reaction from a message."""

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
