"""Cross-module entity intelligence tools — unified queries across CRM, tasks, messages, and more."""

from __future__ import annotations

import json
import logging
from datetime import datetime

from sqlmodel import select, col, or_

from app.core.db import async_session
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.crm_company import CRMCompany
from app.models.crm_note import CRMNote
from app.models.crm_email import CRMEmail
from app.models.tasks import Task
from app.models.chat import Message
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _safe_json_loads(raw: str | None) -> list | dict:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []


# ---------------------------------------------------------------------------
# Tool: entity_360_view — "Tell me everything about X"
# ---------------------------------------------------------------------------

async def entity_360_view(inp: dict, ctx: ToolContext) -> ToolResult:
    """Build a comprehensive 360° view of an entity (contact, company, or deal).

    Aggregates data from CRM contacts, deals, activities, emails, notes,
    tasks, and recent messages into a single coherent response.
    """
    entity_type = inp.get("entity_type", "contact")
    entity_id = inp.get("entity_id", "")
    search_name = inp.get("search_name", "")

    if not entity_id and not search_name:
        return ToolResult(success=False, output=None, error="Provide entity_id or search_name")

    if entity_type == "contact":
        return await _contact_360(entity_id, search_name)
    elif entity_type == "company":
        return await _company_360(entity_id, search_name)
    elif entity_type == "deal":
        return await _deal_360(entity_id, search_name)
    else:
        return ToolResult(success=False, output=None, error=f"Unknown entity_type: {entity_type}")


