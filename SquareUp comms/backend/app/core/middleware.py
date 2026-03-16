"""Request middleware for SquareUp Comms."""

import time
import uuid
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a unique request ID to every HTTP request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log request start and end with duration."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        method = request.method
        path = request.url.path

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        request_id = getattr(request.state, "request_id", "-")

        logger.info(
            "%s %s -> %s (%sms) [%s]",
            method,
            path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response
