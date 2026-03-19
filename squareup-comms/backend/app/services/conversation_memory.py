"""Conversation memory — short-term channel history + long-term agent memory."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlmodel import select

from app.core.db import async_session
from app.models.agents import Agent, AgentMemory
from app.models.chat import Message

logger = logging.getLogger(__name__)


async def load_conversation_context(
    channel_id: str,
    agent_id: str,
    limit: int = 20,
) -> list[dict]:
    """Load recent channel messages as conversation history for the LLM.

    Maps messages to Claude roles:
    - Agent's own messages → "assistant"
    - Everything else → "user" (with sender attribution)
    """
    async with async_session() as session:
        stmt = (
            select(Message)
            .where(Message.channel_id == channel_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        db_messages = list(reversed(result.scalars().all()))

    messages: list[dict] = []
    for m in db_messages:
        content = m.content or ""
        if not content.strip():
            continue

        if m.sender_type == "agent" and m.sender_id == agent_id:
            role = "assistant"
        else:
            role = "user"
            # Prefix user messages with sender info for context
            content = f"[{m.sender_type}:{m.sender_id}] {content}"

        # Merge consecutive same-role messages (Claude API requires alternation)
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"] += f"\n{content}"
        else:
            messages.append({"role": role, "content": content})

    return messages


async def load_agent_memory(agent_id: str, user_id: str) -> str:
    """Load persistent facts about this user from agent's long-term memory."""
    async with async_session() as session:
        stmt = (
            select(AgentMemory)
            .where(AgentMemory.agent_id == agent_id, AgentMemory.user_id == user_id)
            .order_by(AgentMemory.updated_at.desc())
            .limit(20)
        )
        result = await session.execute(stmt)
        facts = [f"- {m.key}: {m.value}" for m in result.scalars().all()]
    return "\n".join(facts) if facts else ""


def build_system_prompt(agent: Agent, memory_facts: str) -> str:
    """Assemble the full system prompt with memory and timestamp."""
    base = agent.system_prompt or ""

    if memory_facts:
        base += f"\n\n## Things you remember about this user:\n{memory_facts}"

    base += f"\n\nCurrent time: {datetime.utcnow().isoformat()}Z"
    return base


async def extract_and_save_memory(
    agent_id: str,
    user_id: str,
    final_text: str,
    llm_chat_fn,
) -> None:
    """Ask the LLM to extract memorable facts, then upsert them.

    Uses a lightweight LLM call to identify 0-3 facts worth persisting
    from the conversation. Runs best-effort — failures are logged, not raised.
    """
    try:
        extraction_prompt = (
            "You are a memory extraction assistant. From the following agent response, "
            "extract 0-3 key facts worth remembering about the user for future conversations. "
            "Return ONLY a JSON array of objects with 'key' and 'value' fields. "
            "If nothing is worth remembering, return an empty array [].\n\n"
            f"Agent response:\n{final_text[:2000]}"
        )

        raw = await llm_chat_fn(
            messages=[{"role": "user", "content": extraction_prompt}],
            max_tokens=256,
            temperature=0.0,
        )

        import json
        # Try to parse the LLM's output as JSON
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        facts: list[dict] = json.loads(text)
        if not isinstance(facts, list):
            return

        async with async_session() as session:
            for fact in facts[:3]:
                key = fact.get("key", "")[:200]
                value = fact.get("value", "")
                if not key or not value:
                    continue

                # Upsert: check if this key already exists
                stmt = select(AgentMemory).where(
                    AgentMemory.agent_id == agent_id,
                    AgentMemory.user_id == user_id,
                    AgentMemory.key == key,
                )
                result = await session.execute(stmt)
                existing = result.scalars().first()

                if existing:
                    existing.value = value
                    existing.updated_at = datetime.utcnow()
                    session.add(existing)
                else:
                    import uuid
                    mem = AgentMemory(
                        id=str(uuid.uuid4()),
                        agent_id=agent_id,
                        user_id=user_id,
                        key=key,
                        value=value,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    session.add(mem)

            await session.commit()
            logger.info("Saved %d memory facts for agent %s / user %s", len(facts), agent_id, user_id)

    except Exception as exc:
        logger.warning("Memory extraction failed (non-fatal): %s", exc)
