"""Chat Intelligence Service — analyzes chat messages for CRM signals.

Listens to "chat.message_sent" events, uses Gemini (free) to extract:
  - Contact mentions (name/email references)
  - Deal signals (pricing, proposals, negotiations)
  - Action items (follow-ups, tasks, deadlines)
  - Sentiment (positive/negative/neutral tone)
  - Meeting requests

Emits "chat.message_analyzed" with extracted signals for downstream consumers.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.events import EventBus
from app.core.logging_config import get_logger
from app.models.chat_signal import ChatSignal
from app.models.crm import CRMContact

logger = get_logger(__name__)

# Signal types
SIGNAL_TYPES = {
    "contact_mention",
    "deal_signal",
    "action_item",
    "sentiment",
    "meeting_request",
    "follow_up",
}

# System prompt for chat analysis
ANALYSIS_SYSTEM_PROMPT = """You are a CRM intelligence assistant. Analyze the chat message and extract CRM-relevant signals.

Return a JSON object with this exact structure:
{
  "signals": [
    {
      "signal_type": "contact_mention|deal_signal|action_item|sentiment|meeting_request|follow_up",
      "confidence": 0.0-1.0,
      "extracted_data": {
        // For contact_mention: {"name": "...", "email": "...", "context": "..."}
        // For deal_signal: {"deal_context": "...", "stage_hint": "...", "value_hint": "..."}
        // For action_item: {"action": "...", "assignee": "...", "deadline": "..."}
        // For sentiment: {"sentiment": "positive|negative|neutral", "score": -1.0 to 1.0, "context": "..."}
        // For meeting_request: {"topic": "...", "suggested_time": "...", "participants": [...]}
        // For follow_up: {"task": "...", "urgency": "low|medium|high", "context": "..."}
      },
      "reasoning": "Brief explanation of why this signal was detected"
    }
  ]
}

