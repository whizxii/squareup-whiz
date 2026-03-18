"""One-time seed endpoint to bootstrap channels and the 3 team member accounts."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import traceback

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
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
        "icon": "\U0001f4ac",
        "is_default": True,
    },
    {
        "name": "random",
        "type": "public",
        "description": "Watercooler chat",
        "icon": "\U0001f3b2",
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


async def _get_or_create_supabase_user(email: str, password: str, display_name: str) -> tuple[str | None, str]:
    """Create a Supabase Auth user or retrieve the existing one.

    Returns (user_id, status) where status is 'created', 'already_exists', or 'error: ...'.
    Uses Supabase Admin API via service key.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None, "error: SUPABASE_URL or SUPABASE_SERVICE_KEY not configured"

    base_url = settings.SUPABASE_URL
    headers = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        # Try to create the user
        resp = await client.post(
            f"{base_url}/auth/v1/admin/users",
            headers=headers,
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"display_name": display_name},
            },
        )

        if resp.status_code == 200:
            user_id = resp.json().get("id")
            return user_id, "created"

        # If user already exists, look them up
        if resp.status_code == 422 or "already" in resp.text.lower():
            # List users and find by email
            list_resp = await client.get(
                f"{base_url}/auth/v1/admin/users",
                headers=headers,
                params={"page": 1, "per_page": 100},
            )
            if list_resp.status_code == 200:
                users = list_resp.json().get("users", [])
                for u in users:
                    if u.get("email") == email:
                        return u["id"], "already_exists"

        return None, f"error: {resp.status_code} {resp.text[:200]}"


@router.get("/debug")
async def seed_debug() -> dict:
    """Temporary debug endpoint to check config."""
    return {
        "supabase_url_set": bool(settings.SUPABASE_URL),
        "supabase_service_key_set": bool(settings.SUPABASE_SERVICE_KEY),
        "supabase_jwt_secret_set": bool(settings.SUPABASE_JWT_SECRET),
        "supabase_url_prefix": (settings.SUPABASE_URL or "")[:30],
    }


@router.post("/users")
async def seed_users(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Create default channels + Supabase auth accounts + UserProfile rows.

    Idempotent: skips items that already exist.
    """
    try:
        return await _seed_users_impl(session)
    except Exception as exc:
        logger.exception("seed_users failed")
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=200,
            content={"error": str(exc), "type": type(exc).__name__, "traceback": tb},
        )


async def _seed_users_impl(session: AsyncSession) -> dict:
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

        # 1. Create Supabase auth user (or get existing)
        user_id, auth_status = await _get_or_create_supabase_user(
            email, user_data["password"], user_data["display_name"],
        )
        entry["auth"] = auth_status

        if not user_id:
            results.append(entry)
            continue

        # 2. Create or update UserProfile row
        existing = await session.get(UserProfile, user_id)
        if existing:
            existing.office_x = user_data["office_x"]
            existing.office_y = user_data["office_y"]
            existing.avatar_config = json.dumps(user_data["avatar_config"])
            existing.display_name = user_data["display_name"]
            session.add(existing)
            entry["profile"] = "updated"
            entry["status"] = "updated"
        else:
            profile = UserProfile(
                firebase_uid=user_id,
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
                ChannelMember, (channel.id, user_id)
            )
            if not existing_member:
                member = ChannelMember(
                    channel_id=channel.id,
                    user_id=user_id,
                    role="member",
                )
                session.add(member)
                channels_joined += 1
        entry["channels_joined"] = channels_joined

        results.append(entry)

    await session.commit()
    return {"channels_created": channels_created, "seeded": results}
