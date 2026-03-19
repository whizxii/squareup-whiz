"""Email built-in tools — search, draft, send, and retrieve email threads.

Uses Gmail API via OAuth when connected, falls back to the local CRMEmail
table otherwise.  Token management is handled by
``google_auth.get_valid_access_token`` which auto-refreshes expired tokens.

The existing ``gmail_sync.py`` service handles bidirectional sync between
Gmail and the CRM.  These tools give agents direct, real-time access.
"""

from __future__ import annotations

import base64
import json
import logging
import uuid
from datetime import datetime
from email.mime.text import MIMEText
import httpx
from sqlmodel import select, or_

from app.core.db import async_session
from app.models.crm_email import CRMEmail
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry

logger = logging.getLogger(__name__)

GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


# ---------------------------------------------------------------------------
# Gmail API helpers
# ---------------------------------------------------------------------------

async def _get_gmail_token(user_id: str) -> str | None:
    """Return a valid Gmail access token for *user_id*, or ``None``."""
    from app.services.integrations.google_auth import (
        get_user_integration_config,
        get_valid_access_token,
    )
    try:
        async with async_session() as session:
            config = await get_user_integration_config(user_id, "gmail", session)
            if not config:
                return None
            return await get_valid_access_token(
                config, session,
                test_url=f"{GMAIL_BASE}/profile",
            )
    except (ValueError, Exception) as exc:
        logger.debug("Gmail token unavailable for user %s: %s", user_id, exc)
        return None


def _parse_gmail_headers(headers: list[dict]) -> dict[str, str]:
    """Extract common headers from a Gmail message payload."""
    result: dict[str, str] = {}
    for h in headers:
        name_lower = h.get("name", "").lower()
        if name_lower in ("from", "to", "cc", "subject", "date"):
            result[name_lower] = h.get("value", "")
    return result


def _extract_body(payload: dict) -> tuple[str, str]:
    """Extract plain text and HTML body from a Gmail message payload.

    Returns (body_text, body_html).
    """
    body_text = ""
    body_html = ""

    def _decode_part(part: dict) -> None:
        nonlocal body_text, body_html
        mime = part.get("mimeType", "")
        data = part.get("body", {}).get("data", "")
        if data:
            decoded = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
            if mime == "text/plain" and not body_text:
                body_text = decoded
            elif mime == "text/html" and not body_html:
                body_html = decoded

        for sub in part.get("parts", []):
            _decode_part(sub)

    _decode_part(payload)
    return body_text, body_html


def _gmail_msg_to_dict(msg: dict) -> dict:
    """Normalise a Gmail API message into a dict matching CRMEmail shape."""
    payload = msg.get("payload", {})
    headers = _parse_gmail_headers(payload.get("headers", []))
    body_text, body_html = _extract_body(payload)

    from_addr = headers.get("from", "")
    to_raw = headers.get("to", "")
    cc_raw = headers.get("cc", "")

    # Determine direction heuristically: if labelIds contains SENT → outbound
    labels = msg.get("labelIds", [])
    direction = "outbound" if "SENT" in labels else "inbound"

    return {
        "id": msg.get("id", ""),
        "thread_id": msg.get("threadId", ""),
        "direction": direction,
        "subject": headers.get("subject", ""),
        "body_text": (body_text or "")[:500],
        "from_address": from_addr,
        "to_addresses": [a.strip() for a in to_raw.split(",") if a.strip()],
        "cc_addresses": [a.strip() for a in cc_raw.split(",") if a.strip()],
        "status": "sent" if direction == "outbound" else "delivered",
        "date": headers.get("date", ""),
        "snippet": msg.get("snippet", ""),
        "source": "gmail",
    }


