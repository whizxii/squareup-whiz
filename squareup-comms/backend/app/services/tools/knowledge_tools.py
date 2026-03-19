"""Knowledge / search built-in tools — full-text search across messages, notes, and contact history."""

from __future__ import annotations

from sqlmodel import select, or_, col

from app.core.db import async_session
from app.models.chat import Message
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_note import CRMNote
from app.models.crm_email import CRMEmail
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def search_workspace(inp: dict, ctx: ToolContext) -> ToolResult:
    """Full-text search across chat messages and CRM notes."""
    query = inp.get("query", "")
    limit = min(inp.get("limit", 10), 25)
    if not query.strip():
        return ToolResult(success=False, output=None, error="query is required")

    pattern = f"%{query}%"
    results: list[dict] = []

    async with async_session() as session:
        # Search messages
        msg_stmt = (
            select(Message)
            .where(col(Message.content).ilike(pattern))
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        msg_rows = await session.execute(msg_stmt)
        for m in msg_rows.scalars().all():
            results.append({
                "type": "message",
                "id": m.id,
                "channel_id": m.channel_id,
                "sender_id": m.sender_id,
                "content": m.content[:300],
                "created_at": m.created_at.isoformat() if m.created_at else None,
            })

        # Search CRM notes
        note_stmt = (
            select(CRMNote)
            .where(col(CRMNote.content).ilike(pattern))
            .order_by(CRMNote.created_at.desc())
            .limit(limit)
        )
        note_rows = await session.execute(note_stmt)
        for n in note_rows.scalars().all():
            results.append({
                "type": "crm_note",
                "id": n.id,
                "contact_id": n.contact_id,
                "content": (n.content or "")[:300],
                "created_at": n.created_at.isoformat() if n.created_at else None,
            })

    return ToolResult(success=True, output={"results": results[:limit], "total": len(results)})


async def search_crm_notes(inp: dict, ctx: ToolContext) -> ToolResult:
    """Search CRM notes by content, optionally filtered by contact_id."""
    query = inp.get("query", "")
    contact_id = inp.get("contact_id")
    limit = min(inp.get("limit", 10), 25)

    async with async_session() as session:
        stmt = select(CRMNote).order_by(CRMNote.created_at.desc()).limit(limit)
        conditions = []
        if query.strip():
            conditions.append(col(CRMNote.content).ilike(f"%{query}%"))
        if contact_id:
            conditions.append(CRMNote.contact_id == contact_id)
        if conditions:
            stmt = stmt.where(*conditions)

        rows = await session.execute(stmt)
        notes = [
            {
                "id": n.id,
                "contact_id": n.contact_id,
                "content": (n.content or "")[:500],
                "is_pinned": n.is_pinned,
                "created_by": n.created_by,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in rows.scalars().all()
        ]
    return ToolResult(success=True, output={"notes": notes, "count": len(notes)})


async def get_contact_history(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get full interaction history for a contact — activities, emails, notes."""
    contact_id = inp.get("contact_id", "")
    if not contact_id:
        return ToolResult(success=False, output=None, error="contact_id is required")

    limit = min(inp.get("limit", 20), 50)
    history: list[dict] = []

    async with async_session() as session:
        # Verify contact exists
        contact = await session.get(CRMContact, contact_id)
        if not contact:
            return ToolResult(success=False, output=None, error=f"Contact {contact_id} not found")

        # Activities
        act_stmt = (
            select(CRMActivity)
            .where(CRMActivity.contact_id == contact_id)
            .order_by(CRMActivity.activity_date.desc())
            .limit(limit)
        )
        act_rows = await session.execute(act_stmt)
        for a in act_rows.scalars().all():
            history.append({
                "type": "activity",
                "id": a.id,
                "activity_type": a.activity_type,
                "subject": a.subject,
                "notes": (a.notes or "")[:200],
                "date": a.activity_date.isoformat() if a.activity_date else None,
            })

        # Emails
        email_stmt = (
            select(CRMEmail)
            .where(CRMEmail.contact_id == contact_id)
            .order_by(CRMEmail.created_at.desc())
            .limit(limit)
        )
        email_rows = await session.execute(email_stmt)
        for e in email_rows.scalars().all():
            history.append({
                "type": "email",
                "id": e.id,
                "direction": e.direction,
                "subject": e.subject,
                "from": e.from_address,
                "status": e.status,
                "date": (e.sent_at or e.created_at).isoformat() if (e.sent_at or e.created_at) else None,
            })

        # Notes
        note_stmt = (
            select(CRMNote)
            .where(CRMNote.contact_id == contact_id)
            .order_by(CRMNote.created_at.desc())
            .limit(limit)
        )
        note_rows = await session.execute(note_stmt)
        for n in note_rows.scalars().all():
            history.append({
                "type": "note",
                "id": n.id,
                "content": (n.content or "")[:300],
                "is_pinned": n.is_pinned,
                "date": n.created_at.isoformat() if n.created_at else None,
            })

    # Sort all by date descending
    history.sort(key=lambda h: h.get("date", ""), reverse=True)

    return ToolResult(
        success=True,
        output={
            "contact": {"id": contact.id, "name": contact.name, "email": contact.email},
            "history": history[:limit],
            "total": len(history),
        },
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="search_workspace",
        display_name="Search Workspace",
        description="Full-text search across chat messages and CRM notes. Returns matching items with snippets.",
        category="knowledge",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query text"},
                "limit": {"type": "integer", "description": "Max results (default 10, max 25)"},
            },
            "required": ["query"],
        },
        handler=search_workspace,
    ))

    registry.register_builtin(ToolDefinition(
        name="search_crm_notes",
        display_name="Search CRM Notes",
        description="Search CRM notes by content text. Optionally filter by contact_id.",
        category="knowledge",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query text"},
                "contact_id": {"type": "string", "description": "Optional: filter notes by contact ID"},
                "limit": {"type": "integer", "description": "Max results (default 10, max 25)"},
            },
        },
        handler=search_crm_notes,
    ))

    registry.register_builtin(ToolDefinition(
        name="get_contact_history",
        display_name="Get Contact History",
        description="Get full interaction history for a CRM contact — all activities, emails, and notes sorted by date.",
        category="knowledge",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The CRM contact ID"},
                "limit": {"type": "integer", "description": "Max items per category (default 20, max 50)"},
            },
            "required": ["contact_id"],
        },
        handler=get_contact_history,
    ))
