"""SmartNotifications — deduplicate, prioritize, and deliver via multiple channels.

Channels: in-app (WebSocket), browser push, email.
Delivery is governed by per-user notification preferences stored in UserProfile.
"""

from __future__ import annotations

import json as _json
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

# Default channel preferences per notification type
_DEFAULT_CHANNELS: dict[str, dict[str, bool]] = {
    "mentions":         {"in_app": True, "browser_push": True,  "email": False},
    "dms":              {"in_app": True, "browser_push": True,  "email": False},
    "agent_updates":    {"in_app": True, "browser_push": False, "email": False},
    "channel_messages": {"in_app": True, "browser_push": False, "email": False},
    "task_assigned":    {"in_app": True, "browser_push": True,  "email": True},
    "task_completed":   {"in_app": True, "browser_push": True,  "email": False},
    "task_commented":   {"in_app": True, "browser_push": False, "email": False},
    "task_mention":     {"in_app": True, "browser_push": True,  "email": True},
    "task_overdue":     {"in_app": True, "browser_push": True,  "email": True},
}
_FALLBACK_CHANNELS: dict[str, bool] = {"in_app": True, "browser_push": False, "email": False}


async def _resolve_channels(user_id: str, notification_type: str) -> dict[str, bool]:
    """Determine which channels to deliver to based on user preferences.

    Reads UserProfile.notification_prefs from DB. Falls back to defaults
    if user has no profile or no preference for this type.
    """
    try:
        from app.core.db import async_session
        from app.models.users import UserProfile

        async with async_session() as session:
            user = await session.get(UserProfile, user_id)
            if user and user.notification_prefs:
                prefs = _json.loads(user.notification_prefs)
                if notification_type in prefs:
                    type_pref = prefs[notification_type]
                    # Handle old flat-boolean format gracefully
                    if isinstance(type_pref, bool):
                        return {"in_app": type_pref, "browser_push": False, "email": False}
                    return {
                        "in_app": type_pref.get("in_app", True),
                        "browser_push": type_pref.get("browser_push", False),
                        "email": type_pref.get("email", False),
                    }
    except Exception:
        logger.warning("Failed to resolve prefs for %s, using defaults", user_id, exc_info=True)

    return dict(_DEFAULT_CHANNELS.get(notification_type, _FALLBACK_CHANNELS))


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
        """Deliver a notification via configured channels with dedup guard.

        Channels: in-app (WebSocket), browser push (flag), email (background).
        Returns True if delivered to at least one channel, False if suppressed.
        """
        from app.websocket.manager import hub_manager

        if self._is_duplicate(notification):
            logger.debug(
                "Suppressed duplicate notification for user %s: %s",
                notification.user_id, notification.title,
            )
            return False

        self._record(notification)

        # Resolve per-user channel preferences
        channels = await _resolve_channels(notification.user_id, notification.type)

        # In-app (WebSocket) delivery
        if channels["in_app"]:
            await hub_manager.send_to_user(notification.user_id, {
                "type": "notification",
                "notification_type": notification.type,
                "title": notification.title,
                "body": notification.body,
                "priority": notification.priority,
                "entity_id": notification.entity_id,
                "entity_type": notification.entity_type,
                "metadata": notification.metadata,
                "browser_push": channels["browser_push"],
            })

        # Email delivery (fire-and-forget background task)
        if channels["email"]:
            try:
                from app.core.shared_infra import get_background
                from app.services.email_notification_service import send_notification_email

                get_background().enqueue(
                    send_notification_email(
                        user_id=notification.user_id,
                        notification_type=notification.type,
                        title=notification.title,
                        body=notification.body,
                    ),
                    name=f"email-notif-{notification.user_id}-{notification.type}",
                )
            except Exception:
                logger.warning(
                    "Failed to enqueue email notification for %s",
                    notification.user_id, exc_info=True,
                )

        logger.debug(
            "Delivered %s notification to user %s: %s (channels: %s)",
            notification.priority, notification.user_id, notification.title, channels,
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
