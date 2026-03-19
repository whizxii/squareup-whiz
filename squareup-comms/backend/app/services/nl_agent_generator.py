"""Natural language agent generator — converts a user description into a full agent config."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.core.config import settings
from app.services.llm_service import llm_available, get_llm_client

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GeneratedAgentConfig:
    """Immutable generated agent configuration."""

    name: str
    description: str
    system_prompt: str
    model: str
    tools: list[str]
    trigger_mode: str
    personality: str
    max_iterations: int
    autonomy_level: int
    temperature: float


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_agent_from_description(
    description: str,
    available_tools: list[dict],
) -> GeneratedAgentConfig:
    """Take a natural language description and produce a full agent config.

    Args:
        description: User's plain-English description of what the agent should do.
        available_tools: List of {name, display_name, description, category} dicts.

    Returns:
        GeneratedAgentConfig with all fields populated.

    Raises:
        ValueError: If description is empty or LLM is not available.
        RuntimeError: If LLM response cannot be parsed.
    """
    if not description or not description.strip():
        raise ValueError("Agent description cannot be empty")

    if not llm_available():
        raise ValueError("LLM service is not configured (missing API key)")

    system_prompt = _build_generation_prompt(available_tools)
    user_message = (
        f"Create an agent configuration for the following description:\n\n"
        f"{description.strip()}"
    )

    client = get_llm_client(settings.DEFAULT_MODEL)
    raw_response = await client.chat(
        messages=[{"role": "user", "content": user_message}],
        system=system_prompt,
        model=settings.DEFAULT_MODEL,
        max_tokens=2048,
        temperature=0.3,  # Low temperature for structured output
    )

    return _parse_response(raw_response, available_tools)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _build_generation_prompt(available_tools: list[dict]) -> str:
    """Build the system prompt for the agent generator LLM call."""
    tools_section = _format_tools_for_prompt(available_tools)

    return f"""You are an AI agent configuration generator for SquareUp Comms, a team workspace platform.

Given a user's natural language description of what they want an agent to do, generate a complete agent configuration.

## Available Tools

These are the ONLY tools you can assign. Choose the ones most relevant to the agent's purpose:

{tools_section}

## Output Format

Respond with ONLY a valid JSON object (no markdown, no code fences, no explanation) with these exact keys:

{{
  "name": "Short agent name (2-4 words, title case)",
  "description": "One-sentence description of what this agent does",
  "system_prompt": "Detailed system prompt (3-5 sentences) that instructs the agent on its role, capabilities, tone, and behavior patterns",
  "model": "claude-sonnet-4-6",
  "tools": ["tool_name_1", "tool_name_2"],
  "trigger_mode": "mention",
  "personality": "One-word personality: professional | friendly | concise | creative | analytical",
  "max_iterations": 5,
  "autonomy_level": 2,
  "temperature": 0.7
}}

## Guidelines

- **name**: Concise, descriptive (e.g. "Sales Assistant", "Meeting Scheduler", "Task Manager")
- **system_prompt**: Write as if speaking TO the agent. Be specific about capabilities and tone. Reference the tools the agent has access to.
- **tools**: Select 3-12 tools from the available list. Choose tools that match the described use case.
- **trigger_mode**: "mention" (default — responds when @mentioned), "auto" (responds to all messages in assigned channels), "scheduled" (runs on a cron schedule)
- **autonomy_level**: 1 (ask before all actions), 2 (ask before writes/sends), 3 (auto, ask for destructive), 4 (full auto). Default 2.
- **max_iterations**: How many tool-call loops the agent can do per invocation. 3-5 for simple tasks, 5-10 for complex workflows.
- **temperature**: 0.3 for analytical/data tasks, 0.5 for balanced, 0.7 for creative/writing tasks."""


def _format_tools_for_prompt(tools: list[dict]) -> str:
    """Format available tools into a readable list for the prompt."""
    if not tools:
        return "(No tools available)"

    # Group by category
    by_category: dict[str, list[dict]] = {}
    for tool in tools:
        category = tool.get("category", "other")
        by_category.setdefault(category, []).append(tool)

    lines: list[str] = []
    for category in sorted(by_category):
        lines.append(f"\n### {category.upper()}")
        for tool in by_category[category]:
            lines.append(f"- `{tool['name']}`: {tool['description']}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

_VALID_TRIGGER_MODES = {"mention", "auto", "scheduled", "webhook"}
_VALID_PERSONALITIES = {"professional", "friendly", "concise", "creative", "analytical"}


def _parse_response(
    raw: str,
    available_tools: list[dict],
) -> GeneratedAgentConfig:
    """Parse the LLM JSON response into a GeneratedAgentConfig.

    Validates and clamps all fields to safe ranges.
    """
    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        # Remove opening fence (with optional language tag)
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse NL agent generator response: %s", raw[:500])
        raise RuntimeError(
            f"Failed to parse agent configuration from AI response: {exc}"
        ) from exc

    if not isinstance(data, dict):
        raise RuntimeError("AI response was not a JSON object")

    # Validate and extract fields with safe defaults
    valid_tool_names = {t["name"] for t in available_tools}
    raw_tools = data.get("tools", [])
    validated_tools = [t for t in raw_tools if t in valid_tool_names]

    trigger_mode = data.get("trigger_mode", "mention")
    if trigger_mode not in _VALID_TRIGGER_MODES:
        trigger_mode = "mention"

    personality = data.get("personality", "professional")
    if personality not in _VALID_PERSONALITIES:
        personality = "professional"

    max_iterations = data.get("max_iterations", 5)
    if not isinstance(max_iterations, int) or max_iterations < 1:
        max_iterations = 5
    max_iterations = min(max_iterations, 20)

    autonomy_level = data.get("autonomy_level", 2)
    if not isinstance(autonomy_level, int) or autonomy_level < 1:
        autonomy_level = 2
    autonomy_level = min(autonomy_level, 4)

    temperature = data.get("temperature", 0.7)
    if not isinstance(temperature, (int, float)):
        temperature = 0.7
    temperature = max(0.0, min(1.0, float(temperature)))

    return GeneratedAgentConfig(
        name=str(data.get("name", "Custom Agent"))[:100],
        description=str(data.get("description", "AI-generated agent"))[:500],
        system_prompt=str(data.get("system_prompt", "You are a helpful assistant.")),
        model=str(data.get("model", "claude-sonnet-4-6")),
        tools=validated_tools,
        trigger_mode=trigger_mode,
        personality=personality,
        max_iterations=max_iterations,
        autonomy_level=autonomy_level,
        temperature=temperature,
    )
