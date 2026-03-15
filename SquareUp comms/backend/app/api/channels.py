"""Channel management API routes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.models.chat import Channel, ChannelMember

router = APIRouter(prefix="/api/channels", tags=["channels"])


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

class ChannelCreate(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=20, description="public | private | dm | agent")
    description: Optional[str] = None
    icon: Optional[str] = Field(default=None, max_length=10)


class ChannelResponse(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str]
    icon: Optional[str]
    agent_id: Optional[str]
    is_default: bool
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemberAdd(BaseModel):
    user_id: str = Field(..., max_length=128)


class MemberResponse(BaseModel):
    channel_id: str
    user_id: str
    role: str
    last_read_message_id: Optional[str]
    last_read_at: datetime
    muted: bool
    notification_override: Optional[str]
    joined_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=ChannelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_channel(
    body: ChannelCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> Channel:
    """Create a new channel and add the creator as the owner member."""

    channel = Channel(
        name=body.name,
        type=body.type,
        description=body.description,
        icon=body.icon,
        created_by=user_id,
    )
    session.add(channel)

    # Auto-add creator as owner
    membership = ChannelMember(
        channel_id=channel.id,
        user_id=user_id,
        role="owner",
    )
    session.add(membership)

    await session.commit()
    await session.refresh(channel)
    return channel


@router.get("/", response_model=list[ChannelResponse])
async def list_channels(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> list[Channel]:
    """List all channels the current user is a member of."""

    stmt = (
        select(Channel)
        .join(ChannelMember, Channel.id == ChannelMember.channel_id)
        .where(ChannelMember.user_id == user_id)
        .order_by(Channel.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> Channel:
    """Get details for a single channel."""

    channel = await session.get(Channel, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )
    return channel


@router.get("/{channel_id}/members", response_model=list[MemberResponse])
async def list_members(
    channel_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> list[ChannelMember]:
    """List all members of a channel."""

    # Ensure channel exists
    channel = await session.get(Channel, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    stmt = (
        select(ChannelMember)
        .where(ChannelMember.channel_id == channel_id)
        .order_by(ChannelMember.joined_at.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "/{channel_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    channel_id: str,
    body: MemberAdd,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> ChannelMember:
    """Add a user to a channel."""

    # Ensure channel exists
    channel = await session.get(Channel, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    # Check for duplicate membership
    stmt = select(ChannelMember).where(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == body.user_id,
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this channel",
        )

    member = ChannelMember(
        channel_id=channel_id,
        user_id=body.user_id,
        role="member",
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return member


@router.delete(
    "/{channel_id}/members/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    channel_id: str,
    target_user_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> None:
    """Remove a user from a channel."""

    stmt = select(ChannelMember).where(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == target_user_id,
    )
    result = await session.execute(stmt)
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this channel",
        )

    await session.delete(member)
    await session.commit()
