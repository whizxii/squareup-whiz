"""Generic async repository with common CRUD operations.

All CRM repositories inherit from BaseRepository[T].
Parameterized queries only — no raw SQL concatenation.

Usage:
    class ContactRepository(BaseRepository[CRMContact]):
        def __init__(self, session: AsyncSession):
            super().__init__(CRMContact, session)
"""

from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from app.core.pagination import PaginatedResponse, paginate

T = TypeVar("T", bound=SQLModel)


class BaseRepository(Generic[T]):
    """Generic async repository for SQLModel entities."""

    def __init__(self, model: type[T], session: AsyncSession) -> None:
        self._model = model
        self._session = session

    async def get_by_id(self, entity_id: str) -> T | None:
        """Fetch a single entity by ID. Returns None if not found."""
        result = await self._session.execute(
            select(self._model).where(self._model.id == entity_id)  # type: ignore[attr-defined]
        )
        return result.scalars().first()

    async def get_all(
        self,
        *,
        filters: list[Any] | None = None,
        order_by: Any | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> Sequence[T]:
        """Fetch all entities with optional filters, ordering, and offset pagination."""
        query = select(self._model)
        if filters:
            for f in filters:
                query = query.where(f)
        if order_by is not None:
            query = query.order_by(order_by)
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_paginated(
        self,
        *,
        filters: list[Any] | None = None,
        cursor: str | None = None,
        limit: int = 50,
        order_by: Any | None = None,
    ) -> PaginatedResponse[T]:
        """Fetch entities with cursor-based pagination."""
        query = select(self._model)
        if filters:
            for f in filters:
                query = query.where(f)
        return await paginate(
            self._session,
            self._model,
            base_query=query,
            cursor=cursor,
            limit=limit,
            order_by=order_by,
        )

    async def create(self, entity: T) -> T:
        """Insert a new entity and return it."""
        self._session.add(entity)
        await self._session.commit()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: T, updates: dict[str, Any]) -> T:
        """Apply updates to an existing entity (immutable pattern: returns refreshed copy)."""
        for key, value in updates.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        self._session.add(entity)
        await self._session.commit()
        await self._session.refresh(entity)
        return entity

    async def delete(self, entity_id: str) -> bool:
        """Hard-delete an entity by ID. Returns True if found and deleted."""
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return False
        await self._session.delete(entity)
        await self._session.commit()
        return True

    async def exists(self, entity_id: str) -> bool:
        """Check if an entity exists by ID."""
        result = await self._session.execute(
            select(func.count())
            .select_from(self._model)
            .where(self._model.id == entity_id)  # type: ignore[attr-defined]
        )
        return (result.scalar() or 0) > 0

    async def count(self, *, filters: list[Any] | None = None) -> int:
        """Count entities with optional filters."""
        query = select(func.count()).select_from(self._model)
        if filters:
            for f in filters:
                query = query.where(f)
        result = await self._session.execute(query)
        return result.scalar() or 0