Rules:
- Only extract signals you are confident about (>0.5 confidence)
- A message can have multiple signals or none
- For casual/social chat, return {"signals": []} — don't force signals
- Focus on business-relevant signals for a 3-person startup team
- Return ONLY valid JSON, no markdown formatting"""


class ChatIntelligenceService:
    """Analyzes chat messages for CRM signals using LLM."""

    def __init__(self, event_bus: EventBus, session_factory) -> None:
        self._event_bus = event_bus
        self._session_factory = session_factory

    def register_handlers(self) -> None:
        """Register event handlers for chat intelligence."""
        self._event_bus.on("chat.message_sent", self._on_message_sent)
        logger.info("ChatIntelligenceService handlers registered")

    async def _on_message_sent(self, event_type: str, payload: dict[str, Any]) -> None:
        """Handle a new chat message — analyze for CRM signals."""
        message_id = payload.get("message_id")
        channel_id = payload.get("channel_id")
        sender_id = payload.get("sender_id")
        content = payload.get("content", "")

        if not message_id or not content.strip():
            return

        # Skip very short messages (greetings, reactions)
        if len(content.strip()) < 10:
            return

        try:
            signals = await self._analyze_message(content, sender_id, channel_id)
            if not signals:
                return

            # Save signals to DB and resolve entities
            saved_signals = await self._save_signals(
                signals=signals,
                message_id=message_id,
                channel_id=channel_id,
                sender_id=sender_id,
            )

            # Emit analyzed event for downstream (ChatActivityBridge)
            if saved_signals:
                await self._event_bus.emit(
                    "chat.message_analyzed",
                    {
                        "message_id": message_id,
                        "channel_id": channel_id,
                        "sender_id": sender_id,
                        "content": content,
                        "signals": [
                            {
                                "id": s.id,
                                "signal_type": s.signal_type,
                                "entity_type": s.entity_type,
                                "entity_id": s.entity_id,
                                "confidence": s.confidence,
                                "extracted_data": s.extracted_data,
                            }
                            for s in saved_signals
                        ],
                    },
                )

        except Exception:
            logger.exception("Failed to analyze message %s", message_id)

    async def _analyze_message(self, content: str, sender_id: str, channel_id: str) -> list[dict]:
        """Use LLM to extract CRM signals from a message."""
        from app.services.llm_service import get_llm_client, llm_available

        if not llm_available():
            logger.debug("No LLM client available, skipping chat analysis")
            return []

        client = get_llm_client()  # Cheapest available (Gemini free)

        user_prompt = f"Analyze this chat message for CRM signals:\n\n\"{content}\""

        try:
            response = await client.chat(
                messages=[{"role": "user", "content": user_prompt}],
                system=ANALYSIS_SYSTEM_PROMPT,
                max_tokens=512,
                temperature=0.3,
            )

            # Parse JSON response
            parsed = _parse_llm_json(response)
            if parsed is None:
                return []

            raw_signals = parsed.get("signals", [])

            # Validate and filter
            valid_signals = []
            for sig in raw_signals:
                sig_type = sig.get("signal_type", "")
                confidence = sig.get("confidence", 0.0)
                if sig_type in SIGNAL_TYPES and confidence >= 0.5:
                    valid_signals.append(sig)

            return valid_signals

        except Exception:
            logger.exception("LLM chat analysis failed")
            return []

    async def _save_signals(
        self,
        signals: list[dict],
        message_id: str,
        channel_id: str,
        sender_id: str,
    ) -> list[ChatSignal]:
        """Persist signals to DB and try to resolve entity references."""
        saved: list[ChatSignal] = []

        async with self._session_factory() as session:
            # Pre-load contacts for entity resolution
            contacts = await self._load_contacts(session)

            for sig in signals:
                entity_type, entity_id = await self._resolve_entity(
                    sig, contacts, session
                )

                chat_signal = ChatSignal(
                    id=str(uuid.uuid4()),
                    message_id=message_id,
                    channel_id=channel_id,
                    sender_id=sender_id,
                    signal_type=sig["signal_type"],
                    entity_type=entity_type,
                    entity_id=entity_id,
                    confidence=sig.get("confidence", 0.0),
                    extracted_data=json.dumps(sig.get("extracted_data", {})),
                    ai_reasoning=sig.get("reasoning"),
                    created_at=datetime.utcnow(),
                )
                session.add(chat_signal)
                saved.append(chat_signal)

            await session.commit()

        return saved

    async def _load_contacts(self, session: AsyncSession) -> list[CRMContact]:
        """Load all non-archived contacts for entity matching."""
        stmt = select(CRMContact).where(CRMContact.is_archived == False)  # noqa: E712
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def _resolve_entity(
        self,
        signal: dict,
        contacts: list[CRMContact],
        session: AsyncSession,
    ) -> tuple[str | None, str | None]:
        """Try to match a signal to an existing CRM entity."""
        sig_type = signal.get("signal_type", "")
        data = signal.get("extracted_data", {})

        if sig_type == "contact_mention":
            name = (data.get("name") or "").lower().strip()
            email = (data.get("email") or "").lower().strip()

            for contact in contacts:
                # Match by email (exact)
                if email and contact.email and contact.email.lower() == email:
                    return ("contact", contact.id)
                # Match by name (case-insensitive contains)
                if name and contact.name and name in contact.name.lower():
                    return ("contact", contact.id)

        if sig_type == "deal_signal":
            # Deal resolution would require loading deals — defer to Stage 2
            return ("deal", None)

        return (None, None)

    async def analyze_historical(self, channel_id: str, limit: int = 100) -> int:
        """Batch-analyze recent messages in a channel. Returns count of signals created."""
        from app.models.chat import Message

        signal_count = 0

        async with self._session_factory() as session:
            stmt = (
                select(Message)
                .where(Message.channel_id == channel_id)
                .order_by(Message.created_at.desc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            messages = result.scalars().all()

        for msg in messages:
            if not msg.content or len(msg.content.strip()) < 10:
                continue

            signals = await self._analyze_message(
                msg.content, msg.sender_id, msg.channel_id
            )
            if signals:
                saved = await self._save_signals(
                    signals=signals,
                    message_id=msg.id,
                    channel_id=msg.channel_id,
                    sender_id=msg.sender_id,
                )
                signal_count += len(saved)

        return signal_count


def _parse_llm_json(text: str) -> dict | None:
    """Extract JSON from LLM response, handling markdown code blocks."""
    text = text.strip()

    # Strip markdown code blocks
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

    logger.warning("Failed to parse LLM JSON response: %s", text[:200])
    return None
