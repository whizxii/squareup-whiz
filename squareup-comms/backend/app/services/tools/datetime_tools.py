"""Date/time utility tools for temporal reasoning."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def get_current_time(inp: dict, ctx: ToolContext) -> ToolResult:
    """Return the current UTC date and time."""
    now = datetime.utcnow()
    return ToolResult(success=True, output={
        "utc": now.isoformat() + "Z",
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "day_of_week": now.strftime("%A"),
    })


async def calculate_date(inp: dict, ctx: ToolContext) -> ToolResult:
    """Add or subtract days/hours/minutes from a reference date (default: now)."""
    base_str = inp.get("base_date")
    days = inp.get("days", 0)
    hours = inp.get("hours", 0)
    minutes = inp.get("minutes", 0)

    if base_str:
        try:
            base = datetime.fromisoformat(base_str.replace("Z", "+00:00").replace("+00:00", ""))
        except ValueError:
            return ToolResult(success=False, output=None, error=f"Invalid date format: {base_str}")
    else:
        base = datetime.utcnow()

    result = base + timedelta(days=days, hours=hours, minutes=minutes)
    return ToolResult(success=True, output={
        "result": result.isoformat() + "Z",
        "date": result.strftime("%Y-%m-%d"),
        "time": result.strftime("%H:%M:%S"),
        "day_of_week": result.strftime("%A"),
    })


async def parse_relative_date(inp: dict, ctx: ToolContext) -> ToolResult:
    """Parse common relative date phrases into absolute dates.

    Supports: "tomorrow", "next week", "in 3 days", "next monday", etc.
    """
    phrase = inp.get("phrase", "").lower().strip()
    now = datetime.utcnow()

    if not phrase:
        return ToolResult(success=False, output=None, error="phrase is required")

    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }

    result: datetime | None = None

    if phrase == "today":
        result = now
    elif phrase == "tomorrow":
        result = now + timedelta(days=1)
    elif phrase == "yesterday":
        result = now - timedelta(days=1)
    elif phrase == "next week":
        result = now + timedelta(weeks=1)
    elif phrase == "next month":
        month = now.month % 12 + 1
        year = now.year + (1 if now.month == 12 else 0)
        result = now.replace(month=month, year=year, day=1)
    elif phrase.startswith("in ") and phrase.endswith(" days"):
        try:
            n = int(phrase.split()[1])
            result = now + timedelta(days=n)
        except (ValueError, IndexError):
            pass
    elif phrase.startswith("in ") and phrase.endswith(" hours"):
        try:
            n = int(phrase.split()[1])
            result = now + timedelta(hours=n)
        except (ValueError, IndexError):
            pass
    else:
        # Try "next <weekday>"
        for day_name, day_num in day_map.items():
            if day_name in phrase:
                days_ahead = (day_num - now.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                result = now + timedelta(days=days_ahead)
                break

    if result is None:
        return ToolResult(
            success=False,
            output=None,
            error=f"Could not parse relative date phrase: '{phrase}'",
        )

    return ToolResult(success=True, output={
        "result": result.isoformat() + "Z",
        "date": result.strftime("%Y-%m-%d"),
        "day_of_week": result.strftime("%A"),
        "original_phrase": phrase,
    })


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    """Register all datetime tools."""

    registry.register_builtin(ToolDefinition(
        name="get_current_time",
        display_name="Get Current Time",
        description="Get the current UTC date and time, including the day of the week.",
        category="utility",
        input_schema={
            "type": "object",
            "properties": {},
        },
        handler=get_current_time,
    ))

    registry.register_builtin(ToolDefinition(
        name="calculate_date",
        display_name="Calculate Date",
        description="Add or subtract days, hours, or minutes from a date. If no base_date is provided, uses the current time.",
        category="utility",
        input_schema={
            "type": "object",
            "properties": {
                "base_date": {"type": "string", "description": "ISO 8601 date string (omit for now)"},
                "days": {"type": "integer", "description": "Days to add (negative to subtract)", "default": 0},
                "hours": {"type": "integer", "description": "Hours to add", "default": 0},
                "minutes": {"type": "integer", "description": "Minutes to add", "default": 0},
            },
        },
        handler=calculate_date,
    ))

    registry.register_builtin(ToolDefinition(
        name="parse_relative_date",
        display_name="Parse Relative Date",
        description="Convert a natural language date phrase like 'tomorrow', 'next week', 'in 3 days', or 'next Monday' into an absolute date.",
        category="utility",
        input_schema={
            "type": "object",
            "properties": {
                "phrase": {"type": "string", "description": "Relative date phrase (e.g., 'tomorrow', 'next Friday', 'in 5 days')"},
            },
            "required": ["phrase"],
        },
        handler=parse_relative_date,
    ))