async def _contact_360(entity_id: str, search_name: str) -> ToolResult:
    """Full 360° view for a CRM contact."""
    async with async_session() as session:
        # Resolve contact
        contact: CRMContact | None = None
        if entity_id:
            contact = await session.get(CRMContact, entity_id)
        if not contact and search_name:
            stmt = (
                select(CRMContact)
                .where(
                    CRMContact.is_archived == False,  # noqa: E712
                    or_(
                        col(CRMContact.name).ilike(f"%{search_name}%"),
                        col(CRMContact.email).ilike(f"%{search_name}%"),
                        col(CRMContact.company).ilike(f"%{search_name}%"),
                    ),
                )
                .order_by(CRMContact.updated_at.desc())
                .limit(1)
            )
            result = await session.execute(stmt)
            contact = result.scalar_one_or_none()

        if not contact:
            return ToolResult(success=False, output=None, error=f"Contact not found: {entity_id or search_name}")

        # Profile
        profile = {
            "id": contact.id,
            "name": contact.name,
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "title": contact.title,
            "stage": contact.stage,
            "lifecycle_stage": contact.lifecycle_stage,
            "value": contact.value,
            "currency": contact.currency,
            "lead_score": contact.lead_score,
            "relationship_strength": contact.relationship_strength,
            "source": contact.source,
            "owner_id": contact.owner_id,
            "tags": _safe_json_loads(contact.tags),
            "ai_summary": contact.ai_summary,
            "sentiment_score": contact.sentiment_score,
            "ai_tags": _safe_json_loads(contact.ai_tags),
            "last_contacted_at": _safe_iso(contact.last_contacted_at),
            "next_follow_up_at": _safe_iso(contact.next_follow_up_at),
            "follow_up_note": contact.follow_up_note,
            "activity_count": contact.activity_count,
            "created_at": _safe_iso(contact.created_at),
        }

        # Company info (if linked)
        company_info = None
        if contact.company_id:
            company = await session.get(CRMCompany, contact.company_id)
            if company:
                company_info = {
                    "id": company.id,
                    "name": company.name,
                    "domain": company.domain,
                    "industry": company.industry,
                    "size": company.size,
                    "website": company.website,
                    "annual_revenue": company.annual_revenue,
                }

        # Deals
        deal_stmt = (
            select(CRMDeal)
            .where(CRMDeal.contact_id == contact.id)
            .order_by(CRMDeal.updated_at.desc())
            .limit(10)
        )
        deal_rows = (await session.execute(deal_stmt)).scalars().all()
        deals = [
            {
                "id": d.id,
                "title": d.title,
                "stage": d.stage,
                "value": d.value,
                "probability": d.probability,
                "status": d.status,
                "deal_health": d.deal_health,
                "expected_close_date": _safe_iso(d.expected_close_date),
                "created_at": _safe_iso(d.created_at),
            }
            for d in deal_rows
        ]

        # Recent activities (last 10)
        act_stmt = (
            select(CRMActivity)
            .where(CRMActivity.contact_id == contact.id)
            .order_by(CRMActivity.created_at.desc())
            .limit(10)
        )
        act_rows = (await session.execute(act_stmt)).scalars().all()
        activities = [
            {
                "type": a.type,
                "title": a.title,
                "content": (a.content or "")[:200],
                "performer_name": a.performer_name,
                "created_at": _safe_iso(a.created_at),
            }
            for a in act_rows
        ]

        # Recent emails (last 5)
        email_stmt = (
            select(CRMEmail)
            .where(CRMEmail.contact_id == contact.id)
            .order_by(CRMEmail.created_at.desc())
            .limit(5)
        )
        email_rows = (await session.execute(email_stmt)).scalars().all()
        emails = [
            {
                "direction": e.direction,
                "subject": e.subject,
                "status": e.status,
                "from_address": e.from_address,
                "sent_at": _safe_iso(e.sent_at),
                "created_at": _safe_iso(e.created_at),
            }
            for e in email_rows
        ]

        # Notes (last 5)
        note_stmt = (
            select(CRMNote)
            .where(CRMNote.contact_id == contact.id)
            .order_by(CRMNote.created_at.desc())
            .limit(5)
        )
        note_rows = (await session.execute(note_stmt)).scalars().all()
        notes = [
            {
                "content": (n.content or "")[:300],
                "is_pinned": n.is_pinned,
                "created_at": _safe_iso(n.created_at),
            }
            for n in note_rows
        ]

        # Related tasks (search by contact name in title/description)
        task_stmt = (
            select(Task)
            .where(
                Task.status != "done",
                or_(
                    col(Task.title).ilike(f"%{contact.name}%"),
                    col(Task.description).ilike(f"%{contact.name}%"),
                ),
            )
            .order_by(Task.created_at.desc())
            .limit(5)
        )
        task_rows = (await session.execute(task_stmt)).scalars().all()
        tasks = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": _safe_iso(t.due_date),
                "assigned_to": t.assigned_to,
            }
            for t in task_rows
        ]

        # Recent mentions in chat (search by name in message content)
        msg_stmt = (
            select(Message)
            .where(col(Message.content).ilike(f"%{contact.name}%"))
            .order_by(Message.created_at.desc())
            .limit(5)
        )
        msg_rows = (await session.execute(msg_stmt)).scalars().all()
        recent_mentions = [
            {
                "channel_id": m.channel_id,
                "sender_id": m.sender_id,
                "content": (m.content or "")[:200],
                "created_at": _safe_iso(m.created_at),
            }
            for m in msg_rows
        ]

    # Compute summary stats
    total_deal_value = sum(d.get("value") or 0 for d in deals)
    open_deals = sum(1 for d in deals if d.get("status") == "open")

    return ToolResult(
        success=True,
        output={
            "entity_type": "contact",
            "profile": profile,
            "company": company_info,
            "summary": {
                "total_deals": len(deals),
                "open_deals": open_deals,
                "total_deal_value": total_deal_value,
                "total_activities": len(activities),
                "total_emails": len(emails),
                "total_notes": len(notes),
                "pending_tasks": len(tasks),
                "recent_chat_mentions": len(recent_mentions),
            },
            "deals": deals,
            "activities": activities,
            "emails": emails,
            "notes": notes,
            "tasks": tasks,
            "recent_chat_mentions": recent_mentions,
        },
    )


