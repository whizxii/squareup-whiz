"""Email chain handler — Donna analyses a forwarded email thread and takes action.

Extracts contacts, action items, logs CRM activities, creates tasks, and
drafts a response — all from a single pasted email chain.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any

from app.core.db import async_session
from app.services.tools.registry import (
    ToolContext,
    ToolDefinition,
    ToolRegistry,
    ToolResult,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM system prompt for email chain analysis
# ---------------------------------------------------------------------------

_EMAIL_CHAIN_ANALYSIS_SYSTEM = """You are an AI executive assistant analysing a forwarded email chain.

Extract ALL actionable information from the email thread and return ONLY valid JSON:
{
  "summary": "2-3 sentence summary of the entire email thread",
  "participants": [
    {
      "name": "Full Name",
      "email": "email@example.com",
      "company": "Company name or null",
      "role": "Job title or null"
    }
  ],
  "action_items": [
    {
      "description": "What needs to be done",
      "owner": "Person responsible (name)",
      "due_hint": "any mentioned deadline or null",
      "priority": "high|medium|low"
    }
  ],
  "key_topics": ["topic1", "topic2"],
  "sentiment": "positive|neutral|negative|mixed",
  "suggested_response": "A professional draft reply addressing the latest message in the chain",
  "crm_activities": [
    {
      "type": "email|meeting|call|note",
      "title": "Brief activity title",
      "notes": "Relevant details"
    }
  ],
  "follow_up_needed": true,
  "follow_up_suggestion": "What the follow-up should be"
}

