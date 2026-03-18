"""Centralized authentication for SquareUp Comms.

Dual-mode auth:
- Production: Requires Authorization: Bearer <supabase-jwt>
- Dev mode (ENABLE_DEV_AUTH=true): Falls back to X-User-Id header
"""

import logging

from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Security scheme
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Core token verification
# ---------------------------------------------------------------------------
def _verify_supabase_token(token: str) -> str:
    """Verify a Supabase JWT and return the user's UUID (sub claim).

    Uses python-jose to decode HS256 tokens signed with the Supabase JWT secret.
    This is a synchronous operation (no I/O) so no need for run_in_executor.
    """
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase JWT secret not configured. Set SUPABASE_JWT_SECRET env var.",
        )
    try:
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
    except JWTError as exc:
        logger.warning("Supabase JWT verification failed: %s", exc)
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
