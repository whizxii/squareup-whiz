"""Tests for core utility modules: TTLCache, EventBus, BackgroundTaskManager, pagination."""

import asyncio
import base64
import time

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import TTLCache
from app.core.events import EventBus
from app.core.background import BackgroundTaskManager
from app.core.pagination import encode_cursor, decode_cursor


# ===========================================================================
# TTLCache
# ===========================================================================


class TestTTLCache:
    """Unit tests for the in-memory TTL cache."""

    def test_set_and_get(self):
        cache = TTLCache(default_ttl=60)
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_get_missing_returns_none(self):
        cache = TTLCache()
        assert cache.get("nonexistent") is None

    def test_get_expired_returns_none(self):
        cache = TTLCache(default_ttl=0)
        cache.set("key", "val", ttl_seconds=0)
        # Force expiration by sleeping a tiny bit
        time.sleep(0.01)
        assert cache.get("key") is None

    def test_custom_ttl_overrides_default(self):
        cache = TTLCache(default_ttl=0)
        cache.set("key", "val", ttl_seconds=600)
        assert cache.get("key") == "val"

    def test_delete_existing_key(self):
        cache = TTLCache()
        cache.set("key", "val")
        assert cache.delete("key") is True
        assert cache.get("key") is None

    def test_delete_nonexistent_key(self):
        cache = TTLCache()
        assert cache.delete("nope") is False

    def test_invalidate_by_pattern(self):
        cache = TTLCache()
        cache.set("analytics:overview", "data1")
        cache.set("analytics:detail", "data2")
        cache.set("contacts:list", "data3")

        count = cache.invalidate("analytics:*")
        assert count == 2
        assert cache.get("analytics:overview") is None
        assert cache.get("analytics:detail") is None
        assert cache.get("contacts:list") == "data3"

    def test_invalidate_no_match(self):
        cache = TTLCache()
        cache.set("key", "val")
        assert cache.invalidate("nomatch:*") == 0

    def test_clear_removes_all(self):
        cache = TTLCache()
        cache.set("a", 1)
        cache.set("b", 2)
        cache.clear()
        assert cache.size == 0
        assert cache.get("a") is None

    def test_cleanup_expired(self):
        cache = TTLCache()
        cache.set("fresh", "val", ttl_seconds=600)
        cache.set("stale", "val", ttl_seconds=0)
        time.sleep(0.01)
        removed = cache.cleanup_expired()
        assert removed == 1
        assert cache.get("fresh") == "val"
        assert cache.size == 1

    def test_size_property(self):
        cache = TTLCache()
        assert cache.size == 0
        cache.set("a", 1)
        cache.set("b", 2)
        assert cache.size == 2

    def test_overwrite_key(self):
        cache = TTLCache()
        cache.set("key", "old")
        cache.set("key", "new")
        assert cache.get("key") == "new"
        assert cache.size == 1


# ===========================================================================
# EventBus
# ===========================================================================