async def _gmail_search(token: str, query: str, max_results: int = 20) -> list[dict]:
    """Search Gmail messages and return normalised dicts."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{GMAIL_BASE}/messages",
            headers={"Authorization": f"Bearer {token}"},
            params={"q": query, "maxResults": min(max_results, 50)},
        )
        if not resp.is_success:
            logger.warning("Gmail search failed: %s", resp.text[:300])
            return []

        message_refs = resp.json().get("messages", [])
        if not message_refs:
            return []

        # Fetch full messages in parallel-ish (sequential for simplicity + rate limits)
        results: list[dict] = []
        for ref in message_refs[:max_results]:
            msg_resp = await client.get(
                f"{GMAIL_BASE}/messages/{ref['id']}",
                headers={"Authorization": f"Bearer {token}"},
                params={"format": "full"},
            )
            if msg_resp.is_success:
                results.append(_gmail_msg_to_dict(msg_resp.json()))
        return results


async def _gmail_get_thread(token: str, thread_id: str) -> list[dict]:
    """Fetch all messages in a Gmail thread."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{GMAIL_BASE}/threads/{thread_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"format": "full"},
        )
        if not resp.is_success:
            logger.warning("Gmail thread fetch failed: %s", resp.text[:300])
            return []

        messages = resp.json().get("messages", [])
        return [_gmail_msg_to_dict(m) for m in messages]


async def _gmail_create_draft(token: str, to: list[str], subject: str, body: str,
                               cc: list[str] | None = None,
                               from_address: str | None = None) -> dict | None:
    """Create a draft in Gmail. Returns the draft resource or None."""
    mime = MIMEText(body, "plain")
    mime["to"] = ", ".join(to)
    mime["subject"] = subject
    if cc:
        mime["cc"] = ", ".join(cc)
    if from_address:
        mime["from"] = from_address

    raw = base64.urlsafe_b64encode(mime.as_bytes()).decode("ascii")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{GMAIL_BASE}/drafts",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"message": {"raw": raw}},
        )
        if resp.is_success:
            return resp.json()
        logger.warning("Gmail draft creation failed: %s", resp.text[:300])
        return None


async def _gmail_send(token: str, to: list[str], subject: str, body: str,
                       cc: list[str] | None = None,
                       from_address: str | None = None) -> dict | None:
    """Send an email via Gmail API. Returns the sent message or None."""
    mime = MIMEText(body, "plain")
    mime["to"] = ", ".join(to)
    mime["subject"] = subject
    if cc:
        mime["cc"] = ", ".join(cc)
    if from_address:
        mime["from"] = from_address

    raw = base64.urlsafe_b64encode(mime.as_bytes()).decode("ascii")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{GMAIL_BASE}/messages/send",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"raw": raw},
        )
        if resp.is_success:
            return resp.json()
        logger.warning("Gmail send failed: %s", resp.text[:300])
        return None