Rules:
- Extract EVERY person mentioned (From, To, CC, signatures, mentioned by name).
- Identify concrete action items with owners. If the owner is ambiguous, default to "me".
- If any deadlines are mentioned, capture them in due_hint.
- The suggested response should be professional, concise, and address the latest email.
- For CRM activities, summarise key interactions worth logging.
- If the thread mentions a deal, pricing, or negotiation, note it in key_topics.
"""


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

async def _handle_analyze_email_chain(inp: dict, ctx: ToolContext) -> ToolResult:
    """Analyse a forwarded email chain and extract structured data."""
    email_text = (inp.get("email_text") or "").strip()
    thread_id = (inp.get("thread_id") or "").strip()

    if not email_text and not thread_id:
        return ToolResult(
            success=False,
            error="Provide either 'email_text' (pasted email) or 'thread_id' to analyse.",
        )

    # If thread_id is provided, fetch from DB
    if thread_id and not email_text:
        email_text = await _fetch_thread_text(thread_id)
        if not email_text:
            return ToolResult(
                success=False,
                error=f"Thread '{thread_id}' not found or empty.",
            )

    try:
        analysis = await _analyse_with_llm(email_text)
        if analysis is None:
            # Fallback to rule-based extraction
            analysis = _fallback_extraction(email_text)

        return ToolResult(success=True, output=analysis)
    except Exception as exc:
        logger.exception("Email chain analysis failed")
        return ToolResult(success=False, error=str(exc))


async def _handle_process_email_chain(inp: dict, ctx: ToolContext) -> ToolResult:
    """Analyse email chain AND execute actions: create contacts, tasks, log activities."""
    email_text = (inp.get("email_text") or "").strip()
    thread_id = (inp.get("thread_id") or "").strip()

    if not email_text and not thread_id:
        return ToolResult(
            success=False,
            error="Provide either 'email_text' (pasted email) or 'thread_id'.",
        )

    if thread_id and not email_text:
        email_text = await _fetch_thread_text(thread_id)
        if not email_text:
            return ToolResult(
                success=False,
                error=f"Thread '{thread_id}' not found or empty.",
            )

    try:
        analysis = await _analyse_with_llm(email_text)
        if analysis is None:
            analysis = _fallback_extraction(email_text)

        actions_taken = await _execute_actions(analysis, ctx.user_id)

        return ToolResult(
            success=True,
            output={
                "analysis": analysis,
                "actions_taken": actions_taken,
            },
        )
    except Exception as exc:
        logger.exception("Email chain processing failed")
        return ToolResult(success=False, error=str(exc))


# ---------------------------------------------------------------------------
# LLM analysis
# ---------------------------------------------------------------------------

async def _analyse_with_llm(email_text: str) -> dict[str, Any] | None:
    """Send the email chain to the LLM for structured extraction."""
    try:
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            return None

        client = get_llm_client("gemini-3-flash")
        raw = await client.chat(
            messages=[{"role": "user", "content": email_text}],
            system=_EMAIL_CHAIN_ANALYSIS_SYSTEM,
            max_tokens=1500,
            temperature=0.3,
        )
        if not raw:
            return None

        return parse_llm_json(raw)
    except Exception:
        logger.exception("LLM email chain analysis failed")
        return None


# ---------------------------------------------------------------------------
# Thread fetcher
# ---------------------------------------------------------------------------

async def _fetch_thread_text(thread_id: str) -> str | None:
    """Fetch email thread from DB and concatenate into readable text."""
    from sqlmodel import select

    from app.models.crm_email import CRMEmail

    async with async_session() as session:
        result = await session.execute(
            select(CRMEmail)
            .where(CRMEmail.thread_id == thread_id)
            .order_by(CRMEmail.created_at.asc())
        )
        emails = result.scalars().all()

    if not emails:
        return None

    parts: list[str] = []
    for email in emails:
        direction = "Sent" if email.direction == "outbound" else "Received"
        date_str = (email.sent_at or email.created_at).strftime("%Y-%m-%d %H:%M")
        body = email.body_text or email.body_html or "(no body)"
        parts.append(
            f"--- {direction} on {date_str} ---\n"
            f"From: {email.from_address}\n"
            f"To: {email.to_addresses}\n"
            f"Subject: {email.subject or '(no subject)'}\n\n"
            f"{body}\n"
        )

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Fallback extraction (rule-based)
# ---------------------------------------------------------------------------

_EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_FROM_PATTERN = re.compile(r"From:\s*(.+?)(?:\n|$)", re.IGNORECASE)
_SUBJECT_PATTERN = re.compile(r"Subject:\s*(.+?)(?:\n|$)", re.IGNORECASE)


def _fallback_extraction(email_text: str) -> dict[str, Any]:
    """Rule-based fallback when LLM is unavailable."""
    # Extract email addresses
    emails_found = list(set(_EMAIL_PATTERN.findall(email_text)))

    # Extract from headers
    from_matches = _FROM_PATTERN.findall(email_text)

    # Build participants from From headers
    participants: list[dict[str, str | None]] = []
    seen_emails: set[str] = set()
    for from_line in from_matches:
        addr_match = _EMAIL_PATTERN.search(from_line)
        if addr_match:
            addr = addr_match.group(0)
            if addr not in seen_emails:
                seen_emails.add(addr)
                name = from_line.replace(addr, "").strip(" <>\t\"'")
                participants.append({
                    "name": name or addr.split("@")[0],
                    "email": addr,
                    "company": None,
                    "role": None,
                })

    # Add any remaining unique email addresses as participants
    for addr in emails_found:
        if addr not in seen_emails:
            seen_emails.add(addr)
            participants.append({
                "name": addr.split("@")[0],
                "email": addr,
                "company": None,
                "role": None,
            })

    # Extract subject
    subject_match = _SUBJECT_PATTERN.search(email_text)
    subject = subject_match.group(1).strip() if subject_match else "Email Thread"

    # Truncate for summary
    truncated = email_text[:500].replace("\n", " ").strip()

    return {
        "summary": f"Email thread re: {subject}. {len(participants)} participants found. "
                   f"Preview: {truncated[:200]}...",
        "participants": participants,
        "action_items": [],
        "key_topics": [subject] if subject != "Email Thread" else [],
        "sentiment": "neutral",
        "suggested_response": "",
        "crm_activities": [{
            "type": "email",
            "title": f"Email chain: {subject}",
            "notes": f"Thread with {len(participants)} participants",
        }],
        "follow_up_needed": True,
        "follow_up_suggestion": "Review the email chain and determine next steps.",
    }


# ---------------------------------------------------------------------------
# Action executor — creates CRM contacts, tasks, activities
# ---------------------------------------------------------------------------

async def _execute_actions(
    analysis: dict[str, Any], user_id: str
) -> list[dict[str, str]]:
    """Create CRM contacts, tasks, and activities from the analysis."""
    from sqlmodel import select

    from app.models.crm import CRMActivity, CRMContact
    from app.models.tasks import Task

    actions_taken: list[dict[str, str]] = []
    now = datetime.utcnow()

    async with async_session() as session:
        # 1. Create/find contacts for each participant
        for participant in analysis.get("participants", []):
            email = participant.get("email", "").strip()
            if not email:
                continue

            # Check if contact already exists
            result = await session.execute(
                select(CRMContact).where(CRMContact.email == email)
            )
            existing = result.scalars().first()

            if existing:
                actions_taken.append({
                    "action": "contact_found",
                    "detail": f"Existing contact: {existing.name} ({email})",
                })
            else:
                # Create new contact
                name = participant.get("name") or email.split("@")[0]
                new_contact = CRMContact(
                    name=name,
                    email=email,
                    company=participant.get("company") or "",
                    title=participant.get("role") or "",
                    source="email_chain",
                    created_by=user_id,
                    created_at=now,
                    updated_at=now,
                )
                session.add(new_contact)
                actions_taken.append({
                    "action": "contact_created",
                    "detail": f"Created contact: {name} ({email})",
                })

        # 2. Log CRM activities
        for activity_data in analysis.get("crm_activities", []):
            # contact_id is required — skip if not provided
            act_contact_id = activity_data.get("contact_id")
            if not act_contact_id:
                continue
            activity = CRMActivity(
                contact_id=act_contact_id,
                type=activity_data.get("type", "email"),
                title=activity_data.get("title", "Email interaction"),
                content=activity_data.get("notes", ""),
                created_by=user_id,
                created_at=now,
            )
            session.add(activity)
            actions_taken.append({
                "action": "activity_logged",
                "detail": f"Logged: {activity.title}",
            })

        # 3. Create tasks for action items
        for item in analysis.get("action_items", []):
            priority_map = {"high": "high", "medium": "medium", "low": "low"}
            task = Task(
                title=item.get("description", "Follow up"),
                description=f"From email chain analysis. Owner: {item.get('owner', 'me')}",
                priority=priority_map.get(item.get("priority", "medium"), "medium"),
                status="todo",
                created_by=user_id,
                assigned_to=user_id,
                created_at=now,
                updated_at=now,
            )
            session.add(task)
            actions_taken.append({
                "action": "task_created",
                "detail": f"Task: {task.title} (priority: {task.priority})",
            })

        await session.commit()

    return actions_taken


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="analyze_email_chain",
        display_name="Analyze Email Chain",
        description=(
            "Analyze a forwarded email chain — extract participants, action items, "
            "key topics, sentiment, and suggest a response. Provide either raw "
            "email text or a thread_id to look up."
        ),
        category="email",
        input_schema={
            "type": "object",
            "properties": {
                "email_text": {
                    "type": "string",
                    "description": "The raw forwarded email chain text to analyse",
                },
                "thread_id": {
                    "type": "string",
                    "description": "Thread ID to look up from the email database",
                },
            },
        },
        handler=_handle_analyze_email_chain,
    ))

    registry.register_builtin(ToolDefinition(
        name="process_email_chain",
        display_name="Process Email Chain",
        description=(
            "Analyze a forwarded email chain AND automatically take action: "
            "create CRM contacts for new participants, log activities, "
            "create follow-up tasks, and suggest a draft response. "
            "This is the 'handle everything' version of analyze_email_chain."
        ),
        category="email",
        input_schema={
            "type": "object",
            "properties": {
                "email_text": {
                    "type": "string",
                    "description": "The raw forwarded email chain text to process",
                },
                "thread_id": {
                    "type": "string",
                    "description": "Thread ID to look up from the email database",
                },
            },
        },
        handler=_handle_process_email_chain,
        requires_confirmation=True,
    ))
