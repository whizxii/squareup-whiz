from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
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
    max_iterations: int = Field(default=5)
    autonomy_level: int = Field(default=2)  # 1=ask all, 2=ask writes, 3=auto, 4=full auto
    temperature: float = Field(default=0.7)
    custom_tools: Optional[str] = Field(default="[]")  # JSON array of custom tool IDs
    monthly_budget_usd: Optional[float] = Field(default=None)  # Max spend per month (None = unlimited)
    daily_execution_limit: Optional[int] = Field(default=None)  # Max runs per day (None = unlimited)
    cost_this_month: float = Field(default=0.0)  # Running total reset monthly
    cost_month_key: Optional[str] = Field(default=None, max_length=7)  # "YYYY-MM" for reset tracking
    last_scheduled_run: Optional[datetime] = Field(default=None)  # Tracks last cron execution
    created_by: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


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
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class AgentMemory(SQLModel, table=True):
    __tablename__ = "agent_memories"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    agent_id: str = Field(foreign_key="agents.id", index=True)
    user_id: str = Field(max_length=128, index=True)
    key: str = Field(max_length=200)
    value: str
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