async def _gmail_send_draft(token: str, draft_id: str) -> dict | None:
    """Send an existing Gmail draft by ID."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{GMAIL_BASE}/drafts/send",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"id": draft_id},
        )
        if resp.is_success:
            return resp.json()
        logger.warning("Gmail draft send failed: %s", resp.text[:300])
        return None


# ---------------------------------------------------------------------------
# Local DB helper
# ---------------------------------------------------------------------------

def _email_to_dict(e: CRMEmail) -> dict:
    return {
        "id": e.id,
        "contact_id": e.contact_id,
        "deal_id": e.deal_id,
        "direction": e.direction,
        "subject": e.subject,
        "body_text": (e.body_text or "")[:500],
        "from_address": e.from_address,
        "to_addresses": json.loads(e.to_addresses) if e.to_addresses else [],
        "cc_addresses": json.loads(e.cc_addresses) if e.cc_addresses else [],
        "thread_id": e.thread_id,
        "status": e.status,
        "sent_at": e.sent_at.isoformat() if e.sent_at else None,
        "received_at": e.received_at.isoformat() if e.received_at else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "source": "local",
    }


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def search_emails(inp: dict, ctx: ToolContext) -> ToolResult:
    """Search emails by subject, body, or contact.

    Tries Gmail API first for real-time results, falls back to local DB.
    """
    query = inp.get("query", "").strip()
    contact_id = inp.get("contact_id")
    direction = inp.get("direction")
    limit = min(inp.get("limit", 20), 50)

    # --- Try Gmail API ---
    token = await _get_gmail_token(ctx.user_id)
    if token and query:
        gmail_query_parts: list[str] = []
        if query:
            gmail_query_parts.append(query)
        if direction == "inbound":
            gmail_query_parts.append("in:inbox")
        elif direction == "outbound":
            gmail_query_parts.append("in:sent")

        gmail_q = " ".join(gmail_query_parts)
        try:
            emails = await _gmail_search(token, gmail_q, max_results=limit)
            if emails:
                return ToolResult(
                    success=True,
                    output={"emails": emails, "count": len(emails), "source": "gmail"},
                )
        except Exception as exc:
            logger.warning("Gmail search failed, falling back to local: %s", exc)

    # --- Fallback: local CRMEmail table ---
    async with async_session() as session:
        stmt = select(CRMEmail).order_by(CRMEmail.created_at.desc()).limit(limit)

        if query:
            pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    CRMEmail.subject.ilike(pattern),
                    CRMEmail.body_text.ilike(pattern),
                )
            )
        if contact_id:
            stmt = stmt.where(CRMEmail.contact_id == contact_id)
        if direction:
            stmt = stmt.where(CRMEmail.direction == direction)

        rows = await session.execute(stmt)
        emails = [_email_to_dict(e) for e in rows.scalars().all()]

    return ToolResult(success=True, output={"emails": emails, "count": len(emails), "source": "local"})


async def draft_email(inp: dict, ctx: ToolContext) -> ToolResult:
    """Create a draft email.

    Pushes to Gmail as a real draft when connected, and always saves to
    the local CRMEmail table.
    """
    subject = inp.get("subject", "").strip()
    body = inp.get("body", "").strip()
    to_addresses = inp.get("to_addresses", [])
    from_address = inp.get("from_address", "")
    cc_addresses = inp.get("cc_addresses", [])
    contact_id = inp.get("contact_id", "")
    deal_id = inp.get("deal_id")

    if not subject:
        return ToolResult(success=False, output=None, error="subject is required")
    if not body:
        return ToolResult(success=False, output=None, error="body is required")
    if not to_addresses:
        return ToolResult(success=False, output=None, error="to_addresses is required (list of email strings)")

    gmail_draft_id: str | None = None
    source = "local"

    # --- Try Gmail API ---
    token = await _get_gmail_token(ctx.user_id)
    if token:
        try:
            draft = await _gmail_create_draft(
                token, to=to_addresses, subject=subject, body=body,
                cc=cc_addresses or None, from_address=from_address or None,
            )
            if draft:
                gmail_draft_id = draft.get("id")
                source = "gmail"
        except Exception as exc:
            logger.warning("Gmail draft creation failed, saving locally only: %s", exc)

    # --- Always save to local DB ---
    email_id = str(uuid.uuid4())
    email = CRMEmail(
        id=email_id,
        contact_id=contact_id,
        deal_id=deal_id,
        direction="outbound",
        subject=subject,
        body_text=body,
        body_html=None,
        from_address=from_address,
        to_addresses=json.dumps(to_addresses),
        cc_addresses=json.dumps(cc_addresses),
        status="draft",
        external_message_id=gmail_draft_id,
        created_by=ctx.agent_id,
        created_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(email)
        await session.commit()
        await session.refresh(email)

    result_dict = _email_to_dict(email)
    result_dict["source"] = source
    if gmail_draft_id:
        result_dict["gmail_draft_id"] = gmail_draft_id

    return ToolResult(
        success=True,
        output={
            "message": f"Draft created: {subject}"
                       + (" (also saved as Gmail draft)" if gmail_draft_id else ""),
            "email": result_dict,
        },
    )


async def send_email(inp: dict, ctx: ToolContext) -> ToolResult:
    """Send an email.

    If a draft email_id is provided, marks it as sent in local DB and
    sends via Gmail API if connected.  If no email_id but to/subject/body
    are provided, composes and sends directly.
    """
    email_id = inp.get("email_id", "")

    # --- Direct send (no existing draft) ---
    if not email_id:
        to_addresses = inp.get("to_addresses", [])
        subject = inp.get("subject", "").strip()
        body = inp.get("body", "").strip()
        if not to_addresses or not subject or not body:
            return ToolResult(
                success=False, output=None,
                error="Either email_id (for existing draft) or to_addresses + subject + body are required",
            )

        cc_addresses = inp.get("cc_addresses", [])
        from_address = inp.get("from_address", "")
        sent_via_gmail = False

        # Try Gmail
        token = await _get_gmail_token(ctx.user_id)
        if token:
            try:
                result = await _gmail_send(
                    token, to=to_addresses, subject=subject, body=body,
                    cc=cc_addresses or None, from_address=from_address or None,
                )
                if result:
                    sent_via_gmail = True
            except Exception as exc:
                logger.warning("Gmail send failed: %s", exc)

        # Save to local DB
        new_email = CRMEmail(
            id=str(uuid.uuid4()),
            direction="outbound",
            subject=subject,
            body_text=body,
            from_address=from_address,
            to_addresses=json.dumps(to_addresses),
            cc_addresses=json.dumps(cc_addresses),
            status="sent",
            sent_at=datetime.utcnow(),
            created_by=ctx.agent_id,
            created_at=datetime.utcnow(),
        )
        async with async_session() as session:
            session.add(new_email)
            await session.commit()

        return ToolResult(
            success=True,
            output={
                "message": f"Email sent: {subject}"
                           + (" via Gmail" if sent_via_gmail else " (local only)"),
                "email_id": new_email.id,
                "source": "gmail" if sent_via_gmail else "local",
            },
        )

    # --- Send existing draft ---
    async with async_session() as session:
        email = await session.get(CRMEmail, email_id)
        if not email:
            return ToolResult(success=False, output=None, error=f"Email {email_id} not found")
        if email.status != "draft":
            return ToolResult(
                success=False, output=None,
                error=f"Email is already '{email.status}' — only drafts can be sent",
            )

        sent_via_gmail = False
        token = await _get_gmail_token(ctx.user_id)

        # If there's a Gmail draft ID, send that draft
        if token and email.external_message_id:
            try:
                result = await _gmail_send_draft(token, email.external_message_id)
                if result:
                    sent_via_gmail = True
            except Exception as exc:
                logger.warning("Gmail draft send failed: %s", exc)

        # Otherwise try sending fresh via Gmail
        if token and not sent_via_gmail:
            to_addrs = json.loads(email.to_addresses) if email.to_addresses else []
            cc_addrs = json.loads(email.cc_addresses) if email.cc_addresses else []
            if to_addrs and email.subject and email.body_text:
                try:
                    result = await _gmail_send(
                        token, to=to_addrs, subject=email.subject, body=email.body_text,
                        cc=cc_addrs or None, from_address=email.from_address or None,
                    )
                    if result:
                        sent_via_gmail = True
                except Exception as exc:
                    logger.warning("Gmail fresh send failed: %s", exc)

        # Update local DB — create new row (immutable pattern)
        email.status = "sent"
        email.sent_at = datetime.utcnow()
        session.add(email)
        await session.commit()

    return ToolResult(
        success=True,
        output={
            "message": f"Email sent: {email.subject}"
                       + (" via Gmail" if sent_via_gmail else " (local only)"),
            "email_id": email.id,
            "source": "gmail" if sent_via_gmail else "local",
        },
    )


async def get_email_thread(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get all emails in a thread.

    Uses Gmail Threads API for real-time data when connected, falls back
    to local CRMEmail table.
    """
    thread_id = inp.get("thread_id", "")
    if not thread_id:
        return ToolResult(success=False, output=None, error="thread_id is required")

    # --- Try Gmail API ---
    token = await _get_gmail_token(ctx.user_id)
    if token:
        try:
            emails = await _gmail_get_thread(token, thread_id)
            if emails:
                return ToolResult(
                    success=True,
                    output={"emails": emails, "count": len(emails), "source": "gmail"},
                )
        except Exception as exc:
            logger.warning("Gmail thread fetch failed, falling back to local: %s", exc)

    # --- Fallback: local DB ---
    async with async_session() as session:
        stmt = (
            select(CRMEmail)
            .where(CRMEmail.thread_id == thread_id)
            .order_by(CRMEmail.created_at)
        )
        rows = await session.execute(stmt)
        emails = [_email_to_dict(e) for e in rows.scalars().all()]

    if not emails:
        return ToolResult(success=True, output={"emails": [], "message": f"No emails found for thread {thread_id}"})

    return ToolResult(success=True, output={"emails": emails, "count": len(emails), "source": "local"})


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="search_emails",
        display_name="Search Emails",
        description=(
            "Search emails by keyword, contact, or direction. "
            "Uses Gmail API when connected for real-time results, "
            "otherwise searches the local CRM email database."
        ),
        category="email",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search text to match in subject or body"},
                "contact_id": {"type": "string", "description": "Filter by CRM contact ID"},
                "direction": {"type": "string", "enum": ["inbound", "outbound"], "description": "Filter by email direction"},
                "limit": {"type": "integer", "description": "Max results (default 20, max 50)"},
            },
        },
        handler=search_emails,
    ))

    registry.register_builtin(ToolDefinition(
        name="draft_email",
        display_name="Draft Email",
        description=(
            "Create a draft email. When Gmail is connected, also creates a "
            "real Gmail draft. Does NOT send — use send_email to send after review."
        ),
        category="email",
        input_schema={
            "type": "object",
            "properties": {
                "subject": {"type": "string", "description": "Email subject line"},
                "body": {"type": "string", "description": "Email body text"},
                "to_addresses": {"type": "array", "items": {"type": "string"}, "description": "List of recipient email addresses"},
                "from_address": {"type": "string", "description": "Sender email address"},
                "cc_addresses": {"type": "array", "items": {"type": "string"}, "description": "CC email addresses"},
                "contact_id": {"type": "string", "description": "CRM contact ID to link this email to"},
                "deal_id": {"type": "string", "description": "CRM deal ID to link this email to"},
            },
            "required": ["subject", "body", "to_addresses"],
        },
        handler=draft_email,
    ))

    registry.register_builtin(ToolDefinition(
        name="send_email",
        display_name="Send Email",
        description=(
            "Send an email. Can send an existing draft by email_id, or compose "
            "and send directly with to_addresses + subject + body. "
            "Uses Gmail API when connected for real delivery."
        ),
        category="email",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "email_id": {"type": "string", "description": "Draft email ID to send (optional — provide this OR to_addresses+subject+body)"},
                "to_addresses": {"type": "array", "items": {"type": "string"}, "description": "Recipient emails (for direct send without draft)"},
                "subject": {"type": "string", "description": "Subject (for direct send)"},
                "body": {"type": "string", "description": "Body text (for direct send)"},
                "from_address": {"type": "string", "description": "Sender email (for direct send)"},
                "cc_addresses": {"type": "array", "items": {"type": "string"}, "description": "CC emails (for direct send)"},
            },
        },
        handler=send_email,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_email_thread",
        display_name="Get Email Thread",
        description=(
            "Retrieve all emails in a conversation thread. "
            "Uses Gmail Threads API when connected for real-time data."
        ),
        category="email",
        input_schema={
            "type": "object",
            "properties": {
                "thread_id": {"type": "string", "description": "The email thread ID"},
            },
            "required": ["thread_id"],
        },
        handler=get_email_thread,
    ))
