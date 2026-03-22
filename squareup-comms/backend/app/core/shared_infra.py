"""Shared infrastructure singletons for use outside request context.

App startup calls ``init()`` to set the real EventBus, BackgroundTaskManager,
and TTLCache instances.  Tool handlers, the scheduler, and other non-request
code import ``get_event_bus()`` / ``get_background()`` / ``get_cache()`` instead
of creating throwaway instances whose events go nowhere.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.logging_config import get_logger

if TYPE_CHECKING:
    from app.core.background import BackgroundTaskManager
    from app.core.cache import TTLCache
    from app.core.events import EventBus

logger = get_logger(__name__)

_event_bus: EventBus | None = None
_background: BackgroundTaskManager | None = None
_cache: TTLCache | None = None


def init(
    event_bus: EventBus,
    background: BackgroundTaskManager,
    cache: TTLCache | None = None,
) -> None:
    """Called once during app startup to store shared instances."""
    global _event_bus, _background, _cache  # noqa: PLW0603
    _event_bus = event_bus
    _background = background
    _cache = cache
    logger.info("Shared infrastructure initialized.")


def get_event_bus() -> EventBus:
    """Return the app-wide EventBus.  Falls back to a fresh instance if init() was never called."""
    if _event_bus is None:
        from app.core.events import EventBus as _EB

        logger.warning("shared_infra.get_event_bus() called before init() — returning throwaway EventBus")
        return _EB()
    return _event_bus


def get_background() -> BackgroundTaskManager:
    """Return the app-wide BackgroundTaskManager.  Falls back to a fresh instance."""
    if _background is None:
        from app.core.background import BackgroundTaskManager as _BG

        logger.warning("shared_infra.get_background() called before init() — returning throwaway BackgroundTaskManager")
        return _BG()
    return _background


def get_cache() -> TTLCache | None:
    """Return the app-wide TTLCache (may be None if not configured)."""
    return _cache
