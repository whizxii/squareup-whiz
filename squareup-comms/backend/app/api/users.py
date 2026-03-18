"""Users API — list user profiles for mentions, member pickers, office, etc."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.db import get_session
from app.models.users import UserProfile

router = APIRouter(prefix="/api/users", tags=["users"])


def _parse_avatar_config(raw: str | None) -> dict:
    """Safely parse avatar_config JSON string into a dict."""
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


@router.get("/")
async def list_users(
    session: AsyncSession = Depends(get_session),
    _user_id: str = Depends(get_current_user),
) -> list[dict]:
    """List all user profiles (for @mentions, office floor, chat, etc.)."""
    result = await session.execute(
        select(UserProfile).distinct(UserProfile.firebase_uid)
    )
    users = result.scalars().all()
    # Extra safety: deduplicate by firebase_uid in Python in case DB lacks constraint
    seen: set[str] = set()
    deduped = []
    for u in users:
        if u.firebase_uid not in seen:
            seen.add(u.firebase_uid)
            deduped.append(u)
    return [
        {
            "id": u.firebase_uid,
            "email": u.email,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "avatar_config": _parse_avatar_config(u.avatar_config),
            "status": u.status,
            "status_message": u.status_message,
            "status_emoji": u.status_emoji,
            "office_x": u.office_x,
            "office_y": u.office_y,
        }
        for u in deduped
    ]
