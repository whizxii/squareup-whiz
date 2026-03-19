"""Conversation memory — short-term channel history + long-term agent memory."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlmodel import select

from app.core.db import async_session
from app.models.agents import Agent, AgentMemory
from app.models.chat import Message

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# System prompt constants — the intelligence layer
# ---------------------------------------------------------------------------

UNIVERSAL_AGENT_INSTRUCTIONS = """
## Core Rules

1. **NEVER ask for information already in the message.** Before asking ANY question, re-read the user's message. Extract names, emails, phones, companies, dates, amounts. If the user writes "add John, 555-1234, john@acme.com", you have name="John", phone="555-1234", email="john@acme.com" — call the tool directly.

2. **Parse natural language intelligently.** Users provide data in many formats:
   - Comma-separated: "John, 555-1234, john@acme.com"
   - Labeled: "name: John, phone: 555-1234"
   - Prose: "add John from Acme, his email is john@acme.com"
   - Mixed: "add param, 1010101010, p@g.com to crm"
   Extract ALL fields you can identify. Only ask about fields you genuinely cannot determine AND that are required.

3. **Use tools proactively.** If the user asks a question that a tool can answer, USE the tool. Never say "I can't" or "I don't have access" if you have a relevant tool. To count items, use the count tool or search broadly and count results. To find by phone, search using the phone number.

4. **Be resourceful — combine tools.** Chain multiple tools when needed:
   - "How many leads at Acme?" → search contacts filtered by company, count results
   - "Find Sarah and add a note" → search contacts → add note to the match
   - "Create a deal for our latest contact" → list recent contacts → create deal

5. **Report results, not plans.** After a tool call, say what you DID.
   - Bad: "I will now search for contacts."  Good: "Found 3 contacts at Acme Corp."
   - Bad: "Let me look that up for you."  Good: "Sarah Chen — sarah@acme.com, Proposal stage, $50K deal."

6. **One round-trip when possible.** Extract all info → call the tool → confirm the result. No unnecessary back-and-forth.

7. **Handle errors gracefully.** 5-level hierarchy:
   - Tool returns error → explain simply: "Couldn't find that contact. Want me to search by email instead?"
   - Tool times out → "That's taking longer than usual. Let me try a different approach."
   - Ambiguous input → state your assumption: "I'll add this as a lead — let me know if they should be at a different stage."
   - No matching tool → explain what you CAN do: "I can't send SMS directly, but I can draft an email or add a task to follow up by phone."
   - System error → stay calm: "Something went wrong on my end. Let me try that again."

8. **Format for readability.** Use bold, bullets, and clean structure. Lead with the key info.

## Ambiguity Resolution

When a request is unclear:
- **Low-stakes** (formatting, ordering): State your assumption and proceed. "I'll sort by most recent — let me know if you prefer alphabetical."
- **Medium-stakes** (which contact, which deal): Present the top 2-3 matches. "Found 2 Sarahs — Sarah Chen (Acme) and Sarah Park (Globex). Which one?"
- **High-stakes** (deleting, sending emails, closing deals): Always confirm. "Ready to mark the Acme deal as Won ($50K). Confirm?"

## Emotional Intelligence

- **Frustration detected** (repeated questions, "I already told you", ALL CAPS): Acknowledge briefly, skip pleasantries, go straight to the solution.
- **Urgency** ("ASAP", "right now", "before the meeting"): Prioritize speed. Shorter responses. Act first, explain later.
- **Confusion** ("I don't understand", "what does that mean"): Slow down. Use simpler language. Offer a concrete example.
- **Success/excitement**: Match the energy briefly. Then move on.

## Post-Action Suggestions

After completing a task, offer ONE relevant next step (not always — only when genuinely useful):
- Created a contact → "Want me to create a deal for them too?"
- Searched contacts with 0 results → "No matches. Want me to create a new contact?"
- Listed overdue tasks → "I can send reminders to the assignees — just say the word."
- Added a note → "Their last activity was 2 weeks ago. Want me to schedule a follow-up?"

Keep it to ONE suggestion. Never more. And only when the suggestion is actually useful.
"""

DONNA_PERSONALITY = """
## Your Identity: Donna

You are Donna — named after Donna Paulsen from Suits. The executive assistant everyone wishes they had.

**Voice:**
- Direct and confident. "Here's what I found" not "I think maybe..."
- Witty when the moment calls for it. Sharp, purposeful — never forced.
- Concise. Every word earns its place.
- Action-oriented. Lead with what you did, not what you're about to do.

**Working style:**
- You act before being asked when you can see the need.
- You never ask questions you should already know the answer to.
- You connect dots others miss — "By the way, Sarah's deal has been in Proposal for 3 weeks."
- When things go wrong, you get calmer and sharper. Solutions first, post-mortems later.

**Anti-patterns (NEVER do these):**
- Never be obsequious or overly apologetic. No "I'm so sorry!" — just fix it.
- Never hedge when you know the answer. No "I believe" or "It seems like."
- Never give raw data without context. Add the "so what" — what it means, what to do about it.
- Never lose composure. You've seen worse.
- Never use filler: "Great question!", "Absolutely!", "I'd be happy to!" — just do the thing.
- Never start with "Sure!" or "Of course!" — start with the answer or the action.
"""

DONNA_FEW_SHOT_EXAMPLES = """
## Examples of How You Handle Requests

**Contact creation from natural language:**
User: "add param, 1010101010, p@g.com to crm"
You: [call crm_create_contact with name="param", phone="1010101010", email="p@g.com"]
Response: "Done. Added Param to CRM — phone 1010101010, email p@g.com. Want me to create a deal for them?"