async def _company_360(entity_id: str, search_name: str) -> ToolResult:
    """Full 360° view for a CRM company."""
    async with async_session() as session:
        company: CRMCompany | None = None
        if entity_id:
            company = await session.get(CRMCompany, entity_id)
        if not company and search_name:
            stmt = (
                select(CRMCompany)
                .where(
                    CRMCompany.is_archived == False,  # noqa: E712
                    or_(
                        col(CRMCompany.name).ilike(f"%{search_name}%"),
                        col(CRMCompany.domain).ilike(f"%{search_name}%"),
                    ),
                )
                .order_by(CRMCompany.updated_at.desc())
                .limit(1)
            )
            result = await session.execute(stmt)
            company = result.scalar_one_or_none()

        if not company:
            return ToolResult(success=False, output=None, error=f"Company not found: {entity_id or search_name}")

        profile = {
            "id": company.id,
            "name": company.name,
            "domain": company.domain,
            "industry": company.industry,
            "size": company.size,
            "website": company.website,
            "annual_revenue": company.annual_revenue,
            "employee_count": company.employee_count,
            "description": company.description,
            "social_profiles": _safe_json_loads(company.social_profiles),
            "created_at": _safe_iso(company.created_at),
        }

        # All contacts at this company
        contact_stmt = (
            select(CRMContact)
            .where(
                CRMContact.company_id == company.id,
                CRMContact.is_archived == False,  # noqa: E712
            )
            .order_by(CRMContact.updated_at.desc())
            .limit(20)
        )
        contact_rows = (await session.execute(contact_stmt)).scalars().all()
        contacts = [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "title": c.title,
                "stage": c.stage,
                "lead_score": c.lead_score,
                "last_contacted_at": _safe_iso(c.last_contacted_at),
            }
            for c in contact_rows
        ]

        # Also find contacts by company name (for contacts without company_id link)
        name_contact_ids = {c.id for c in contact_rows}
        name_stmt = (
            select(CRMContact)
            .where(
                CRMContact.is_archived == False,  # noqa: E712
                col(CRMContact.company).ilike(f"%{company.name}%"),
                CRMContact.id.notin_(name_contact_ids) if name_contact_ids else True,
            )
            .order_by(CRMContact.updated_at.desc())
            .limit(10)
        )
        name_rows = (await session.execute(name_stmt)).scalars().all()
        for c in name_rows:
            contacts.append({
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "title": c.title,
                "stage": c.stage,
                "lead_score": c.lead_score,
                "last_contacted_at": _safe_iso(c.last_contacted_at),
            })

        # Deals linked to this company
        deal_stmt = (
            select(CRMDeal)
            .where(CRMDeal.company_id == company.id)
            .order_by(CRMDeal.updated_at.desc())
            .limit(15)
        )
        deal_rows = (await session.execute(deal_stmt)).scalars().all()
        deals = [
            {
                "id": d.id,
                "title": d.title,
                "stage": d.stage,
                "value": d.value,
                "status": d.status,
                "deal_health": d.deal_health,
                "contact_id": d.contact_id,
                "expected_close_date": _safe_iso(d.expected_close_date),
            }
            for d in deal_rows
        ]

        # Chat mentions of this company
        msg_stmt = (
            select(Message)
            .where(col(Message.content).ilike(f"%{company.name}%"))
            .order_by(Message.created_at.desc())
            .limit(5)
        )
        msg_rows = (await session.execute(msg_stmt)).scalars().all()
        recent_mentions = [
            {
                "channel_id": m.channel_id,
                "sender_id": m.sender_id,
                "content": (m.content or "")[:200],
                "created_at": _safe_iso(m.created_at),
            }
            for m in msg_rows
        ]

    total_deal_value = sum(d.get("value") or 0 for d in deals)
    open_deals = sum(1 for d in deals if d.get("status") == "open")

    return ToolResult(
        success=True,
        output={
            "entity_type": "company",
            "profile": profile,
            "summary": {
                "total_contacts": len(contacts),
                "total_deals": len(deals),
                "open_deals": open_deals,
                "total_deal_value": total_deal_value,
                "recent_chat_mentions": len(recent_mentions),
            },
            "contacts": contacts,
            "deals": deals,
            "recent_chat_mentions": recent_mentions,
        },
    )


