"""Base service class with shared dependencies.

All CRM services inherit from BaseService. Provides access to:
- AsyncSession for database operations
- EventBus for cross-feature reactions
- BackgroundTaskManager for non-blocking async work

Usage:
    class ContactService(BaseService):
        async def create_contact(self, data: dict) -> CRMContact:
            contact = CRMContact(**data)
            self.session.add(contact)
            await self.session.commit()
            await self.events.emit("contact.created", {"contact_id": contact.id})
            return contact
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.background import BackgroundTaskManager
from app.core.cache import TTLCache
from app.core.events import EventBus


class BaseService:
    """Base class for all CRM service classes."""

    def __init__(
        self,
        session: AsyncSession,
        events: EventBus,
        background: BackgroundTaskManager,
        cache: TTLCache | None = None,
    ) -> None:
        self.session = session
        self.events = events
        self.background = background
        self.cache = cache or TTLCache()
