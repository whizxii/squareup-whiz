"""One-time seed endpoint to bootstrap channels and the 3 team member accounts."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from firebase_admin import auth as firebase_auth

from app.core.db import get_session
from app.models.users import UserProfile
from app.models.chat import Channel, ChannelMember

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/seed", tags=["seed"])

# Default channels to create if missing
SEED_CHANNELS = [
    {
        "name": "general",
        "type": "public",
        "description": "General team chat",
        "icon": "💬",
        "is_default": True,
    },
    {
        "name": "random",
        "type": "public",
        "description": "Watercooler chat",
        "icon": "🎲",
        "is_default": True,
    },
]

# The 3 team members to pre-create
SEED_USERS = [
    {
        "email": "kunjdhamsaniya@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Kunj",
        "office_x": 3,
        "office_y": 3,
        "avatar_config": {
            "type": "character",
            "hairStyle": 1,
            "hairColor": "#3B2F2F",
            "skinTone": "#D2A679",
            "shirtColor": "#FF6B00",
            "pantsColor": "#3B4252",
        },
    },
    {
        "email": "tvnale@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Tanmay",
        "office_x": 6,
        "office_y": 3,
        "avatar_config": {
            "type": "character",
            "hairStyle": 0,
            "hairColor": "#1a1a1a",
            "skinTone": "#C68642",
            "shirtColor": "#4a90d9",
            "pantsColor": "#2d3436",
        },
    },
    {
        "email": "paramjhade24@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Param",
        "office_x": 9,
        "office_y": 3,
        "avatar_config": {
            "type": "character",
            "hairStyle": 3,
            "hairColor": "#2C1810",
            "skinTone": "#D4A574",
            "shirtColor": "#27ae60",
            "pantsColor": "#34495e",
        },
    },
]


@router.post("/users")
async def seed_users(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Create default channels + Firebase auth accounts + UserProfile rows.

    Idempotent: skips items that already exist.
    """
    results: list[dict] = []
    now = datetime.now(timezone.utc)

    # 0. Ensure default channels exist
    channels_created = 0
    stmt = select(Channel).where(Channel.is_default == True)  # noqa: E712
    result = await session.execute(stmt)
    existing_channels = {c.name: c for c in result.scalars().all()}

    for ch_data in SEED_CHANNELS:
        if ch_data["name"] not in existing_channels:
            channel = Channel(
                name=ch_data["name"],
                type=ch_data["type"],
                description=ch_data["description"],
                icon=ch_data["icon"],
                is_default=True,
                is_private=False,
                created_at=now,
                updated_at=now,
            )
            session.add(channel)
            existing_channels[ch_data["name"]] = channel
            channels_created += 1

    await session.flush()  # Assign IDs before foreign-key references
    default_channels = list(existing_channels.values())

    for user_data in SEED_USERS:
        email = user_data["email"]
        entry: dict = {"email": email, "status": "skipped"}

        # 1. Create Firebase auth user (or get existing)
        firebase_uid: str | None = None
        try:
            fb_user = firebase_auth.get_user_by_email(email)
            firebase_uid = fb_user.uid
            entry["firebase"] = "already_exists"
        except firebase_auth.UserNotFoundError:
            try:
                fb_user = firebase_auth.create_user(
                    email=email,
                    password=user_data["password"],
                    display_name=user_data["display_name"],
                )
                firebase_uid = fb_user.uid
                entry["firebase"] = "created"
            except Exception as exc:
                entry["firebase"] = f"error: {exc}"
                logger.error("Failed to create Firebase user %s: %s", email, exc)
                results.append(entry)
                continue

        # 2. Create UserProfile row (or skip if exists)
        existing = await session.get(UserProfile, firebase_uid)
        if existing:
            entry["profile"] = "already_exists"
            entry["status"] = "exists"
        else:
            profile = UserProfile(
                firebase_uid=firebase_uid,
                display_name=user_data["display_name"],
                email=email,
                avatar_config=json.dumps(user_data["avatar_config"]),
                office_x=user_data["office_x"],
                office_y=user_data["office_y"],
                status="online",
                last_seen_at=now,
                created_at=now,
            )
            session.add(profile)
            entry["profile"] = "created"
            entry["status"] = "created"

        # 3. Auto-join default channels
        channels_joined = 0
        for channel in default_channels:
            existing_member = await session.get(
                ChannelMember, (channel.id, firebase_uid)
            )
            if not existing_member:
                member = ChannelMember(
                    channel_id=channel.id,
                    user_id=firebase_uid,
                    role="member",
                )
                session.add(member)
                channels_joined += 1
        entry["channels_joined"] = channels_joined

        results.append(entry)

    await session.commit()
    return {"channels_created": channels_created, "seeded": results}
