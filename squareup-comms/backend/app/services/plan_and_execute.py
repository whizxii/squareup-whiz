"""Plan-and-execute pattern for complex multi-step agent requests.

When a user's request involves 3+ distinct actions or multiple entities,
the agent generates a numbered plan *before* touching any tools.  The plan
is streamed to the user and, if the confirmation infrastructure is active,
confirmed before execution begins.  The ReAct loop then runs with the plan
injected into context and a boosted iteration budget so every step can
complete.

Designed to be imported exclusively by ``agent_engine.py``.
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Complexity detection heuristics
# ---------------------------------------------------------------------------

_ACTION_WORDS: frozenset[str] = frozenset({
    "create", "add", "update", "send", "schedule", "draft",
    "move", "assign", "delete", "set", "remove", "close",
    "onboard", "configure", "setup", "cancel", "complete",
    "invite", "transfer", "merge", "import", "export",
})

_COMPLEXITY_INDICATORS: frozenset[str] = frozenset({
    "onboard", "set up", "setup", "configure", "create everything",
    "full workflow", "end to end", "end-to-end", "multiple",
    "batch", "all contacts", "for each", "for every", "sequence",
    "pipeline", "process", "step by step", "from scratch",
    "complete setup", "entire", "everything",
})

_ENTITY_WORDS: frozenset[str] = frozenset({
    "contact", "deal", "task", "email", "meeting", "event",
    "reminder", "note", "company", "activity", "calendar",
    "pipeline", "proposal", "invoice",
})

# Minimum number of plan steps before we consider boosting iterations
_MIN_PLAN_STEPS = 3
# Additional ReAct iterations granted per plan step beyond the base budget
_ITERATIONS_PER_STEP = 2
# Absolute cap so a runaway plan doesn't burn the token budget
_MAX_BOOSTED_ITERATIONS = 20


def is_complex_request(content: str) -> bool:
    """Return *True* if *content* probably needs a plan.

    Uses cheap heuristics (word-set intersection) — no LLM call.
    Designed to over-trigger slightly; the plan-generation step can
    always decide the request is simple and return ``None``.
    """
    lower = content.lower()
    words = set(re.findall(r"[a-z]+", lower))

    action_count = len(words & _ACTION_WORDS)
    entity_count = len(words & _ENTITY_WORDS)
    has_indicator = any(ind in lower for ind in _COMPLEXITY_INDICATORS)
    word_count = len(lower.split())

    # 3+ distinct action words
    if action_count >= 3:
        return True
    # Explicit complexity indicator + 2+ actions
    if has_indicator and action_count >= 2:
        return True
    # Many entities + multiple actions
    if entity_count >= 3 and action_count >= 2:
        return True
    # Long request with multiple actions
    if word_count >= 120 and action_count >= 2:
        return True
    return False


# ---------------------------------------------------------------------------
# Plan generation
# ---------------------------------------------------------------------------

_PLAN_SYSTEM = (
    "You are a planning assistant inside a CRM/workspace tool. "
    "When given a complex user request, produce a concise numbered plan "
    "(3-8 steps). Each step must be a single actionable operation that "
    "maps to available tools (CRM, tasks, calendar, email, etc.). "
    "If the request is actually simple (1-2 steps), reply with ONLY the "
    "word SIMPLE — do not generate a plan."
)

_PLAN_USER_TEMPLATE = (
    "User request:\n\n{content}\n\n"
    "Generate a numbered plan to fulfill this request. Format:\n"
    "**Plan:**\n"
    "1. …\n"
    "2. …\n"
    "…\n\n"
    "End with: \"Shall I proceed with this plan?\"\n"
    "If the request is simple (1-2 actions), reply SIMPLE."
)


async def generate_plan(
    llm,
    model: str,
    system_prompt: str,
    content: str,
    temperature: float = 0.3,
) -> str | None:
    """Ask the LLM to produce a numbered plan.

    Returns the plan text (Markdown) or ``None`` if the LLM decides the
    request is simple or if generation fails.

    Parameters
    ----------
    llm:
        An LLM client with a ``chat()`` method.
    model:
        Resolved model name for the client.
    system_prompt:
        The agent's full system prompt (provides personality + tool awareness).
    content:
        The user's original message.
    temperature:
        Lower = more deterministic plans.
    """
    plan_system = f"{system_prompt}\n\n{_PLAN_SYSTEM}"
    plan_user = _PLAN_USER_TEMPLATE.format(content=content)

    try:
        raw = await llm.chat(
            messages=[{"role": "user", "content": plan_user}],
            system=plan_system,
            model=model,
            max_tokens=1024,
            temperature=temperature,
        )
    except Exception:
        logger.warning("Plan generation LLM call failed", exc_info=True)
        return None

    if not raw:
        return None

    text = raw.strip()

    # LLM signals the request is simple
    if text.upper().startswith("SIMPLE"):
        return None

    # Sanity check: must contain at least _MIN_PLAN_STEPS numbered items
    step_count = len(re.findall(r"^\d+\.", text, re.MULTILINE))
    if step_count < _MIN_PLAN_STEPS:
        return None

    return text


# ---------------------------------------------------------------------------
# Plan parsing
# ---------------------------------------------------------------------------

def count_plan_steps(plan_text: str) -> int:
    """Count the numbered steps in a plan."""
    return len(re.findall(r"^\d+\.", plan_text, re.MULTILINE))


def boosted_max_iterations(
    base_max: int,
    plan_step_count: int,
) -> int:
    """Compute a higher iteration budget that can accommodate the plan.

    Grants ``_ITERATIONS_PER_STEP`` extra iterations per plan step but
    never exceeds ``_MAX_BOOSTED_ITERATIONS``.
    """
    boosted = base_max + (plan_step_count * _ITERATIONS_PER_STEP)
    return min(boosted, _MAX_BOOSTED_ITERATIONS)


# ---------------------------------------------------------------------------
# Prompt fragments injected into the ReAct loop after plan approval
# ---------------------------------------------------------------------------

PLAN_EXECUTION_INSTRUCTION = (
    "The user approved your plan. Now execute it step by step.\n\n"
    "For each step:\n"
    "1. Announce which step you are on: \"**Step N:** [description]\"\n"
    "2. Use the appropriate tools to complete the step.\n"
    "3. Briefly confirm what was accomplished before moving to the next step.\n\n"
    "If a step fails, explain the issue and continue with the next step.\n"
    "At the end, provide a short summary of everything accomplished."
)

PLAN_REJECTED_INSTRUCTION = (
    "The user did not approve the plan. "
    "Handle the original request directly using your best judgment. "
    "Keep it simple and efficient."
)
