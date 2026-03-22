"""Tool result caching — transparent TTL cache for read-only tools.

Cacheable tools get their results stored for a short window so repeated
identical queries (e.g. "how many contacts?") skip the DB round-trip.
Mutation tools trigger invalidation of related cache entries.

The cache lives at module level and is shared across all tool executions.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from app.core.cache import TTLCache

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level cache instance (shared across all tool executions)
# ---------------------------------------------------------------------------

_tool_cache = TTLCache(default_ttl=120)  # 2-minute default


# ---------------------------------------------------------------------------
# Cacheable tool definitions
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CachePolicy:
    """Cache policy for a single tool."""

    ttl_seconds: int
    key_prefix: str


# Tools whose results are safe to cache (read-only, deterministic).
# Key = tool name, Value = cache policy.
CACHEABLE_TOOLS: dict[str, CachePolicy] = {
    # Analytics — aggregated queries, rarely change within minutes
    "get_deal_metrics": CachePolicy(ttl_seconds=300, key_prefix="analytics:deals"),
    "get_contact_stats": CachePolicy(ttl_seconds=300, key_prefix="analytics:contacts"),
    "get_pipeline_summary": CachePolicy(ttl_seconds=300, key_prefix="analytics:pipeline"),

    # CRM reads — single lookups and searches
    "crm_search_contacts": CachePolicy(ttl_seconds=120, key_prefix="crm:search"),
    "crm_get_contact": CachePolicy(ttl_seconds=180, key_prefix="crm:contact"),
    "crm_count_contacts": CachePolicy(ttl_seconds=300, key_prefix="crm:count"),
    "crm_list_deals": CachePolicy(ttl_seconds=120, key_prefix="crm:deals"),
    "crm_search_companies": CachePolicy(ttl_seconds=180, key_prefix="crm:companies"),
    "crm_get_pipeline": CachePolicy(ttl_seconds=600, key_prefix="crm:pipeline"),

    # Knowledge — search results
    "search_workspace": CachePolicy(ttl_seconds=120, key_prefix="knowledge:workspace"),
    "search_crm_notes": CachePolicy(ttl_seconds=120, key_prefix="knowledge:notes"),
    "get_contact_history": CachePolicy(ttl_seconds=120, key_prefix="knowledge:history"),

    # Calendar reads
    "list_calendar_events": CachePolicy(ttl_seconds=120, key_prefix="calendar:events"),
    "check_availability": CachePolicy(ttl_seconds=60, key_prefix="calendar:avail"),

    # Task/reminder reads
    "list_tasks": CachePolicy(ttl_seconds=60, key_prefix="tasks:list"),
    "list_reminders": CachePolicy(ttl_seconds=60, key_prefix="reminders:list"),

    # Channel reads
    "list_channels": CachePolicy(ttl_seconds=300, key_prefix="channels:list"),
    "get_channel_info": CachePolicy(ttl_seconds=120, key_prefix="channels:info"),
    "search_messages": CachePolicy(ttl_seconds=60, key_prefix="channels:search"),

    # User reads
    "list_team_members": CachePolicy(ttl_seconds=300, key_prefix="users:team"),
}


# Mutation tools and the cache patterns they invalidate.
# When a mutation tool runs successfully, all matching patterns are cleared.
INVALIDATION_MAP: dict[str, list[str]] = {
    # CRM mutations
    "crm_create_contact": ["crm:*", "analytics:contacts:*"],
    "crm_update_contact": ["crm:*", "analytics:contacts:*", "knowledge:*"],
    "crm_create_deal": ["crm:deals:*", "analytics:*"],
    "crm_update_deal_stage": ["crm:deals:*", "analytics:*", "crm:pipeline:*"],
    "crm_add_note": ["crm:contact:*", "knowledge:notes:*"],
    "crm_log_activity": ["knowledge:history:*"],

    # Task mutations
    "create_task": ["tasks:*"],
    "update_task": ["tasks:*"],
    "complete_task": ["tasks:*"],
    "assign_task": ["tasks:*"],

    # Reminder mutations
    "set_reminder": ["reminders:*"],
    "cancel_reminder": ["reminders:*"],

    # Calendar mutations
    "create_calendar_event": ["calendar:*"],
    "update_calendar_event": ["calendar:*"],

    # Email chain processing (creates contacts, tasks, activities)
    "process_email_chain": ["crm:*", "tasks:*", "analytics:*", "knowledge:*"],

    # Channel mutations
    "send_channel_message": ["channels:search:*"],
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_cache_key(tool_name: str, tool_input: dict) -> str:
    """Build a deterministic cache key from tool name + input."""
    policy = CACHEABLE_TOOLS.get(tool_name)
    prefix = policy.key_prefix if policy else tool_name
    # Sort keys for determinism
    input_str = json.dumps(tool_input, sort_keys=True, default=str)
    return f"{prefix}:{input_str}"


def get_cached_result(tool_name: str, tool_input: dict) -> Any | None:
    """Return cached ToolResult dict if available, else None."""
    if tool_name not in CACHEABLE_TOOLS:
        return None

    key = build_cache_key(tool_name, tool_input)
    cached = _tool_cache.get(key)
    if cached is not None:
        logger.debug("Cache HIT: %s", key[:80])
    return cached


def store_result(
    tool_name: str, tool_input: dict, result: Any,
) -> None:
    """Store a successful tool result in cache."""
    policy = CACHEABLE_TOOLS.get(tool_name)
    if policy is None:
        return

    key = build_cache_key(tool_name, tool_input)
    _tool_cache.set(key, result, ttl_seconds=policy.ttl_seconds)
    logger.debug("Cache SET: %s (ttl=%ds)", key[:80], policy.ttl_seconds)


def invalidate_for_tool(tool_name: str) -> int:
    """Invalidate cached entries affected by a mutation tool. Returns count."""
    patterns = INVALIDATION_MAP.get(tool_name)
    if not patterns:
        return 0

    total = 0
    for pattern in patterns:
        count = _tool_cache.invalidate(pattern)
        total += count
    if total > 0:
        logger.debug("Cache INVALIDATE: %s cleared %d entries", tool_name, total)
    return total


def clear_all() -> None:
    """Clear the entire tool cache."""
    _tool_cache.clear()


def cache_stats() -> dict[str, int]:
    """Return basic cache statistics."""
    expired = _tool_cache.cleanup_expired()
    return {"size": _tool_cache.size, "expired_cleaned": expired}
