"""Progress reporting tool — lets agents emit progress updates for batch operations."""

from __future__ import annotations

import logging

from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry

logger = logging.getLogger(__name__)


async def report_progress(inp: dict, ctx: ToolContext) -> ToolResult:
    """Emit a progress update visible to the user.

    The agent calls this during multi-step batch operations (e.g. "emailing
    12 contacts") so the user sees live progress instead of a spinner.

    The actual WebSocket broadcast is handled by the engine when it processes
    this tool result — we return a structured output that the engine's
    ``_broadcast_progress`` picks up.
    """
    current = inp.get("current", 0)
    total = inp.get("total", 0)
    description = inp.get("description", "")

    if total <= 0:
        return ToolResult(
            success=False, output=None,
            error="total must be a positive integer",
        )
    if current < 0 or current > total:
        current = min(max(current, 0), total)

    return ToolResult(
        success=True,
        output={
            "__progress__": True,
            "current": current,
            "total": total,
            "description": description,
            "percent": round((current / total) * 100) if total else 0,
        },
    )


def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="report_progress",
        display_name="Report Progress",
        description=(
            "Report progress on a multi-step batch operation. Use this when "
            "processing multiple items (e.g. drafting emails for 10 contacts, "
            "updating 5 deals) to show the user a live progress indicator. "
            "Call this after each item is processed."
        ),
        category="system",
        input_schema={
            "type": "object",
            "properties": {
                "current": {
                    "type": "integer",
                    "description": "Current step number (1-indexed)",
                },
                "total": {
                    "type": "integer",
                    "description": "Total number of steps",
                },
                "description": {
                    "type": "string",
                    "description": "Short description of current progress, e.g. 'Drafting email 3 of 10 — Sarah Chen'",
                },
            },
            "required": ["current", "total"],
        },
        handler=report_progress,
    ))
