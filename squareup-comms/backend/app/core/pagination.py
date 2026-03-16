"""Cursor-based pagination helpers.

Usage:
    from app.core.pagination import PaginatedResponse, paginate

    result = await paginate(query, cursor="abc123", limit=50)
"""

from __future__ import annotations

import base64
from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

T = TypeVar("T", bound=SQLModel)

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T] = Field(default_factory=list)
    next_cursor: str | None = None
    prev_cursor: str | None = None
    total_count: int = 0
    has_more: bool = False


def encode_cursor(value: str) -> str:
    """Encode a value into an opaque cursor string."""
    return base64.urlsafe_b64encode(value.encode()).decode()


def decode_cursor(cursor: str) -> str:
    """Decode an opaque cursor string back to the original value."""
    return base64.urlsafe_b64decode(cursor.encode()).decode()


async def paginate(
    session: AsyncSession,
    model: type[T],
    *,
    base_query=None,
    cursor: str | None = None,
    limit: int = DEFAULT_LIMIT,
    order_by=None,
    id_field: str = "id",
) -> PaginatedResponse[T]:
    """Cursor-based pagination for SQLModel queries.

    Args:
        session: Async database session.
        model: The SQLModel class to paginate.
        base_query: Optional pre-built select statement. Defaults to select(model).
        cursor: Opaque cursor from a previous response.
        limit: Number of items per page (clamped to MAX_LIMIT).
        order_by: SQLAlchemy column to order by. Defaults to model.created_at desc.
        id_field: Name of the ID field on the model.

    Returns:
        PaginatedResponse with items, cursors, total_count, and has_more.
    """
    limit = min(max(1, limit), MAX_LIMIT)

    if base_query is None:
        base_query = select(model)

    # Total count (without cursor filter)
    count_stmt = select(func.count()).select_from(base_query.subquery())
    total_result = await session.execute(count_stmt)
    total_count = total_result.scalar() or 0

    # Default ordering: created_at descending
    if order_by is None:
        if hasattr(model, "created_at"):
            order_by = model.created_at.desc()  # type: ignore[union-attr]
        else:
            order_by = getattr(model, id_field).desc()

    query = base_query.order_by(order_by)

    # Apply cursor filter
    if cursor:
        cursor_id = decode_cursor(cursor)
        id_col = getattr(model, id_field)
        query = query.where(id_col < cursor_id)

    # Fetch limit + 1 to detect has_more
    query = query.limit(limit + 1)
    result = await session.execute(query)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    items = rows[:limit]

    next_cursor = None
    if has_more and items:
        last_id = getattr(items[-1], id_field)
        next_cursor = encode_cursor(str(last_id))

    prev_cursor = None
    if cursor and items:
        first_id = getattr(items[0], id_field)
        prev_cursor = encode_cursor(str(first_id))

    return PaginatedResponse(
        items=items,
        next_cursor=next_cursor,
        prev_cursor=prev_cursor,
        total_count=total_count,
        has_more=has_more,
    )
