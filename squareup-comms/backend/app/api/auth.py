"""Authentication & onboarding API routes."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.avatars import AVATAR_IDS, AVATAR_OPTIONS, AvatarOption
from app.core.db import get_session
from app.core.rate_limit import limiter
from app.models.chat import Channel, ChannelMember
from app.models.users import UserProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class VerifyResponse(BaseModel):
    uid: str
    needs_onboarding: bool
    profile: Optional[ProfileResponse] = None


class OnboardRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    nickname: Optional[str] = Field(default=None, max_length=50)
    avatar_id: str = Field(..., max_length=20)


class ProfileResponse(BaseModel):
    firebase_uid: str
    display_name: str
    nickname: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]
    avatar_config: Optional[dict]
    status: str
    status_message: Optional[str]
    status_emoji: Optional[str]
    office_x: int
    office_y: int
    theme: str
    last_seen_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: UserProfile) -> ProfileResponse:
        avatar_config_dict: Optional[dict] = None
        if user.avatar_config:
            try:
                avatar_config_dict = json.loads(user.avatar_config)
            except (json.JSONDecodeError, TypeError):
                avatar_config_dict = None

        return cls(
            firebase_uid=user.firebase_uid,
            display_name=user.display_name,
            nickname=user.nickname,
            email=user.email,
            avatar_url=user.avatar_url,
            avatar_config=avatar_config_dict,
            status=user.status,
            status_message=user.status_message,
            status_emoji=user.status_emoji,
            office_x=user.office_x,
            office_y=user.office_y,
            theme=user.theme,
            last_seen_at=user.last_seen_at,
            created_at=user.created_at,
        )


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=100)
    nickname: Optional[str] = Field(default=None, max_length=50)
    avatar_id: Optional[str] = Field(default=None, max_length=20)
    status: Optional[str] = Field(default=None, max_length=20)
    status_message: Optional[str] = None
    status_emoji: Optional[str] = Field(default=None, max_length=10)
    theme: Optional[str] = Field(default=None, max_length=10)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_avatar_config(avatar_id: str) -> str:
    """Build JSON avatar config from an avatar_id."""
    for avatar in AVATAR_OPTIONS:
        if avatar["id"] == avatar_id:
            return json.dumps({
                "type": "pixel",
                "avatar_id": avatar_id,
                "primary_color": avatar["primary_color"],
                "secondary_color": avatar["secondary_color"],
                "icon": avatar["icon"],
            })
    return "{}"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/verify", response_model=VerifyResponse)
@limiter.limit("10/minute")
async def verify_token(
    request: Request,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> VerifyResponse:
    """Verify the current user's auth and check if onboarding is needed."""
    profile = await session.get(UserProfile, user_id)

    if profile:
        return VerifyResponse(
            uid=user_id,
            needs_onboarding=False,
            profile=ProfileResponse.from_user(profile),
        )

    return VerifyResponse(uid=user_id, needs_onboarding=True)


@router.post("/onboard", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def onboard_user(
    request: Request,
    body: OnboardRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> ProfileResponse:
    """Create user profile during onboarding."""
    # Check if already onboarded
    existing = await session.get(UserProfile, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User profile already exists.",
        )

    # Validate avatar
    if body.avatar_id not in AVATAR_IDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid avatar_id '{body.avatar_id}'. Must be one of: {', '.join(sorted(AVATAR_IDS))}",
        )

    now = datetime.utcnow()
    profile = UserProfile(
        firebase_uid=user_id,
        display_name=body.full_name,
        nickname=body.nickname,
        avatar_config=_build_avatar_config(body.avatar_id),
        last_seen_at=now,
        created_at=now,
    )
    session.add(profile)

    # Auto-join default channels
    stmt = select(Channel).where(Channel.is_default == True)  # noqa: E712
    result = await session.execute(stmt)
    default_channels = result.scalars().all()

    for channel in default_channels:
        member = ChannelMember(
            channel_id=channel.id,
            user_id=user_id,
            role="member",
        )
        session.add(member)

    await session.commit()
    await session.refresh(profile)
    return ProfileResponse.from_user(profile)


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> ProfileResponse:
    """Get the current user's profile."""
    profile = await session.get(UserProfile, user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first.",
        )
    return ProfileResponse.from_user(profile)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    body: ProfileUpdate,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
) -> ProfileResponse:
    """Update the current user's profile."""
    profile = await session.get(UserProfile, user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first.",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Handle avatar_id -> avatar_config conversion
    if "avatar_id" in update_data:
        avatar_id = update_data.pop("avatar_id")
        if avatar_id is not None:
            if avatar_id not in AVATAR_IDS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid avatar_id '{avatar_id}'.",
                )
            profile.avatar_config = _build_avatar_config(avatar_id)

    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.last_seen_at = datetime.utcnow()
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return ProfileResponse.from_user(profile)


@router.get("/avatars", response_model=List[AvatarOption])
async def list_avatars() -> list[AvatarOption]:
    """Return the available pixel-art avatar options."""
    return AVATAR_OPTIONS
