"""Auto-register all built-in tool modules at import time."""

from app.services.tools.registry import tool_registry

from app.services.tools import (
    crm_tools,
    channel_tools,
    user_tools,
    datetime_tools,
    knowledge_tools,
    workflow_tools,
    analytics_tools,
    agent_tools,
    task_tools,
    reminder_tools,
    calendar_tools,
    email_tools,
    ai_insight_tools,
    autonomous_tools,
)

# Register all tool modules
crm_tools.register(tool_registry)
channel_tools.register(tool_registry)
user_tools.register(tool_registry)
datetime_tools.register(tool_registry)
knowledge_tools.register(tool_registry)
workflow_tools.register(tool_registry)
analytics_tools.register(tool_registry)
agent_tools.register(tool_registry)
task_tools.register(tool_registry)
reminder_tools.register(tool_registry)
calendar_tools.register(tool_registry)
email_tools.register(tool_registry)
ai_insight_tools.register(tool_registry)
autonomous_tools.register(tool_registry)
