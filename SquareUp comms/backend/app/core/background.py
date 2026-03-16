"""Background task runner using asyncio.

Non-blocking execution for AI scoring, enrichment, transcription, etc.
Supports one-off tasks and periodic scheduling.

Usage:
    bg = BackgroundTaskManager()
    bg.enqueue(some_coroutine(args))
    bg.schedule_periodic(my_job_factory, interval_seconds=300, name="gmail-sync")
    bg.cancel_periodic("gmail-sync")
    await bg.shutdown()  # graceful stop
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable, Coroutine

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class BackgroundTaskManager:
    """Manages async background tasks with error logging and graceful shutdown."""

    def __init__(self) -> None:
        self._tasks: set[asyncio.Task[Any]] = set()
        self._periodic: dict[str, asyncio.Task[Any]] = {}

    def enqueue(self, coro: Coroutine[Any, Any, Any], *, name: str | None = None) -> asyncio.Task[Any]:
        """Schedule a coroutine as a background task.

        Args:
            coro: The coroutine to run in the background.
            name: Optional name for logging.

        Returns:
            The created asyncio.Task.
        """
        task = asyncio.create_task(coro, name=name)
        self._tasks.add(task)
        task.add_done_callback(self._on_task_done)
        logger.info("Background task enqueued: %s", name or task.get_name())
        return task

    def schedule_periodic(
        self,
        coro_factory: Callable[[], Coroutine[Any, Any, Any]],
        interval_seconds: float,
        *,
        name: str,
        run_immediately: bool = False,
    ) -> None:
        """Schedule a coroutine factory to run every `interval_seconds`.

        Args:
            coro_factory: Callable that returns a fresh coroutine each invocation.
            interval_seconds: Time between executions.
            name: Unique name for this periodic task.
            run_immediately: If True, run once immediately before starting the interval loop.
        """
        if name in self._periodic:
            logger.warning("Periodic task %s already scheduled — skipping", name)
            return

        async def _loop() -> None:
            if not run_immediately:
                await asyncio.sleep(interval_seconds)
            while True:
                try:
                    logger.debug("Periodic task %s executing", name)
                    await coro_factory()
                except Exception as exc:
                    logger.error("Periodic task %s failed: %s", name, exc, exc_info=True)
                await asyncio.sleep(interval_seconds)

        task = asyncio.create_task(_loop(), name=f"periodic:{name}")
        self._periodic[name] = task
        logger.info("Periodic task scheduled: %s (every %ds)", name, interval_seconds)

    def cancel_periodic(self, name: str) -> bool:
        """Cancel a periodic task by name. Returns True if it was found and cancelled."""
        task = self._periodic.pop(name, None)
        if task is None:
            return False
        task.cancel()
        logger.info("Periodic task cancelled: %s", name)
        return True

    def _on_task_done(self, task: asyncio.Task[Any]) -> None:
        self._tasks.discard(task)
        if task.cancelled():
            logger.info("Background task cancelled: %s", task.get_name())
            return
        exc = task.exception()
        if exc:
            logger.error(
                "Background task %s failed: %s",
                task.get_name(),
                exc,
                exc_info=exc,
            )
        else:
            logger.info("Background task completed: %s", task.get_name())

    @property
    def active_count(self) -> int:
        return len(self._tasks) + len(self._periodic)

    async def shutdown(self, timeout: float = 10.0) -> None:
        """Cancel all running and periodic tasks and wait for them to finish."""
        all_tasks = set(self._tasks)
        for task in self._periodic.values():
            all_tasks.add(task)

        if not all_tasks:
            return

        logger.info("Shutting down %d background task(s)...", len(all_tasks))
        for task in all_tasks:
            task.cancel()

        await asyncio.wait(all_tasks, timeout=timeout)
        remaining = [t for t in all_tasks if not t.done()]
        if remaining:
            logger.warning("%d background task(s) did not finish in time", len(remaining))
        self._tasks.clear()
        self._periodic.clear()