class TestEventBus:
    """Tests for the async event bus."""

    @pytest.mark.asyncio
    async def test_on_and_emit(self):
        bus = EventBus()
        received = []

        async def handler(payload):
            received.append(payload)

        bus.on("test.event", handler)
        await bus.emit("test.event", {"key": "value"})
        assert len(received) == 1
        assert received[0] == {"key": "value"}

    @pytest.mark.asyncio
    async def test_emit_no_handlers(self):
        """Emitting an event with no handlers does nothing (no error)."""
        bus = EventBus()
        await bus.emit("nothing.registered")

    @pytest.mark.asyncio
    async def test_emit_multiple_handlers(self):
        bus = EventBus()
        results = []

        async def handler_a(payload):
            results.append("a")

        async def handler_b(payload):
            results.append("b")

        bus.on("multi", handler_a)
        bus.on("multi", handler_b)
        await bus.emit("multi", {})
        assert sorted(results) == ["a", "b"]

    @pytest.mark.asyncio
    async def test_off_removes_handler(self):
        bus = EventBus()
        called = []

        async def handler(payload):
            called.append(True)

        bus.on("event", handler)
        bus.off("event", handler)
        await bus.emit("event", {})
        assert called == []

    @pytest.mark.asyncio
    async def test_off_nonexistent_event(self):
        """Removing handler from event that doesn't exist doesn't crash."""
        bus = EventBus()

        async def handler(payload):
            pass

        bus.off("no_such_event", handler)

    @pytest.mark.asyncio
    async def test_emit_handler_error_logged_not_raised(self):
        """A failing handler doesn't prevent other handlers or crash emit."""
        bus = EventBus()
        results = []

        async def failing_handler(payload):
            raise ValueError("boom")

        async def good_handler(payload):
            results.append("ok")

        bus.on("event", failing_handler)
        bus.on("event", good_handler)

        # Should not raise
        await bus.emit("event", {})
        assert results == ["ok"]

    @pytest.mark.asyncio
    async def test_emit_with_none_payload(self):
        bus = EventBus()
        received = []

        async def handler(payload):
            received.append(payload)

        bus.on("test", handler)
        await bus.emit("test", None)
        assert received == [{}]

    @pytest.mark.asyncio
    async def test_clear_removes_all_handlers(self):
        bus = EventBus()

        async def handler(payload):
            pass

        bus.on("a", handler)
        bus.on("b", handler)
        bus.clear()
        # No handlers left
        assert bus._handlers == {}


# ===========================================================================
# BackgroundTaskManager
# ===========================================================================


class TestBackgroundTaskManager:
    """Tests for the background task manager."""

    @pytest.mark.asyncio
    async def test_enqueue_runs_task(self):
        bg = BackgroundTaskManager()
        result = []

        async def work():
            result.append("done")

        task = bg.enqueue(work(), name="test-work")
        await task
        assert result == ["done"]

    @pytest.mark.asyncio
    async def test_active_count(self):
        bg = BackgroundTaskManager()
        event = asyncio.Event()

        async def wait_for_event():
            await event.wait()

        bg.enqueue(wait_for_event(), name="waiter")
        # Task is running, so active_count should be 1
        assert bg.active_count >= 1
        event.set()
        # Wait briefly for cleanup
        await asyncio.sleep(0.05)
        assert bg.active_count == 0

    @pytest.mark.asyncio
    async def test_shutdown_cancels_tasks(self):
        bg = BackgroundTaskManager()

        async def long_running():
            await asyncio.sleep(100)

        bg.enqueue(long_running(), name="long")
        assert bg.active_count == 1

        await bg.shutdown(timeout=1.0)
        assert bg.active_count == 0

    @pytest.mark.asyncio
    async def test_shutdown_empty(self):
        bg = BackgroundTaskManager()
        await bg.shutdown()  # Should not error

    @pytest.mark.asyncio
    async def test_failed_task_is_cleaned_up(self):
        bg = BackgroundTaskManager()

        async def failing():
            raise RuntimeError("task failed")

        task = bg.enqueue(failing(), name="failing-task")
        # Wait for it to complete
        await asyncio.sleep(0.05)
        assert bg.active_count == 0

    @pytest.mark.asyncio
    async def test_enqueue_without_name(self):
        bg = BackgroundTaskManager()
        result = []

        async def work():
            result.append(1)

        task = bg.enqueue(work())
        await task
        assert result == [1]


# ===========================================================================
# Pagination helpers
# ===========================================================================


class TestPaginationHelpers:
    """Tests for encode_cursor / decode_cursor."""

    def test_encode_decode_roundtrip(self):
        original = "some-uuid-value-123"
        encoded = encode_cursor(original)
        decoded = decode_cursor(encoded)
        assert decoded == original

    def test_encode_produces_url_safe_string(self):
        encoded = encode_cursor("test/value+special=chars")
        # URL-safe base64 should not contain +, /, or newlines
        assert "+" not in encoded.rstrip("=")
        assert "/" not in encoded.rstrip("=")

    def test_decode_invalid_base64_raises(self):
        with pytest.raises(Exception):
            decode_cursor("not-valid-base64!!!")

    def test_encode_empty_string(self):
        encoded = encode_cursor("")
        assert decode_cursor(encoded) == ""
