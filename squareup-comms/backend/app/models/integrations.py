from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class IntegrationConfig(SQLModel, table=True):
    __tablename__ = "integration_configs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    type: str = Field(max_length=50)
    display_name: Optional[str] = Field(default=None, max_length=100)
    mcp_server_config: Optional[str] = Field(default="{}")  # JSON
    oauth_tokens_encrypted: Optional[str] = None
    scopes: Optional[str] = Field(default="[]")  # JSON
    status: str = Field(default="active", max_length=20)
    connected_by: Optional[str] = Field(default=None, max_length=128)
    last_synced_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
