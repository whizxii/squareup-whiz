"""Users API — list user profiles for mentions, member pickers, etc."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import get_current_user
from app.core.db import get_session
from app.models.users import UserProfile

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/")
async def list_users(
    session: AsyncSession = Depends(get_session),
    _user_id: str = Depends(get_current_user),
) -> list[dict]:
    """List all user profiles (for @mentions, channel member picker, etc.)."""
    result = await session.execute(select(UserProfile))
    users = result.scalars().all()
    return [
        {
            "id": u.firebase_uid,
            "email": u.email,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "status": u.status,
        }
        for u in users
    ]
