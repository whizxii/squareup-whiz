"""ChatSignal model — stores AI-extracted CRM signals from chat messages.

Each message can yield zero or more signals (contact mention, deal reference,
action item, sentiment, etc.). The ChatIntelligenceService writes these; the
ChatActivityBridge reads them and creates CRM activities.
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class ChatSignal(SQLModel, table=True):
    __tablename__ = "chat_signals"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    message_id: str = Field(foreign_key="messages.id", index=True)
    channel_id: str = Field(foreign_key="channels.id", index=True)
    sender_id: str = Field(max_length=128, index=True)

    # Signal classification
    signal_type: str = Field(max_length=50, index=True)
    # Types: contact_mention, deal_signal, action_item, sentiment, meeting_request, follow_up

    # Linked CRM entity (if resolved)
    entity_type: Optional[str] = Field(default=None, max_length=30)  # contact, deal, company
    entity_id: Optional[str] = Field(default=None, max_length=128, index=True)

    # AI extraction results
    confidence: float = Field(default=0.0)  # 0.0 - 1.0
    extracted_data: str = Field(default="{}")  # JSON: varies by signal_type
    ai_reasoning: Optional[str] = None  # Why the AI classified this signal

    # Processing state
    processed: bool = Field(default=False, index=True)  # Bridge has created CRM activity
    processed_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), index=True)
