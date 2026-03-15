from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Verify Firebase token and return user ID.

    For development, returns a test user if no credentials provided.
    """
    if not credentials:
        # Dev mode: return test user
        return "dev-user-001"

    try:
        import firebase_admin.auth as firebase_auth
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
