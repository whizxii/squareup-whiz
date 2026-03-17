"""Channel management API routes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.db import get_session
from app.models.chat import Channel, ChannelMember

router = APIRouter(prefix="/api/channels", tags=["channels"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChannelCreate(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=20, description="public | private | dm | agent")
    description: Optional[str] = None
    icon: Optional[str] = Field(default=None, max_length=10)
    is_private: bool = Field(default=False)

class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(default=None, max_length=10)
    is_archived: Optional[bool] = None


class ChannelResponse(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str]
    icon: Optional[str]
    agent_id: Optional[str]
    is_default: bool
    is_private: bool
    is_archived: bool
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

class MemberBulkAdd(BaseModel):
    user_ids: List[str] = Field(..., description="List of user IDs to add")

class MemberRoleUpdate(BaseModel):
    role: str = Field(..., max_length=20, description="owner | admin | member | guest")


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
    user_id: str = Depends(get_current_user),
) -> Channel:
    """Create a new channel and add the creator as the owner member."""

    channel = Channel(
        name=body.name,
        type=body.type,
        description=body.description,
        icon=body.icon,
        is_private=body.is_private,
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

    # Auto-add all team members to public channels
    if not body.is_private and body.type == "public":
        from app.models.users import UserProfile
        all_users_result = await session.execute(select(UserProfile))
        for user in all_users_result.scalars().all():
            if user.firebase_uid != user_id:
                member = ChannelMember(
                    channel_id=channel.id,
                    user_id=user.firebase_uid,
                    role="member",
                )
                session.add(member)

    await session.commit()
    await session.refresh(channel)
    return channel


@router.get("/", response_model=list[ChannelResponse])
async def list_channels(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> list[Channel]:
    """List channels visible to the current user.

    Public channels are visible to all users.
    Private channels are only visible to members.
    """
    from sqlalchemy import or_

    member_channels = select(ChannelMember.channel_id).where(
        ChannelMember.user_id == user_id
    )
    stmt = (
        select(Channel)
        .where(
            Channel.is_archived == False,  # noqa: E712
            or_(
                Channel.is_private == False,  # noqa: E712
                Channel.id.in_(member_channels),
            ),
        )
        .order_by(Channel.created_at.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Channel:
    """Get details for a single channel."""

    channel = await session.get(Channel, channel_id)
    if not channel or channel.is_archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )
    return channel


@router.patch("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: str,
    body: ChannelUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> Channel:
    """Update channel metadata. Only owner/admin can do this."""
    
    # 1. Ensure channel exists
    channel = await session.get(Channel, channel_id)
    if not channel or channel.is_archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    # 2. Verify permissions (User must be Owner or Admin)
    stmt = select(ChannelMember).where(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == user_id,
        ChannelMember.role.in_(["owner", "admin"])
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="Not authorized to Edit this channel",
         )

    # 3. Update fields
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(channel, field, value)
        
    channel.updated_at = datetime.now(timezone.utc)
    
    session.add(channel)
    await session.commit()
    await session.refresh(channel)
    return channel


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> None:
    """Soft delete (archive) a channel. Only owner/admin can do this."""
    
    channel = await session.get(Channel, channel_id)
    if not channel or channel.is_archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
        )

    stmt = select(ChannelMember).where(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == user_id,
        ChannelMember.role.in_(["owner", "admin"])
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="Not authorized to Delete this channel",
         )

    channel.is_archived = True
    channel.updated_at = datetime.now(timezone.utc)
    session.add(channel)
    await session.commit()


@router.get("/{channel_id}/members", response_model=list[MemberResponse])
async def list_members(
    channel_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
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
    user_id: str = Depends(get_current_user),
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

    # 3. Add user
    member = ChannelMember(
        channel_id=channel_id,
        user_id=body.user_id,
        role="member",
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return member


@router.post(
    "/{channel_id}/members/bulk",
    response_model=List[MemberResponse],
    status_code=status.HTTP_201_CREATED,
)
async def bulk_add_members(
    channel_id: str,
    body: MemberBulkAdd,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> list[ChannelMember]:
    """Add multiple users to a channel at once. Private channels require invite rights (Admin/Owner)."""
    
    # 1. Ensure channel exists
    channel = await session.get(Channel, channel_id)
    if not channel or channel.is_archived:
        raise HTTPException(status_code=404, detail="Channel not found")

    # 2. If private, check permissions
    if channel.is_private:
       stmt = select(ChannelMember).where(
           ChannelMember.channel_id == channel_id,
           ChannelMember.user_id == user_id,
           ChannelMember.role.in_(["owner", "admin"])
       )
       result = await session.execute(stmt)
       if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to invite to this private channel")

    # 3. Get existing members
    stmt = select(ChannelMember.user_id).where(ChannelMember.channel_id == channel_id)
    result = await session.execute(stmt)
    existing_user_ids = set(result.scalars().all())

    # 4. Insert new members
    new_members = []
    for uid in body.user_ids:
        if uid not in existing_user_ids:
            new_member = ChannelMember(
                channel_id=channel_id,
                user_id=uid,
                role="member",
            )
            session.add(new_member)
            new_members.append(new_member)

    await session.commit()
    for m in new_members:
        await session.refresh(m)
        
    return new_members


@router.patch("/{channel_id}/members/{target_user_id}", response_model=MemberResponse)
async def update_member_role(
    channel_id: str,
    target_user_id: str,
    body: MemberRoleUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> ChannelMember:
    """Update a member's role (e.g., promote to admin). Requires Owner/Admin role."""
    
    # 1. Ensure channel exists
    channel = await session.get(Channel, channel_id)
    if not channel or channel.is_archived:
        raise HTTPException(status_code=404, detail="Channel not found")

    # 2. Check permissions 
    stmt = select(ChannelMember).where(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == user_id,
        ChannelMember.role.in_(["owner", "admin"])
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
         raise HTTPException(status_code=403, detail="Not authorized to alter roles")

    # 3. Find target member
    stmt = select(ChannelMember).where(
        ChannelMember.channel_id == channel_id,
        ChannelMember.user_id == target_user_id,
    )
    result = await session.execute(stmt)
    target_member = result.scalar_one_or_none()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Target user is not a member of this channel")

    # Prevent removing the only owner (logic simplified for now)
    if target_member.role == "owner" and body.role != "owner":
        owner_count_stmt = select(func.count()).select_from(ChannelMember).where(
            ChannelMember.channel_id == channel_id, ChannelMember.role == "owner"
        )
        owner_count = (await session.execute(owner_count_stmt)).scalar_one()
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the only owner of a channel")

    # 4. Update
    target_member.role = body.role
    session.add(target_member)
    await session.commit()
    await session.refresh(target_member)
    return target_member


@router.delete(
    "/{channel_id}/members/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    channel_id: str,
    target_user_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> None:
    """Remove a user from a channel."""

    # 1. Ensure channel exists
    channel = await session.get(Channel, channel_id)
    if not channel or channel.is_archived:
        raise HTTPException(status_code=404, detail="Channel not found")

    # 2. Verify permission (User must be Owner/Admin OR removing themselves)
    if user_id != target_user_id:
        stmt = select(ChannelMember).where(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == user_id,
            ChannelMember.role.in_(["owner", "admin"])
        )
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN,
                 detail="Not authorized to kick members",
             )

    # 3. Prevent removing the last owner
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
        
    if member.role == "owner":
        owner_count_stmt = select(func.count()).select_from(ChannelMember).where(
            ChannelMember.channel_id == channel_id, ChannelMember.role == "owner"
        )
        owner_count = (await session.execute(owner_count_stmt)).scalar_one()
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the only owner of a channel")

    await session.delete(member)
    await session.commit()
