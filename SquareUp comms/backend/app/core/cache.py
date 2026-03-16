"""Simple in-memory TTL cache for expensive queries.

Redis-compatible interface for future swap.

Usage:
    cache = TTLCache()
    cache.set("analytics:overview", data, ttl_seconds=300)
    result = cache.get("analytics:overview")
    cache.invalidate("analytics:*")
"""

from __future__ import annotations

import fnmatch
import time
from typing import Any


class TTLCache:
    """Thread-safe in-memory cache with TTL expiration and pattern invalidation."""

    def __init__(self, default_ttl: int = 300) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> Any | None:
        """Get a value by key. Returns None if expired or missing."""
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Set a value with optional TTL (defaults to default_ttl)."""
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expires_at = time.monotonic() + ttl
        self._store[key] = (value, expires_at)

    def delete(self, key: str) -> bool:
        """Delete a specific key. Returns True if it existed."""
        return self._store.pop(key, None) is not None

    def invalidate(self, pattern: str) -> int:
        """Invalidate all keys matching a glob pattern. Returns count of deleted keys.

        Examples:
            invalidate("analytics:*")  — all analytics keys
            invalidate("contact:123:*")  — all keys for contact 123
        """
        matching = [k for k in self._store if fnmatch.fnmatch(k, pattern)]
        for key in matching:
            del self._store[key]
        return len(matching)

    def clear(self) -> None:
        """Remove all entries."""
        self._store.clear()

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count of removed entries."""
        now = time.monotonic()
        expired = [k for k, (_, exp) in self._store.items() if now > exp]
        for key in expired:
            del self._store[key]
        return len(expired)

    @property
    def size(self) -> int:
        return len(self._store)
