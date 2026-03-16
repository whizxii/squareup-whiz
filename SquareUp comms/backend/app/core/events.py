"""In-process async event bus for cross-feature reactions.

Usage:
    event_bus = EventBus()
    event_bus.on("contact.created", handle_contact_created)
    await event_bus.emit("contact.created", {"contact_id": "abc"})
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, Callable, Coroutine

from app.core.logging_config import get_logger

logger = get_logger(__name__)

EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class EventBus:
    """Async event bus. Handlers are async, errors logged but don't block emitter."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def on(self, event_type: str, handler: EventHandler) -> None:
        """Register a handler for an event type."""
        self._handlers[event_type].append(handler)
        logger.debug("Registered handler %s for event %s", handler.__name__, event_type)

    def off(self, event_type: str, handler: EventHandler) -> None:
        """Unregister a handler for an event type."""
        handlers = self._handlers.get(event_type, [])
        self._handlers[event_type] = [h for h in handlers if h is not handler]

    async def emit(self, event_type: str, payload: dict[str, Any] | None = None) -> None:
        """Emit an event. All handlers run concurrently; errors are logged, not raised."""
        handlers = self._handlers.get(event_type, [])
        if not handlers:
            return

        safe_payload = payload or {}
        logger.info("Emitting event %s with %d handler(s)", event_type, len(handlers))

        results = await asyncio.gather(
            *(self._safe_call(h, event_type, safe_payload) for h in handlers),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, Exception):
                logger.error("Unhandled exception in event handler: %s", result)

    async def _safe_call(
        self, handler: EventHandler, event_type: str, payload: dict[str, Any]
    ) -> None:
        try:
            await handler(payload)
        except Exception as exc:
            logger.error(
                "Event handler %s failed for %s: %s",
                handler.__name__,
                event_type,
                exc,
                exc_info=True,
            )

    def clear(self) -> None:
        """Remove all handlers. Useful for testing."""
        self._handlers.clear()