async def _deal_360(entity_id: str, search_name: str) -> ToolResult:
    """Full 360° view for a CRM deal."""
    async with async_session() as session:
        deal: CRMDeal | None = None
        if entity_id:
            deal = await session.get(CRMDeal, entity_id)
        if not deal and search_name:
            stmt = (
                select(CRMDeal)
                .where(col(CRMDeal.title).ilike(f"%{search_name}%"))
                .order_by(CRMDeal.updated_at.desc())
                .limit(1)
            )
            result = await session.execute(stmt)
            deal = result.scalar_one_or_none()

        if not deal:
            return ToolResult(success=False, output=None, error=f"Deal not found: {entity_id or search_name}")

        profile = {
            "id": deal.id,
            "title": deal.title,
            "stage": deal.stage,
            "value": deal.value,
            "currency": deal.currency,
            "probability": deal.probability,
            "status": deal.status,
            "deal_health": deal.deal_health,
            "loss_reason": deal.loss_reason,
            "expected_close_date": _safe_iso(deal.expected_close_date),
            "actual_close_date": _safe_iso(deal.actual_close_date),
            "stage_entered_at": _safe_iso(deal.stage_entered_at),
            "owner_id": deal.owner_id,
            "created_at": _safe_iso(deal.created_at),
        }

        # Contact info
        contact_info = None
        if deal.contact_id:
            contact = await session.get(CRMContact, deal.contact_id)
            if contact:
                contact_info = {
                    "id": contact.id,
                    "name": contact.name,
                    "email": contact.email,
                    "phone": contact.phone,
                    "company": contact.company,
                    "title": contact.title,
                    "lead_score": contact.lead_score,
                }

        # Company info
        company_info = None
        if deal.company_id:
            company = await session.get(CRMCompany, deal.company_id)
            if company:
                company_info = {
                    "id": company.id,
                    "name": company.name,
                    "industry": company.industry,
                    "website": company.website,
                }

        # Emails linked to this deal
        email_stmt = (
            select(CRMEmail)
            .where(CRMEmail.deal_id == deal.id)
            .order_by(CRMEmail.created_at.desc())
            .limit(5)
        )
        email_rows = (await session.execute(email_stmt)).scalars().all()
        emails = [
            {
                "direction": e.direction,
                "subject": e.subject,
                "status": e.status,
                "from_address": e.from_address,
                "sent_at": _safe_iso(e.sent_at),
            }
            for e in email_rows
        ]

        # Notes linked to this deal
        note_stmt = (
            select(CRMNote)
            .where(CRMNote.deal_id == deal.id)
            .order_by(CRMNote.created_at.desc())
            .limit(5)
        )
        note_rows = (await session.execute(note_stmt)).scalars().all()
        notes = [
            {
                "content": (n.content or "")[:300],
                "is_pinned": n.is_pinned,
                "created_at": _safe_iso(n.created_at),
            }
            for n in note_rows
        ]

        # Activities for the contact (related to this deal context)
        activities: list[dict] = []
        if deal.contact_id:
            act_stmt = (
                select(CRMActivity)
                .where(CRMActivity.contact_id == deal.contact_id)
                .order_by(CRMActivity.created_at.desc())
                .limit(10)
            )
            act_rows = (await session.execute(act_stmt)).scalars().all()
            activities = [
                {
                    "type": a.type,
                    "title": a.title,
                    "content": (a.content or "")[:200],
                    "created_at": _safe_iso(a.created_at),
                }
                for a in act_rows
            ]

        # Chat mentions of this deal
        msg_stmt = (
            select(Message)
            .where(col(Message.content).ilike(f"%{deal.title}%"))
            .order_by(Message.created_at.desc())
            .limit(5)
        )
        msg_rows = (await session.execute(msg_stmt)).scalars().all()
        recent_mentions = [
            {
                "channel_id": m.channel_id,
                "sender_id": m.sender_id,
                "content": (m.content or "")[:200],
                "created_at": _safe_iso(m.created_at),
            }
            for m in msg_rows
        ]

    return ToolResult(
        success=True,
        output={
            "entity_type": "deal",
            "profile": profile,
            "contact": contact_info,
            "company": company_info,
            "summary": {
                "total_emails": len(emails),
                "total_notes": len(notes),
                "total_activities": len(activities),
                "recent_chat_mentions": len(recent_mentions),
            },
            "emails": emails,
            "notes": notes,
            "activities": activities,
            "recent_chat_mentions": recent_mentions,
        },
    )


