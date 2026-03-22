"""Knowledge / search built-in tools — hybrid semantic + keyword search across messages, notes, and contact history."""

from __future__ import annotations

import logging

from sqlmodel import select, or_, col

from app.core.db import async_session
from app.models.chat import Message
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_note import CRMNote
from app.models.crm_email import CRMEmail
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def search_workspace(inp: dict, ctx: ToolContext) -> ToolResult:
    """Hybrid semantic + keyword search across chat messages and CRM notes."""
    query = inp.get("query", "")
    limit = min(inp.get("limit", 10), 25)
    if not query.strip():
        return ToolResult(success=False, output=None, error="query is required")

    results: list[dict] = []
    seen_ids: set[str] = set()

    # 1. Semantic vector search (highest quality — understands meaning)
    try:
        from app.services.embedding_service import (
            vector_search_messages,
            vector_search_crm_notes,
        )

        vec_msgs = await vector_search_messages(query, limit=limit)
        for m in vec_msgs:
            if m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                results.append({
                    "type": "message",
                    "id": m["id"],
                    "channel_id": m["channel_id"],
                    "sender_id": m["sender_id"],
                    "content": (m["content"] or "")[:300],
                    "created_at": m["created_at"],
                    "similarity": m.get("similarity"),
                })

        vec_notes = await vector_search_crm_notes(query, limit=limit)
        for n in vec_notes:
            if n["id"] not in seen_ids:
                seen_ids.add(n["id"])
                results.append({
                    "type": "crm_note",
                    "id": n["id"],
                    "contact_id": n["contact_id"],
                    "content": (n["content"] or "")[:300],
                    "created_at": n["created_at"],
                    "similarity": n.get("similarity"),
                })
    except Exception:
        logger.debug("Vector search unavailable, falling back to keyword only", exc_info=True)

    # 2. Keyword fallback — catches exact matches that embeddings may miss
    pattern = f"%{query}%"
    remaining_msg = max(0, limit - sum(1 for r in results if r["type"] == "message"))
    remaining_note = max(0, limit - sum(1 for r in results if r["type"] == "crm_note"))

    async with async_session() as session:
        if remaining_msg > 0:
            msg_stmt = (
                select(Message)
                .where(col(Message.content).ilike(pattern))
                .order_by(Message.created_at.desc())
                .limit(remaining_msg + len(seen_ids))  # over-fetch to account for dedup
            )
            for m in (await session.execute(msg_stmt)).scalars().all():
                if m.id not in seen_ids:
                    seen_ids.add(m.id)
                    results.append({
                        "type": "message",
                        "id": m.id,
                        "channel_id": m.channel_id,
                        "sender_id": m.sender_id,
                        "content": (m.content or "")[:300],
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                    })

        if remaining_note > 0:
            note_stmt = (
                select(CRMNote)
                .where(col(CRMNote.content).ilike(pattern))
                .order_by(CRMNote.created_at.desc())
                .limit(remaining_note + len(seen_ids))
            )
            for n in (await session.execute(note_stmt)).scalars().all():
                if n.id not in seen_ids:
                    seen_ids.add(n.id)
                    results.append({
                        "type": "crm_note",
                        "id": n.id,
                        "contact_id": n.contact_id,
                        "content": (n.content or "")[:300],
                        "created_at": n.created_at.isoformat() if n.created_at else None,
                    })

    return ToolResult(success=True, output={"results": results[:limit], "total": len(results)})


async def search_crm_notes(inp: dict, ctx: ToolContext) -> ToolResult:
    """Hybrid semantic + keyword search on CRM notes, optionally filtered by contact_id."""
    query = inp.get("query", "")
    contact_id = inp.get("contact_id")
    limit = min(inp.get("limit", 10), 25)

    notes: list[dict] = []
    seen_ids: set[str] = set()

    # 1. Semantic vector search (when query is provided)
    if query.strip():
        try:
            from app.services.embedding_service import vector_search_crm_notes

            vec_results = await vector_search_crm_notes(
                query, contact_id=contact_id, limit=limit,
            )
            for n in vec_results:
                if n["id"] not in seen_ids:
                    seen_ids.add(n["id"])
                    notes.append({
                        "id": n["id"],
                        "contact_id": n["contact_id"],
                        "content": (n["content"] or "")[:500],
                        "created_by": n.get("created_by"),
                        "created_at": n["created_at"],
                        "similarity": n.get("similarity"),
                    })
        except Exception:
            logger.debug("Vector search unavailable for CRM notes", exc_info=True)

    # 2. Keyword fallback — fills gaps
    remaining = max(0, limit - len(notes))
    if remaining > 0:
        async with async_session() as session:
            stmt = select(CRMNote).order_by(CRMNote.created_at.desc()).limit(remaining + len(seen_ids))
            conditions = []
            if query.strip():
                conditions.append(col(CRMNote.content).ilike(f"%{query}%"))
            if contact_id:
                conditions.append(CRMNote.contact_id == contact_id)
            if conditions:
                stmt = stmt.where(*conditions)

            for n in (await session.execute(stmt)).scalars().all():
                if n.id not in seen_ids:
                    seen_ids.add(n.id)
                    notes.append({
                        "id": n.id,
                        "contact_id": n.contact_id,
                        "content": (n.content or "")[:500],
                        "is_pinned": n.is_pinned,
                        "created_by": n.created_by,
                        "created_at": n.created_at.isoformat() if n.created_at else None,
                    })

    return ToolResult(success=True, output={"notes": notes[:limit], "count": len(notes)})


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
        description=(
            "Semantic search across chat messages and CRM notes. "
            "Understands meaning — e.g. 'pricing concerns' finds 'too expensive' and 'budget constraints'. "
            "Falls back to keyword matching when needed."
        ),
        category="knowledge",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query — natural language works best"},
                "limit": {"type": "integer", "description": "Max results (default 10, max 25)"},
            },
            "required": ["query"],
        },
        handler=search_workspace,
    ))

    registry.register_builtin(ToolDefinition(
        name="search_crm_notes",
        display_name="Search CRM Notes",
        description=(
            "Semantic search on CRM notes. Understands meaning beyond exact keywords. "
            "Optionally filter by contact_id."
        ),
        category="knowledge",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query — natural language works best"},
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
