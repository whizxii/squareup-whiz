"""Centralized authentication for SquareUp Comms.

Dual-mode auth:
- Production: Requires Authorization: Bearer <firebase-token>
- Dev mode (ENABLE_DEV_AUTH=true): Falls back to X-User-Id header
"""

import asyncio
import json
import logging
import os

import firebase_admin
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth, credentials
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firebase Admin SDK initialization (module-level, runs once on import)
# ---------------------------------------------------------------------------
_firebase_initialized = False

if not firebase_admin._apps:
    if settings.FIREBASE_CREDENTIALS_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase initialized from FIREBASE_CREDENTIALS_JSON env var.")
        except Exception as exc:
            logger.error("Failed to initialize Firebase from JSON env var: %s", exc)
    elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        try:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase initialized from file: %s", settings.FIREBASE_CREDENTIALS_PATH)
        except Exception as exc:
            logger.error("Failed to initialize Firebase from file: %s", exc)
    else:
        logger.warning(
            "No Firebase credentials found. Set FIREBASE_CREDENTIALS_JSON or "
            "place credentials at %s. Auth will only work in dev mode.",
            settings.FIREBASE_CREDENTIALS_PATH,
        )
else:
    _firebase_initialized = True

# ---------------------------------------------------------------------------
# Security scheme
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Core token verification (async-safe)
# ---------------------------------------------------------------------------
async def _verify_firebase_token(token: str) -> str:
    """Verify a Firebase ID token and return the uid.

    Runs the blocking verify_id_token call in a thread pool executor.
    """
    if not _firebase_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured. Cannot verify tokens.",
        )
    try:
        loop = asyncio.get_running_loop()
        decoded = await loop.run_in_executor(None, firebase_auth.verify_id_token, token)
        uid = decoded.get("uid") or decoded.get("user_id")
        if not uid:
            raise ValueError("Token missing uid")
        return uid
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Firebase token verification failed: %s", exc)
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

    1. If a Bearer token is present, verify it via Firebase.
    2. Else if ENABLE_DEV_AUTH is true, use X-User-Id header (default dev-user-001).
    3. Else reject with 401.
    """
    # Path 1: Bearer token present — verify via Firebase
    if credentials and credentials.credentials:
        try:
            return await _verify_firebase_token(credentials.credentials)
        except HTTPException:
            # In dev mode, fall through to dev auth if Firebase isn't configured
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
        return await _verify_firebase_token(token)

    raise Exception("WebSocket authentication required")