# ---------------------------------------------------------------------------
# Tool: relationship_map — "How are these people/companies connected?"
# ---------------------------------------------------------------------------

async def relationship_map(inp: dict, ctx: ToolContext) -> ToolResult:
    """Map relationships between a contact and their connected entities.

    Returns contacts at the same company, shared deals, and interaction patterns.
    """
    contact_id = inp.get("contact_id", "")
    if not contact_id:
        return ToolResult(success=False, output=None, error="contact_id is required")

    async with async_session() as session:
        contact = await session.get(CRMContact, contact_id)
        if not contact:
            return ToolResult(success=False, output=None, error=f"Contact {contact_id} not found")

        # Find colleagues (same company)
        colleagues: list[dict] = []
        if contact.company_id:
            col_stmt = (
                select(CRMContact)
                .where(
                    CRMContact.company_id == contact.company_id,
                    CRMContact.id != contact.id,
                    CRMContact.is_archived == False,  # noqa: E712
                )
                .limit(10)
            )
            col_rows = (await session.execute(col_stmt)).scalars().all()
            colleagues = [
                {"id": c.id, "name": c.name, "title": c.title, "email": c.email}
                for c in col_rows
            ]

        # Shared deals — find deals where this contact is involved
        deal_stmt = (
            select(CRMDeal)
            .where(CRMDeal.contact_id == contact.id)
            .order_by(CRMDeal.updated_at.desc())
            .limit(10)
        )
        deal_rows = (await session.execute(deal_stmt)).scalars().all()
        deals = [
            {
                "id": d.id,
                "title": d.title,
                "stage": d.stage,
                "value": d.value,
                "status": d.status,
            }
            for d in deal_rows
        ]

        # Interaction frequency — count activities by type
        act_stmt = (
            select(CRMActivity.type)
            .where(CRMActivity.contact_id == contact.id)
        )
        act_rows = (await session.execute(act_stmt)).scalars().all()
        interaction_counts: dict[str, int] = {}
        for act_type in act_rows:
            interaction_counts[act_type] = interaction_counts.get(act_type, 0) + 1

    return ToolResult(
        success=True,
        output={
            "contact": {
                "id": contact.id,
                "name": contact.name,
                "company": contact.company,
                "title": contact.title,
            },
            "colleagues": colleagues,
            "deals": deals,
            "interaction_frequency": interaction_counts,
            "total_interactions": sum(interaction_counts.values()),
            "relationship_strength": contact.relationship_strength,
            "sentiment_score": contact.sentiment_score,
        },
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    registry.register_builtin(ToolDefinition(
        name="entity_360_view",
        display_name="Entity 360° View",
        description=(
            "Get a comprehensive 360° view of any entity — contact, company, or deal. "
            "Aggregates all related data: profile, deals, activities, emails, notes, "
            "tasks, and recent chat mentions into a single unified response. "
            "Use this when someone asks 'tell me everything about X' or needs a "
            "full picture of a contact, company, or deal."
        ),
        category="intelligence",
        input_schema={
            "type": "object",
            "properties": {
                "entity_type": {
                    "type": "string",
                    "enum": ["contact", "company", "deal"],
                    "description": "Type of entity to look up",
                },
                "entity_id": {
                    "type": "string",
                    "description": "The entity's UUID (if known)",
                },
                "search_name": {
                    "type": "string",
                    "description": "Name to search for (if entity_id is unknown)",
                },
            },
            "required": ["entity_type"],
        },
        handler=entity_360_view,
    ))

    registry.register_builtin(ToolDefinition(
        name="relationship_map",
        display_name="Relationship Map",
        description=(
            "Map relationships around a contact — find colleagues at the same company, "
            "shared deals, and interaction patterns. Use when someone asks 'how is this "
            "person connected?' or 'who else do we know at this company?'"
        ),
        category="intelligence",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {
                    "type": "string",
                    "description": "The CRM contact ID to map relationships for",
                },
            },
            "required": ["contact_id"],
        },
        handler=relationship_map,
    ))
