"""Intent router — classifies messages before loading tools.

Two-phase approach:
  Phase 1: Lightweight LLM call (no tools) to classify the message intent.
  Phase 2: Only if the intent is "task", load the relevant tool categories.

This dramatically reduces token usage — a casual "hey" uses ~200 tokens
instead of ~20K+ tokens from sending all 50+ tool schemas every time.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class IntentResult:
    """Immutable classification result from the intent router."""

    intent: str  # "chat" or "task"
    categories: tuple[str, ...]  # tool categories needed (empty for chat)


# ---------------------------------------------------------------------------
# Category mapping: router categories → registry tool categories
# ---------------------------------------------------------------------------

CATEGORY_MAP: dict[str, list[str]] = {
    "crm": ["crm"],
    "calendar": ["calendar"],
    "email": ["email"],
    "tasks": ["tasks", "productivity"],
    "communication": ["communication"],
    "knowledge": ["knowledge"],
    "analytics": ["analytics"],
    "team": ["team", "agents"],
    "utility": ["utility"],
    "ai": ["ai_insights", "ai_autonomous", "intelligence"],
    "workflow": ["workflow", "system"],
}

VALID_CATEGORIES = frozenset(CATEGORY_MAP.keys())

# Fall back to all categories when classification fails
_ALL_CATEGORIES = tuple(VALID_CATEGORIES)


# ---------------------------------------------------------------------------
# Classification prompt — kept minimal to use ~100 output tokens max
# ---------------------------------------------------------------------------

CLASSIFICATION_SYSTEM_PROMPT = """\
You are an intent classifier. Given a user message sent to an AI assistant, \
output ONLY a JSON object (no markdown, no explanation).

Classify as:
- "chat" — greetings, thanks, questions about capabilities, opinions, casual talk. No data lookup or action needed.
- "task" — requires looking up data, creating/updating records, scheduling, searching, or any concrete action.

If "task", include which categories are needed:
  crm — contacts, deals, companies, pipeline, notes, activities
  calendar — events, meetings, availability
  email — drafting, sending, searching emails
  tasks — tasks, reminders, to-dos
  communication — channel messages, searching chat history
  knowledge — workspace search, CRM notes, contact history
  analytics — deal metrics, pipeline stats, reports
  team — team members, user profiles
  utility — date/time calculations
  ai — AI insights, forecasts, coaching, analysis
  workflow — triggering workflows

Rules:
- "yes", "do it", "go ahead", "ok" → task (confirming a prior action)
- "how many contacts?", "show pipeline" → task (data lookup)
- "hey", "thanks", "what can you do?" → chat

Output format:
{"intent":"chat"}
{"intent":"task","categories":["crm","calendar"]}"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def classify_intent(
    llm_client,
    message: str,
    recent_context: list[dict] | None = None,
) -> IntentResult:
    """Classify a user message as chat or task with needed tool categories.

    Uses a lightweight LLM call (~200 tokens) with no tools.
    Falls back to "task" with all categories on any failure.
    """
    # Build minimal message list (last 2 msgs for follow-up context)
    messages: list[dict] = []
    if recent_context:
        for msg in recent_context[-2:]:
            messages.append(msg)
    messages.append({"role": "user", "content": message})

    try:
        raw = await llm_client.chat(
            messages=messages,
            system=CLASSIFICATION_SYSTEM_PROMPT,
            max_tokens=80,
            temperature=0.0,
        )

        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(text)
        intent = result.get("intent", "task")

        if intent == "chat":
            logger.info("Intent router → CHAT (skipping tools)")
            return IntentResult(intent="chat", categories=())

        # Validate and normalise categories
        raw_cats = result.get("categories", [])
        cats = [c for c in raw_cats if c in VALID_CATEGORIES]

        # Always include utility for tasks (datetime often needed)
        if cats and "utility" not in cats:
            cats.append("utility")

        logger.info("Intent router → TASK categories=%s", cats)
        return IntentResult(intent="task", categories=tuple(cats))

    except Exception as exc:
        # Safe fallback: load ALL tools (same behaviour as before this feature)
        logger.warning("Intent router failed, loading all tools: %s", exc)
        return IntentResult(intent="task", categories=_ALL_CATEGORIES)


def filter_tools_by_categories(
    tools: list,
    categories: tuple[str, ...],
) -> list:
    """Filter ToolDefinitions to only those whose category matches.

    Maps router-level categories to registry-level categories via CATEGORY_MAP,
    then keeps only tools whose ``category`` attribute is in the allowed set.
    """
    if not categories:
        return tools  # no filtering requested

    allowed: set[str] = set()
    for cat in categories:
        allowed.update(CATEGORY_MAP.get(cat, [cat]))

    return [t for t in tools if t.category in allowed]
