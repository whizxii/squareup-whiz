"""Request middleware for SquareUp Comms.

Uses raw ASGI instead of BaseHTTPMiddleware to avoid issues with
file uploads, streaming responses, and CORS header propagation.
"""

import time
import uuid
import logging

from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)


class RequestIdMiddleware:
    """Attach a unique request ID to every HTTP request (pure ASGI)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())[:8]
        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id

        async def send_with_request_id(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_request_id)


class LoggingMiddleware:
    """Log request start and end with duration (pure ASGI)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        method = scope.get("method", "?")
        path = scope.get("path", "?")
        status_code = 500  # default in case we never see the response

        async def send_and_capture(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_and_capture)
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            request_id = scope.get("state", {}).get("request_id", "-")
            logger.info(
                "%s %s -> %s (%sms) [%s]",
                method,
                path,
                status_code,
                duration_ms,
                request_id,
            )
