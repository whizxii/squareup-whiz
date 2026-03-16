"""Standardized API response envelope and error handling.

Usage:
    from app.core.responses import ApiResponse, ApiError, success_response

    @router.get("/contacts")
    async def list_contacts():
        return success_response(data=contacts, meta={"total": 100})

    # Raise ApiError anywhere — caught by global handler
    raise ApiError(status_code=404, detail="Contact not found")
"""

from __future__ import annotations

import logging
from typing import Any, Generic, TypeVar

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response envelope."""

    success: bool = True
    data: T | None = None
    error: str | None = None
    meta: dict[str, Any] | None = None


class ApiError(Exception):
    """Raise to return a structured error response.

    Caught by the global exception handler registered on the app.
    """

    def __init__(self, status_code: int = 400, detail: str = "Bad request") -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


async def api_error_handler(_request: Request, exc: ApiError) -> JSONResponse:
    """FastAPI exception handler for ApiError."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            success=False,
            error=exc.detail,
        ).model_dump(),
    )


def success_response(
    data: Any = None,
    meta: dict[str, Any] | None = None,
) -> ApiResponse:
    """Helper to build a success response."""
    return ApiResponse(success=True, data=data, meta=meta)


def error_response(
    error: str,
    status_code: int = 400,
) -> JSONResponse:
    """Helper to build an error JSONResponse directly (without raising)."""
    return JSONResponse(
        status_code=status_code,
        content=ApiResponse(
            success=False,
            error=error,
        ).model_dump(),
    )


async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Wrap FastAPI HTTPExceptions in the ApiResponse envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            success=False,
            error=exc.detail if isinstance(exc.detail, str) else str(exc.detail),
        ).model_dump(),
    )


async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return sanitized Pydantic validation errors in the ApiResponse envelope."""
    errors = [
        {"field": ".".join(str(loc) for loc in e["loc"]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=ApiResponse(
            success=False,
            error="Validation failed",
            meta={"errors": errors},
        ).model_dump(),
    )


async def unhandled_exception_handler(
    _request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all for unhandled exceptions — log details, return safe 500."""
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ApiResponse(
            success=False,
            error="Internal server error",
        ).model_dump(),
    )
