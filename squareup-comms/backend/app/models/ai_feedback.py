"""AIFeedback model — captures user feedback on AI predictions and actions.

Tracks thumbs up/down, correctness outcomes, and free-text feedback to enable
accuracy monitoring and confidence threshold tuning over time.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AIFeedback(SQLModel, table=True):
    __tablename__ = "ai_feedback"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

    # Source reference — what AI output this feedback is about
    source_type: str = Field(max_length=30, index=True)
    # Values: "automation_log" | "insight" | "lead_score" | "deal_risk" | "copilot"
    source_id: str = Field(max_length=128, index=True)

    # Who gave the feedback
    user_id: str = Field(max_length=128, index=True)

    # Rating
    rating: str = Field(max_length=20)
    # Values: "thumbs_up" | "thumbs_down"

    # Optional outcome tracking (set later when ground truth is known)
    outcome: Optional[str] = Field(default=None, max_length=30)
    # Values: "correct" | "incorrect" | "partially_correct"

    # Optional free-text feedback
    feedback_text: Optional[str] = Field(default=None)

    # Snapshot of the AI's confidence at the time of feedback
    ai_confidence: Optional[float] = Field(default=None)

    # What action type this was (for aggregation)
    action_type: Optional[str] = Field(default=None, max_length=50, index=True)

    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(), index=True
    )
