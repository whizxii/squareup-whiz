"""CustomTool model — user-created HTTP/webhook/OpenAPI tools stored in DB."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field


class CustomTool(SQLModel, table=True):
    __tablename__ = "custom_tools"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=100, index=True)
    display_name: str = Field(max_length=200)
    description: str
    tool_type: str = Field(max_length=20)  # "http" | "webhook" | "openapi"
    category: str = Field(default="custom", max_length=50)
    input_schema: str = Field(default="{}")  # JSON Schema for tool inputs
    config: str = Field(default="{}")  # Encrypted JSON — URL, headers, auth, etc.
    requires_confirmation: bool = Field(default=False)
    created_by: str = Field(max_length=128, index=True)
    is_shared: bool = Field(default=False)  # Available to all users' agents
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
