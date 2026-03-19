"""SmartNotifications — deduplicate, prioritize, and batch WebSocket notifications."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

_DEDUP_WINDOW_SECONDS = 300  # 5 minutes — suppress identical notifications
_PRIORITY_WEIGHTS: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 1,
}


@dataclass(frozen=True)
class Notification:
    user_id: str
    type: str
    title: str
    body: str
    priority: str = "medium"
    entity_id: str | None = None
    entity_type: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class _NotificationRecord:
    notification: Notification
    created_at: datetime = field(default_factory=datetime.utcnow)


class SmartNotificationService:
    """Deduplicates, prioritizes, and batches WebSocket notifications."""

    def __init__(self) -> None:
        # user_id → list of recent records (for dedup)
        self._recent: dict[str, list[_NotificationRecord]] = {}

    def _dedup_key(self, n: Notification) -> str:
        return f"{n.user_id}:{n.type}:{n.entity_id or ''}:{n.title}"

    def _is_duplicate(self, notification: Notification) -> bool:
        """Return True if an identical notification was sent within the dedup window."""
        records = self._recent.get(notification.user_id, [])
        cutoff = datetime.utcnow() - timedelta(seconds=_DEDUP_WINDOW_SECONDS)
        key = self._dedup_key(notification)
        return any(
            r.created_at >= cutoff and self._dedup_key(r.notification) == key
            for r in records
        )

    def _record(self, notification: Notification) -> None:
        records = self._recent.setdefault(notification.user_id, [])
        records.append(_NotificationRecord(notification=notification))
        # Prune old records to avoid unbounded memory growth
        cutoff = datetime.utcnow() - timedelta(seconds=_DEDUP_WINDOW_SECONDS * 2)
        self._recent[notification.user_id] = [
            r for r in records if r.created_at >= cutoff
        ]

    def priority_weight(self, notification: Notification) -> int:
        return _PRIORITY_WEIGHTS.get(notification.priority, 1)

    async def deliver(self, notification: Notification) -> bool:
        """Deliver a notification via WebSocket with dedup guard.

        Returns True if delivered, False if suppressed as duplicate.
        """
        from app.websocket.manager import hub_manager

        if self._is_duplicate(notification):
            logger.debug(
                "Suppressed duplicate notification for user %s: %s",
                notification.user_id, notification.title,
            )
            return False

        self._record(notification)
        await hub_manager.send_to_user(notification.user_id, {
            "type": "notification",
            "notification_type": notification.type,
            "title": notification.title,
            "body": notification.body,
            "priority": notification.priority,
            "entity_id": notification.entity_id,
            "entity_type": notification.entity_type,
            "metadata": notification.metadata,
        })
        logger.debug(
            "Delivered %s notification to user %s: %s",
            notification.priority, notification.user_id, notification.title,
        )
        return True

    async def deliver_batch(self, notifications: list[Notification]) -> int:
        """Deliver a batch of notifications sorted by priority. Returns count delivered."""
        sorted_notifications = sorted(
            notifications,
            key=self.priority_weight,
            reverse=True,
        )
        delivered = 0
        for n in sorted_notifications:
            if await self.deliver(n):
                delivered += 1
        return delivered

    def clear_for_user(self, user_id: str) -> None:
        """Clear dedup history for a user (e.g., on logout)."""
        self._recent.pop(user_id, None)


# Module-level singleton
smart_notifications = SmartNotificationService()
