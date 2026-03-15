from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class Agent(SQLModel, table=True):
    __tablename__ = "agents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=100)
    avatar_url: Optional[str] = None
    avatar_config: Optional[str] = Field(default="{}")
    description: Optional[str] = None
    system_prompt: str
    model: str = Field(default="claude-sonnet-4-6", max_length=50)
    tools: Optional[str] = Field(default="[]")  # JSON
    mcp_servers: Optional[str] = Field(default="[]")  # JSON
    trigger_mode: str = Field(default="mention", max_length=20)
    schedule_cron: Optional[str] = Field(default=None, max_length=100)
    personality: Optional[str] = None
    office_x: Optional[int] = None
    office_y: Optional[int] = None
    office_station_icon: Optional[str] = Field(default=None, max_length=10)
    status: str = Field(default="idle", max_length=20)
    current_task: Optional[str] = None
    active: bool = Field(default=True)
    total_executions: int = Field(default=0)
    total_cost_usd: float = Field(default=0.0)
    success_rate: float = Field(default=100.0)
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentExecution(SQLModel, table=True):
    __tablename__ = "agent_executions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    agent_id: str = Field(foreign_key="agents.id")
    trigger_message_id: Optional[str] = Field(default=None, foreign_key="messages.id")
    trigger_channel_id: Optional[str] = Field(default=None, foreign_key="channels.id")
    conversation_messages: Optional[str] = None  # JSON
    tools_called: Optional[str] = Field(default="[]")  # JSON
    response_text: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_cost_usd: Optional[float] = None
    duration_ms: Optional[int] = None
    num_tool_calls: int = Field(default=0)
    status: str = Field(default="success", max_length=20)
    error_message: Optional[str] = None
    error_type: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
