"""Rate limiting setup using slowapi."""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.responses import ApiResponse

limiter = Limiter(key_func=get_remote_address)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a structured 429 response when rate limit is exceeded."""
    return JSONResponse(
        status_code=429,
        content=ApiResponse(
            success=False,
            error=f"Rate limit exceeded: {exc.detail}",
        ).model_dump(),
    )
