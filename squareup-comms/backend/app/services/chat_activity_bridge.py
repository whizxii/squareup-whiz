"""Chat Activity Bridge — converts chat signals into CRM activities.

Listens to "chat.message_analyzed" events from ChatIntelligenceService and:
  1. Creates CRMActivity records for contact-linked signals
  2. Updates contact AI fields (sentiment, last_ai_analysis_at, ai_tags)
  3. Marks ChatSignal records as processed
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlmodel import select

from app.core.events import EventBus
from app.core.logging_config import get_logger
from app.models.chat_signal import ChatSignal
from app.models.crm import CRMActivity, CRMContact

logger = get_logger(__name__)

# Map signal types to CRM activity types
SIGNAL_TO_ACTIVITY_TYPE = {
    "contact_mention": "chat_mention",
    "deal_signal": "deal_signal",
    "action_item": "action_item",
    "meeting_request": "meeting_request",
    "follow_up": "follow_up",
}


class ChatActivityBridge:
    """Bridges chat signals to CRM activity records."""

    def __init__(self, event_bus: EventBus, session_factory) -> None:
        self._event_bus = event_bus
        self._session_factory = session_factory

    def register_handlers(self) -> None:
        """Register event handlers."""
        self._event_bus.on("chat.message_analyzed", self._on_message_analyzed)
        logger.info("ChatActivityBridge handlers registered")

    async def _on_message_analyzed(self, event_type: str, payload: dict[str, Any]) -> None:
        """Handle analyzed message — create CRM activities from signals."""
        signals = payload.get("signals", [])
        message_id = payload.get("message_id")
        channel_id = payload.get("channel_id")
        sender_id = payload.get("sender_id")
        content = payload.get("content", "")

        if not signals:
            return

        try:
            async with self._session_factory() as session:
                for signal_data in signals:
                    signal_id = signal_data.get("id")
                    signal_type = signal_data.get("signal_type")
                    entity_type = signal_data.get("entity_type")
                    entity_id = signal_data.get("entity_id")

                    # Only create activities for signals linked to a contact
                    if entity_type == "contact" and entity_id:
                        activity_type = SIGNAL_TO_ACTIVITY_TYPE.get(signal_type, "chat_signal")

                        # Build chat context JSON
                        chat_context = json.dumps({
                            "channel_id": channel_id,
                            "message_snippet": content[:200],
                            "signal_type": signal_type,
                            "confidence": signal_data.get("confidence", 0.0),
                        })

                        # Create activity title from signal data
                        extracted = signal_data.get("extracted_data", "{}")
                        if isinstance(extracted, str):
                            try:
                                extracted = json.loads(extracted)
                            except json.JSONDecodeError:
                                extracted = {}

                        title = _build_activity_title(signal_type, extracted)

                        activity = CRMActivity(
                            id=str(uuid.uuid4()),
                            contact_id=entity_id,
                            type=activity_type,
                            title=title,
                            content=content[:500],
                            activity_metadata=json.dumps({
                                "source": "chat_intelligence",
                                "signal_type": signal_type,
                                "extracted_data": extracted,
                            }),
                            performed_by=sender_id,
                            performer_type="user",
                            message_id=message_id,
                            chat_signal_id=signal_id,
                            chat_context=chat_context,
                            created_at=datetime.utcnow(),
                        )
                        session.add(activity)

                        # Update contact AI fields
                        await self._update_contact_ai(
                            session, entity_id, signal_type, extracted
                        )

                    # Mark signal as processed
                    if signal_id:
                        result = await session.execute(
                            select(ChatSignal).where(ChatSignal.id == signal_id)
                        )
                        signal_record = result.scalars().first()
                        if signal_record:
                            signal_record.processed = True
                            signal_record.processed_at = datetime.utcnow()
                            session.add(signal_record)

                await session.commit()

        except Exception:
            logger.exception("Failed to bridge chat signals for message %s", message_id)

    async def _update_contact_ai(
        self,
        session,
        contact_id: str,
        signal_type: str,
        extracted_data: dict,
    ) -> None:
        """Update contact's AI-managed fields based on signal."""
        result = await session.execute(
            select(CRMContact).where(CRMContact.id == contact_id)
        )
        contact = result.scalars().first()
        if contact is None:
            return

        now = datetime.utcnow()
        contact.last_ai_analysis_at = now
        contact.last_activity_at = now
        contact.activity_count = (contact.activity_count or 0) + 1

        # Update sentiment if this is a sentiment signal
        if signal_type == "sentiment":
            score = extracted_data.get("score")
            if score is not None:
                contact.sentiment_score = float(score)

        # Accumulate AI tags
        if signal_type in ("deal_signal", "action_item", "meeting_request"):
            try:
                existing_tags = json.loads(contact.ai_tags or "[]")
            except (json.JSONDecodeError, TypeError):
                existing_tags = []

            new_tag = signal_type.replace("_", " ")
            if new_tag not in existing_tags:
                updated_tags = [*existing_tags, new_tag]
                contact.ai_tags = json.dumps(updated_tags[:20])  # Cap at 20 tags

        session.add(contact)


def _build_activity_title(signal_type: str, extracted_data: dict) -> str:
    """Build a human-readable activity title from signal data."""
    if signal_type == "contact_mention":
        name = extracted_data.get("name", "someone")
        return f"Mentioned {name} in chat"

    if signal_type == "deal_signal":
        context = extracted_data.get("deal_context", "deal discussed")
        return f"Deal signal: {context[:80]}"

    if signal_type == "action_item":
        action = extracted_data.get("action", "action item")
        return f"Action item: {action[:80]}"

    if signal_type == "meeting_request":
        topic = extracted_data.get("topic", "meeting")
        return f"Meeting request: {topic[:80]}"

    if signal_type == "follow_up":
        task = extracted_data.get("task", "follow up needed")
        return f"Follow-up: {task[:80]}"

    return f"Chat signal: {signal_type}"
