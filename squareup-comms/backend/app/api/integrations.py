"""Generic OAuth integrations API — connect/callback/disconnect for any provider."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.integrations import IntegrationConfig
from app.services.integrations.google_auth import encrypt_tokens, decrypt_tokens
from app.services.integrations.oauth_registry import (
    get_provider,
    list_providers,
    OAUTH_PROVIDERS,
)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


# ---------------------------------------------------------------------------
# List all providers + user connections
# ---------------------------------------------------------------------------

@router.get("/")
async def list_integrations(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List all available providers and the user's active connections."""
    # Get available providers
    providers = list_providers()

    # Get user's active connections
    stmt = select(IntegrationConfig).where(
        IntegrationConfig.connected_by == user_id,
        IntegrationConfig.status == "active",
    )
    result = await session.execute(stmt)
    connections = result.scalars().all()
    connected_types = {c.type for c in connections}

    enriched = []
    for p in providers:
        enriched.append({
            **p,
            "connected": p["name"] in connected_types,
        })

    return success_response({
        "providers": enriched,
        "connections": [
            {
                "id": c.id,
                "type": c.type,
                "display_name": c.display_name,
                "status": c.status,
                "scopes": _safe_json_loads(c.scopes),
                "last_synced_at": c.last_synced_at.isoformat() if c.last_synced_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in connections
        ],
    })


# ---------------------------------------------------------------------------
# OAuth initiation + callback (generic for any provider)
# ---------------------------------------------------------------------------

@router.get("/{provider}/connect")
async def connect_provider(
    provider: str,
    scope_key: str = Query(default=""),
    user_id: str = Depends(get_current_user),
):
    """Initiate OAuth2 flow for a provider."""
    provider_cfg = get_provider(provider)
    if provider_cfg is None:
        raise ApiError(status_code=404, detail=f"Unknown provider: {provider}")
    if not provider_cfg.is_configured:
        raise ApiError(
            status_code=400,
            detail=f"Provider {provider} is not configured (missing client ID/secret)",
        )

    # Resolve scopes
    scopes = provider_cfg.scopes.get(scope_key, "")
    if not scopes and provider_cfg.scopes:
        # Default: use all scopes
        scopes = " ".join(provider_cfg.scopes.values())

    # Build redirect URI
    redirect_uri = f"{_base_url()}/api/integrations/{provider}/callback"

    # State token encodes user_id for the callback
    state = f"{user_id}:{scope_key}"

    params = {
        "client_id": provider_cfg.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scopes,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    auth_url = f"{provider_cfg.auth_url}?{urlencode(params)}"
    return success_response({"auth_url": auth_url})


@router.get("/{provider}/callback")
async def provider_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(default=""),
    session: AsyncSession = Depends(get_session),
):
    """OAuth2 callback — exchange code for tokens and save."""
    provider_cfg = get_provider(provider)
    if provider_cfg is None:
        raise ApiError(status_code=404, detail=f"Unknown provider: {provider}")

    # Parse state
    parts = state.split(":", 1)
    user_id = parts[0] if parts else ""
    scope_key = parts[1] if len(parts) > 1 else ""

    if not user_id:
        raise ApiError(status_code=400, detail="Invalid state parameter")

    # Exchange code for tokens
    redirect_uri = f"{_base_url()}/api/integrations/{provider}/callback"

    token_data = {
        "client_id": provider_cfg.client_id,
        "client_secret": provider_cfg.client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            provider_cfg.token_url, data=token_data, headers=headers,
        )

    if resp.status_code != 200:
        import logging
        logging.getLogger(__name__).error(
            "OAuth token exchange failed for %s: %s %s",
            provider, resp.status_code, resp.text[:500],
        )
        raise ApiError(
            status_code=400,
            detail=f"OAuth token exchange failed for {provider}. Please try again.",
        )

    tokens = resp.json()
    encrypted = encrypt_tokens(tokens)

    # Resolve scopes string
    scopes = provider_cfg.scopes.get(scope_key, "")
    if not scopes:
        scopes = " ".join(provider_cfg.scopes.values())

    # Upsert IntegrationConfig
    stmt = select(IntegrationConfig).where(
        IntegrationConfig.type == provider,
        IntegrationConfig.connected_by == user_id,
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()

    now = datetime.utcnow()
    if existing:
        existing.oauth_tokens_encrypted = encrypted
        existing.scopes = json.dumps(scopes.split())
        existing.status = "active"
        existing.error_message = None
        existing.updated_at = now
        session.add(existing)
    else:
        config = IntegrationConfig(
            id=str(uuid.uuid4()),
            type=provider,
            display_name=f"{provider.title()} Integration",
            oauth_tokens_encrypted=encrypted,
            scopes=json.dumps(scopes.split()),
            status="active",
            connected_by=user_id,
            created_at=now,
            updated_at=now,
        )
        session.add(config)

    await session.commit()

    # Redirect to frontend settings page
    frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
    return RedirectResponse(
        url=f"{frontend_url}/settings?integration={provider}&status=connected",
    )


# ---------------------------------------------------------------------------
# Disconnect
# ---------------------------------------------------------------------------

@router.delete("/{provider}")
async def disconnect_provider(
    provider: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Disconnect a provider integration."""
    stmt = select(IntegrationConfig).where(
        IntegrationConfig.type == provider,
        IntegrationConfig.connected_by == user_id,
        IntegrationConfig.status == "active",
    )
    result = await session.execute(stmt)
    config = result.scalars().first()
    if config is None:
        raise ApiError(status_code=404, detail=f"No active {provider} connection found")

    config.status = "disconnected"
    config.updated_at = datetime.utcnow()
    session.add(config)
    await session.commit()
    return success_response({"disconnected": True, "provider": provider})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_url() -> str:
    """Infer the backend base URL from settings."""
    # Use the redirect URI domain or default
    redirect = settings.GOOGLE_REDIRECT_URI
    if redirect:
        # Extract base from "http://localhost:8000/api/calendar/callback"
        parts = redirect.split("/api/")
        if parts:
            return parts[0]
    return "http://localhost:8000"


def _safe_json_loads(value: str | None) -> list | dict:
    if not value:
        return []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []
