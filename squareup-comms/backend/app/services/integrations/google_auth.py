"""Shared Google OAuth helpers for Calendar and Gmail integrations.

Provides:
- Token encryption/decryption (Fernet)
- Access token validation and refresh
- Integration config lookup by type + user

Both calendar_service.py and gmail_sync.py import from here
instead of duplicating OAuth logic.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.integrations import IntegrationConfig

logger = get_logger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]


def _get_fernet() -> Fernet:
    """Get a Fernet instance for encrypting/decrypting OAuth tokens."""
    if not settings.ENCRYPTION_KEY:
        raise ValueError(
            "ENCRYPTION_KEY is not configured. "
            "Generate one with: python -c "
            "'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_tokens(tokens: dict[str, Any]) -> str:
    """Encrypt OAuth tokens for database storage."""
    fernet = _get_fernet()
    return fernet.encrypt(json.dumps(tokens).encode()).decode()


def decrypt_tokens(encrypted: str) -> dict[str, Any]:
    """Decrypt OAuth tokens from database storage."""
    fernet = _get_fernet()
    return json.loads(fernet.decrypt(encrypted.encode()).decode())


async def get_user_integration_config(
    user_id: str,
    integration_type: str,
    session: AsyncSession,
) -> Optional[IntegrationConfig]:
    """Fetch an active integration config for a user by type."""
    stmt = select(IntegrationConfig).where(
        IntegrationConfig.type == integration_type,
        IntegrationConfig.connected_by == user_id,
        IntegrationConfig.status == "active",
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_valid_access_token(
    config: IntegrationConfig,
    session: AsyncSession,
    test_url: str = "https://www.googleapis.com/calendar/v3/calendars/primary",
) -> str:
    """Get a valid access token, refreshing if expired.

    Args:
        config: The integration config with encrypted tokens.
        session: Database session for persisting refreshed tokens.
        test_url: URL to test token validity against (varies by API).

    Returns:
        A valid access token string.

    Raises:
        ValueError: If no refresh token is available or refresh fails.
    """
    if not config.oauth_tokens_encrypted:
        raise ValueError("Integration has no stored tokens. User must re-connect.")

    tokens = decrypt_tokens(config.oauth_tokens_encrypted)
    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token")

    # Test the current token
    async with httpx.AsyncClient() as client:
        test_resp = await client.get(
            test_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if test_resp.status_code == 200:
        return access_token

    # Token expired — refresh it
    if not refresh_token:
        raise ValueError("No refresh token available. User must re-connect.")

    async with httpx.AsyncClient() as client:
        refresh_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )

    if refresh_resp.status_code != 200:
        logger.error("Token refresh failed: %s", refresh_resp.text)
        raise ValueError("Token refresh failed. User must re-connect.")

    new_tokens = refresh_resp.json()
    # Preserve the refresh token (Google doesn't always return it)
    new_tokens["refresh_token"] = refresh_token
    encrypted = encrypt_tokens(new_tokens)

    # Update in database — create new instance to avoid mutation
    updated = IntegrationConfig(
        id=config.id,
        type=config.type,
        display_name=config.display_name,
        mcp_server_config=config.mcp_server_config,
        oauth_tokens_encrypted=encrypted,
        scopes=config.scopes,
        status=config.status,
        connected_by=config.connected_by,
        last_synced_at=config.last_synced_at,
        error_message=config.error_message,
        created_at=config.created_at,
        updated_at=datetime.now(timezone.utc),
    )
    await session.merge(updated)
    await session.commit()

    return new_tokens["access_token"]
