"""Centralized authentication for SquareUp Comms.

Dual-mode auth:
- Production: Requires Authorization: Bearer <supabase-jwt>
- Dev mode (ENABLE_DEV_AUTH=true): Falls back to X-User-Id header
"""

from __future__ import annotations

import logging
import os
import threading

import httpx
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, jwk, JWTError
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Production safety guard for dev auth
# ---------------------------------------------------------------------------
_is_production = (
    os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod")
    or os.environ.get("RAILWAY_ENVIRONMENT", "").lower() == "production"
    or os.environ.get("VERCEL_ENV", "").lower() == "production"
    or os.environ.get("FLY_APP_NAME") is not None
    or os.environ.get("RENDER") is not None
)

if settings.ENABLE_DEV_AUTH and _is_production:
    logger.critical(
        "ENABLE_DEV_AUTH=true in a production environment! "
        "Overriding to False for security. Set ENABLE_DEV_AUTH=false explicitly."
    )
    settings.ENABLE_DEV_AUTH = False
elif settings.ENABLE_DEV_AUTH:
    logger.warning(
        "Dev auth is ENABLED — X-User-Id header bypass is active. "
        "Set ENABLE_DEV_AUTH=false before deploying to production."
    )

# ---------------------------------------------------------------------------
# Security scheme
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# JWKS cache for ES256 verification
# ---------------------------------------------------------------------------
_jwks_cache: dict | None = None
_jwks_lock = threading.Lock()


def _get_jwks() -> dict:
    """Fetch and cache JWKS from Supabase for ES256 token verification."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    with _jwks_lock:
        if _jwks_cache is not None:
            return _jwks_cache

        url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        logger.info("Fetching JWKS from %s", url)
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        logger.info("JWKS fetched: %d keys", len(_jwks_cache.get("keys", [])))
        return _jwks_cache


def _find_jwk_key(kid: str) -> dict:
    """Find a JWK key by key ID from the cached JWKS."""
    jwks_data = _get_jwks()
    for key in jwks_data.get("keys", []):
        if key.get("kid") == kid:
            return key
    raise ValueError(f"No JWK found for kid={kid}")


# ---------------------------------------------------------------------------
# Core token verification
# ---------------------------------------------------------------------------
def _verify_supabase_token(token: str) -> str:
    """Verify a Supabase JWT and return the user's UUID (sub claim).

    Supports both:
    - ES256 (new Supabase signing keys) — verified via JWKS public key
    - HS256 (legacy) — verified via SUPABASE_JWT_SECRET
    """
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "ES256":
            if not settings.SUPABASE_URL:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="SUPABASE_URL not configured (needed for JWKS fetch).",
                )
            kid = header.get("kid")
            if not kid:
                raise ValueError("ES256 token missing kid header")

            jwk_key = _find_jwk_key(kid)
            public_key = jwk.construct(jwk_key, algorithm="ES256")
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
        else:
            if not settings.SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Supabase JWT secret not configured.",
                )
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        uid = payload.get("sub")
        if not uid:
            raise ValueError("Token missing sub claim")
        return uid

    except HTTPException:
        raise
    except JWTError as exc:
        logger.warning("Supabase JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        logger.warning("Token verification error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependency — use this in all API routes
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
    x_user_id: Optional[str] = Header(default=None),
) -> str:
    """Return the authenticated user's ID.

    1. If a Bearer token is present, verify it as a Supabase JWT.
    2. Else if ENABLE_DEV_AUTH is true, use X-User-Id header (default dev-user-001).
    3. Else reject with 401.
    """
    # Path 1: Bearer token present — verify via Supabase JWT
    if credentials and credentials.credentials:
        try:
            return _verify_supabase_token(credentials.credentials)
        except HTTPException:
            # In dev mode, fall through to dev auth if JWT verification fails
            if not settings.ENABLE_DEV_AUTH:
                raise
            logger.warning(
                "Bearer token verification failed, falling back to dev auth (user: %s)",
                x_user_id or "dev-user-001",
            )

    # Path 2: Dev mode fallback
    if settings.ENABLE_DEV_AUTH:
        return x_user_id or "dev-user-001"

    # Path 3: No token and dev mode disabled — reject
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# WebSocket token verification
# ---------------------------------------------------------------------------
async def verify_ws_token(token: Optional[str]) -> str:
    """Verify a WebSocket connection token.

    Returns the user_id on success.
    Raises an exception on failure (caller should close the WebSocket).
    """
    # In dev mode, accept raw user IDs as tokens (not JWTs)
    if settings.ENABLE_DEV_AUTH:
        return token or "dev-user-001"

    if token:
        return _verify_supabase_token(token)

    raise Exception("WebSocket authentication required")
