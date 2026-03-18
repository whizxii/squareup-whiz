"""One-time seed endpoint to bootstrap channels and the 3 team member accounts."""

from __future__ import annotations

import json
import logging
from datetime import datetime

import traceback

import httpx
from fastapi import APIRouter, Depends, Security
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.db import get_session
from app.models.users import UserProfile
from app.models.chat import Channel, ChannelMember

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)
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
        "jwt_secret_length": len(settings.SUPABASE_JWT_SECRET or ""),
        "jwt_secret_prefix": (settings.SUPABASE_JWT_SECRET or "")[:4],
    }


@router.post("/debug-token")
async def debug_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> dict:
    """Temporary debug endpoint to diagnose JWT verification failures."""
    if not credentials or not credentials.credentials:
        return {"error": "No Bearer token provided"}

    token = credentials.credentials
    result: dict = {}

    # Decode header without verification
    try:
        header = jwt.get_unverified_header(token)
        result["header"] = header
    except Exception as e:
        result["header_error"] = str(e)

    # Decode claims without verification
    try:
        claims = jwt.get_unverified_claims(token)
        result["claims"] = {k: v for k, v in claims.items() if k != "session_id"}
    except Exception as e:
        result["claims_error"] = str(e)

    # Try to verify with HS256
    secret = settings.SUPABASE_JWT_SECRET or ""
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        result["verify_hs256"] = "SUCCESS"
        result["sub"] = payload.get("sub")
    except Exception as e:
        result["verify_hs256"] = f"FAILED: {e}"

    return result


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
    now = datetime.utcnow()

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
        #    Check by UID first, then by email to avoid creating duplicates
        existing = await session.get(UserProfile, user_id)
        if not existing:
            # Check if a profile exists with same email but different UID
            email_stmt = select(UserProfile).where(UserProfile.email == email)
            email_result = await session.execute(email_stmt)
            existing = email_result.scalars().first()

        if existing:
            existing.office_x = user_data["office_x"]
            existing.office_y = user_data["office_y"]
            existing.avatar_config = json.dumps(user_data["avatar_config"])
            existing.display_name = user_data["display_name"]
            session.add(existing)
            entry["profile"] = "updated"
            entry["status"] = "updated"
            # Use the existing profile's UID for channel membership
            user_id = existing.firebase_uid
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


@router.post("/cleanup-duplicates")
async def cleanup_duplicate_profiles(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Remove duplicate user_profiles rows for the same email.

    For each email that appears more than once in user_profiles:
    1. Query Supabase Auth admin API to find the canonical UID for that email.
    2. Keep the profile whose firebase_uid matches the Supabase auth user.
    3. Migrate all channel_members, messages, channels.created_by, and reactions
       from the duplicate UID to the canonical UID.
    4. Delete the duplicate profile row.

    Idempotent — safe to call multiple times.
    """
    try:
        return await _cleanup_duplicates_impl(session)
    except Exception as exc:
        logger.exception("cleanup_duplicate_profiles failed")
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=200,
            content={"error": str(exc), "type": type(exc).__name__, "traceback": tb},
        )


async def _get_supabase_uid_for_email(email: str) -> str | None:
    """Look up the Supabase Auth UID for a given email via the admin API."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None

    headers = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users",
            headers=headers,
            params={"page": 1, "per_page": 100},
        )
        if resp.status_code != 200:
            return None
        for u in resp.json().get("users", []):
            if u.get("email") == email:
                return u["id"]
    return None


async def _cleanup_duplicates_impl(session: AsyncSession) -> dict:
    from sqlalchemy import text

    # Collect all profiles to check for duplicates
    all_profiles_result = await session.execute(select(UserProfile))
    all_profiles = all_profiles_result.scalars().all()

    # Build email → canonical Supabase UID map
    all_emails = {p.email for p in all_profiles if p.email}
    email_to_canonical_uid: dict[str, str | None] = {}
    for email in all_emails:
        email_to_canonical_uid[email] = await _get_supabase_uid_for_email(email)

    removed: list[dict] = []
    kept: list[dict] = []
    migrated_refs: list[dict] = []

    # Group profiles by email
    email_to_profiles: dict[str, list[UserProfile]] = {}
    for p in all_profiles:
        email_key = p.email or p.firebase_uid
        email_to_profiles.setdefault(email_key, []).append(p)

    for email, profiles in email_to_profiles.items():
        canonical_uid = email_to_canonical_uid.get(email)

        if len(profiles) == 1 and profiles[0].firebase_uid == canonical_uid:
            kept.append({"email": email, "uid": canonical_uid})
            continue

        if len(profiles) == 1 and canonical_uid and profiles[0].firebase_uid != canonical_uid:
            # Single profile but wrong UID — unlikely but handle it
            kept.append({"email": email, "uid": profiles[0].firebase_uid, "note": "no canonical match, kept only profile"})
            continue

        # Multiple profiles — keep the one matching canonical UID
        keep_profile = None
        delete_profiles = []

        for p in profiles:
            if canonical_uid and p.firebase_uid == canonical_uid:
                keep_profile = p
            else:
                delete_profiles.append(p)

        # If no profile matches the canonical UID, keep the most recent one
        if not keep_profile:
            profiles_sorted = sorted(profiles, key=lambda p: p.created_at, reverse=True)
            keep_profile = profiles_sorted[0]
            delete_profiles = profiles_sorted[1:]

        kept.append({"email": email, "uid": keep_profile.firebase_uid})

        # Migrate references from each duplicate to the kept profile
        for dup in delete_profiles:
            old_uid = dup.firebase_uid
            new_uid = keep_profile.firebase_uid
            ref_count = 0

            # Migrate channel_members (delete if conflict, else update)
            existing_memberships = await session.execute(
                select(ChannelMember).where(ChannelMember.user_id == old_uid)
            )
            for membership in existing_memberships.scalars().all():
                # Check if the kept user already has this membership
                kept_membership = await session.get(
                    ChannelMember, (membership.channel_id, new_uid)
                )
                if kept_membership:
                    await session.delete(membership)
                else:
                    await session.execute(
                        text("UPDATE channel_members SET user_id = :new WHERE channel_id = :cid AND user_id = :old"),
                        {"new": new_uid, "cid": membership.channel_id, "old": old_uid},
                    )
                ref_count += 1

            # Migrate messages.sender_id
            msg_result = await session.execute(
                text("UPDATE messages SET sender_id = :new WHERE sender_id = :old"),
                {"new": new_uid, "old": old_uid},
            )
            ref_count += msg_result.rowcount

            # Migrate channels.created_by
            ch_result = await session.execute(
                text("UPDATE channels SET created_by = :new WHERE created_by = :old"),
                {"new": new_uid, "old": old_uid},
            )
            ref_count += ch_result.rowcount

            # Migrate reactions.user_id (delete if conflict)
            await session.execute(
                text(
                    "DELETE FROM reactions WHERE user_id = :old "
                    "AND (message_id, emoji) IN ("
                    "  SELECT r2.message_id, r2.emoji FROM reactions r2 WHERE r2.user_id = :new"
                    ")"
                ),
                {"old": old_uid, "new": new_uid},
            )
            rxn_result = await session.execute(
                text("UPDATE reactions SET user_id = :new WHERE user_id = :old"),
                {"new": new_uid, "old": old_uid},
            )
            ref_count += rxn_result.rowcount

            migrated_refs.append({
                "from_uid": old_uid,
                "to_uid": new_uid,
                "email": email,
                "refs_migrated": ref_count,
            })

            # Delete the duplicate profile
            await session.delete(dup)
            removed.append({"email": email, "uid": old_uid})

    await session.commit()
    return {
        "kept": kept,
        "removed": removed,
        "migrated_refs": migrated_refs,
        "summary": f"Removed {len(removed)} duplicate profiles, kept {len(kept)}",
    }


@router.delete("/orphan/{uid}")
async def delete_orphan_profile(
    uid: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Delete an orphan user profile by UID and clean up all FK references."""
    from sqlalchemy import text

    profile = await session.get(UserProfile, uid)
    if not profile:
        return {"error": f"No profile found for uid={uid}"}

    # Clean up FK references
    await session.execute(
        text("DELETE FROM channel_members WHERE user_id = :uid"),
        {"uid": uid},
    )
    await session.execute(
        text("DELETE FROM reactions WHERE user_id = :uid"),
        {"uid": uid},
    )
    await session.execute(
        text("UPDATE messages SET sender_id = NULL WHERE sender_id = :uid"),
        {"uid": uid},
    )
    await session.execute(
        text("UPDATE channels SET created_by = NULL WHERE created_by = :uid"),
        {"uid": uid},
    )

    await session.delete(profile)
    await session.commit()

    return {
        "deleted": uid,
        "email": profile.email,
        "display_name": profile.display_name,
    }