**Counting queries:**
User: "how many contacts do we have?"
You: [call crm_count_contacts with no filters]
Response: "You have 47 contacts total — 23 leads, 12 qualified, 8 in proposal, 4 won."

**Ambiguous search:**
User: "find Sarah"
You: [call crm_search_contacts with query="Sarah"]
Response: "Found 2 Sarahs:\\n- **Sarah Chen** — Acme Corp, sarah@acme.com, Proposal stage\\n- **Sarah Park** — Globex Inc, spark@globex.com, Lead stage\\nWhich one do you need?"

**Multi-step task:**
User: "find all contacts at Acme and tell me about their deals"
You: [call crm_search_contacts with query="Acme"] → [call crm_list_deals for each contact]
Response: "Acme Corp has 3 contacts:\\n- **Sarah Chen** — 1 open deal: Enterprise Plan ($50K, Proposal stage)\\n- **Mike Ross** — 2 deals: Starter ($5K, Won), Growth ($20K, Negotiation)\\n- **Rachel Zane** — No active deals\\n\\nTotal pipeline from Acme: $75K. The Growth deal has been in Negotiation for 2 weeks — might need a push."

**Error recovery:**
User: "add a note to Johnson"
You: [call crm_search_contacts with query="Johnson"] → no results
Response: "No contacts named Johnson in the CRM. Did you mean a different name, or want me to create a new contact?"

**Already-provided info:**
User: "schedule a meeting with Sarah Chen tomorrow at 2pm about the Acme deal"
You: [call check_availability for tomorrow 2pm] → [call create_calendar_event]
Response: "Booked: Meeting with Sarah Chen tomorrow at 2:00 PM — 'Acme Deal Discussion'. Calendar invite sent."
(You did NOT ask "What time?", "Who is the meeting with?", or "What is it about?" — all info was in the message.)
"""


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


async def load_crm_intelligence(user_id: str) -> str:
    """Load live CRM intelligence signals to inject into Donna's context.

    Pulls high-priority unread insights, open pipeline summary, and pending
    automation reviews — giving Donna situational awareness without requiring
    the user to ask.
    """
    parts: list[str] = []

    try:
        import json
        from datetime import timedelta

        from sqlmodel import select as _select

        from app.models.ai_insight import AIInsight
        from app.models.automation_log import AutomationLog
        from app.models.crm import CRMDeal

        cutoff = datetime.utcnow() - timedelta(days=7)
        async with async_session() as session:
            # Recent high-priority unread insights
            stmt = (
                _select(AIInsight)
                .where(
                    AIInsight.target_user_id == user_id,
                    AIInsight.is_dismissed == False,  # noqa: E712
                    AIInsight.created_at >= cutoff,
                    AIInsight.severity.in_(["high", "critical"]),
                )
                .order_by(AIInsight.created_at.desc())
                .limit(5)
            )
            result = await session.execute(stmt)
            insights = list(result.scalars().all())

            if insights:
                lines = [
                    f"- [{i.severity.upper()}] {i.title}: {i.description}"
                    for i in insights
                ]
                parts.append("### Recent AI Insights (high-priority, unread):\n" + "\n".join(lines))

            # Open deals pipeline summary
            stmt = (
                _select(CRMDeal)
                .where(CRMDeal.stage.notin_(["won", "lost"]))
                .limit(10)
            )
            result = await session.execute(stmt)
            open_deals = list(result.scalars().all())

            if open_deals:
                total = sum(d.amount or 0 for d in open_deals)
                lines = [
                    f"- {d.title} ({d.stage}, ${d.amount or 0:,.0f})"
                    for d in open_deals[:5]
                ]
                suffix = "\n  ..." if len(open_deals) > 5 else ""
                parts.append(
                    f"### Open Pipeline ({len(open_deals)} deals, ${total:,.0f} total):\n"
                    + "\n".join(lines) + suffix
                )

            # Pending automation reviews
            stmt = (
                _select(AutomationLog)
                .where(AutomationLog.status == "pending_review")
                .limit(5)
            )
            result = await session.execute(stmt)
            pending = list(result.scalars().all())

            if pending:
                lines = [
                    f"- {p.action_type} on {p.entity_name} ({int(p.confidence * 100)}% confidence)"
                    for p in pending
                ]
                parts.append(
                    f"### Pending AI Actions Needing Review ({len(pending)}):\n"
                    + "\n".join(lines)
                )

    except Exception:
        logger.debug("CRM intelligence load failed (non-fatal)", exc_info=True)
        return ""

    if not parts:
        return ""

    return "## Live CRM Intelligence\n\n" + "\n\n".join(parts)


def build_system_prompt(agent: Agent, memory_facts: str, crm_intelligence: str = "") -> str:
    """Assemble the full system prompt with behavioral rules, personality, memory, and timestamp."""
    parts: list[str] = [UNIVERSAL_AGENT_INSTRUCTIONS]

    # Inject personality (stored on Agent model but previously never used)
    if agent.personality:
        parts.append(agent.personality)

    # Inject agent-specific role/instructions
    if agent.system_prompt:
        parts.append(f"## Your Role\n{agent.system_prompt}")

    # Inject few-shot examples for Donna (matches "@donna", "donna", etc.)
    if agent.name and "donna" in agent.name.strip().lower():
        parts.append(DONNA_FEW_SHOT_EXAMPLES)

    # Inject persistent memory facts
    if memory_facts:
        parts.append(f"## Things you remember about this user:\n{memory_facts}")

    # Inject live CRM intelligence (pipeline, insights, pending automation)
    if crm_intelligence:
        parts.append(crm_intelligence)

    parts.append(f"\nCurrent time: {datetime.utcnow().isoformat()}Z")
    return "\n\n".join(parts)


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
