"""CRM built-in tools — contacts, deals, companies, activities, notes."""

from __future__ import annotations

import json
import uuid
from datetime import datetime

from sqlmodel import select, or_, col

from app.core.db import async_session
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.crm_company import CRMCompany
from app.models.crm_note import CRMNote
from app.models.crm_pipeline import CRMPipeline
from app.services.tools.registry import ToolDefinition, ToolResult, ToolContext, ToolRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _contact_to_dict(c: CRMContact) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "company": c.company,
        "title": c.title,
        "stage": c.stage,
        "lifecycle_stage": c.lifecycle_stage,
        "value": c.value,
        "owner_id": c.owner_id,
        "lead_score": c.lead_score,
        "last_contacted_at": c.last_contacted_at.isoformat() if c.last_contacted_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _deal_to_dict(d: CRMDeal) -> dict:
    return {
        "id": d.id,
        "title": d.title,
        "contact_id": d.contact_id,
        "company_id": d.company_id,
        "pipeline_id": d.pipeline_id,
        "stage": d.stage,
        "value": d.value,
        "probability": d.probability,
        "status": d.status,
        "deal_health": d.deal_health,
        "expected_close_date": d.expected_close_date.isoformat() if d.expected_close_date else None,
        "owner_id": d.owner_id,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


def _company_to_dict(co: CRMCompany) -> dict:
    return {
        "id": co.id,
        "name": co.name,
        "domain": co.domain,
        "industry": co.industry,
        "size": co.size,
        "website": co.website,
        "annual_revenue": co.annual_revenue,
        "employee_count": co.employee_count,
    }


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def crm_search_contacts(inp: dict, ctx: ToolContext) -> ToolResult:
    """Hybrid semantic + keyword search for CRM contacts."""
    query = inp.get("query", "")
    limit = min(inp.get("limit", 10), 25)

    contacts: list[dict] = []
    seen_ids: set[str] = set()

    # 1. Semantic vector search (understands meaning beyond exact keywords)
    if query.strip():
        try:
            from app.services.embedding_service import vector_search_crm_contacts

            vec_results = await vector_search_crm_contacts(query, limit=limit)
            for r in vec_results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    contacts.append({
                        "id": r["id"],
                        "name": r["name"],
                        "email": r["email"],
                        "company": r["company"],
                        "title": r["title"],
                        "stage": r["stage"],
                        "similarity": r.get("similarity"),
                    })
        except Exception:
            pass  # Fall through to keyword search

    # 2. Keyword fallback — catches exact matches that embeddings may miss
    remaining = max(0, limit - len(contacts))
    if remaining > 0 and query.strip():
        async with async_session() as session:
            stmt = (
                select(CRMContact)
                .where(
                    CRMContact.is_archived == False,  # noqa: E712
                    or_(
                        col(CRMContact.name).ilike(f"%{query}%"),
                        col(CRMContact.email).ilike(f"%{query}%"),
                        col(CRMContact.company).ilike(f"%{query}%"),
                    ),
                )
                .order_by(CRMContact.updated_at.desc())
                .limit(remaining + len(seen_ids))
            )
            results = await session.execute(stmt)
            for c in results.scalars().all():
                if c.id not in seen_ids:
                    seen_ids.add(c.id)
                    contacts.append(_contact_to_dict(c))
    elif not query.strip():
        # No query — list all contacts (sorted by recent)
        async with async_session() as session:
            stmt = (
                select(CRMContact)
                .where(CRMContact.is_archived == False)  # noqa: E712
                .order_by(CRMContact.updated_at.desc())
                .limit(limit)
            )
            results = await session.execute(stmt)
            contacts = [_contact_to_dict(c) for c in results.scalars().all()]

    return ToolResult(success=True, output={"contacts": contacts[:limit], "count": len(contacts)})


async def crm_get_contact(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get a single CRM contact by ID."""
    contact_id = inp.get("contact_id", "")
    if not contact_id:
        return ToolResult(success=False, output=None, error="contact_id is required")

    async with async_session() as session:
        contact = await session.get(CRMContact, contact_id)
        if not contact:
            return ToolResult(success=False, output=None, error=f"Contact {contact_id} not found")
        return ToolResult(success=True, output=_contact_to_dict(contact))


async def crm_create_contact(inp: dict, ctx: ToolContext) -> ToolResult:
    """Create a new CRM contact."""
    name = inp.get("name")
    if not name:
        return ToolResult(success=False, output=None, error="name is required")

    contact = CRMContact(
        id=str(uuid.uuid4()),
        name=name,
        email=inp.get("email"),
        phone=inp.get("phone"),
        company=inp.get("company"),
        title=inp.get("title"),
        stage=inp.get("stage", "lead"),
        owner_id=ctx.user_id,
        created_by=ctx.agent_id,
        created_by_type="agent",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(contact)
        await session.commit()
        await session.refresh(contact)

    # Embed contact in background for semantic search
    from app.services.embedding_service import embed_crm_contact_background
    embed_crm_contact_background(contact.id)

    return ToolResult(success=True, output=_contact_to_dict(contact))


async def crm_update_contact(inp: dict, ctx: ToolContext) -> ToolResult:
    """Update fields on an existing CRM contact."""
    contact_id = inp.get("contact_id", "")
    if not contact_id:
        return ToolResult(success=False, output=None, error="contact_id is required")

    allowed_fields = {"name", "email", "phone", "company", "title", "stage", "lifecycle_stage", "value", "notes"}
    updates = {k: v for k, v in inp.items() if k in allowed_fields and v is not None}
    if not updates:
        return ToolResult(success=False, output=None, error="No valid fields to update")

    async with async_session() as session:
        contact = await session.get(CRMContact, contact_id)
        if not contact:
            return ToolResult(success=False, output=None, error=f"Contact {contact_id} not found")
        for k, v in updates.items():
            setattr(contact, k, v)
        contact.updated_at = datetime.utcnow()
        session.add(contact)
        await session.commit()
        await session.refresh(contact)

        # Re-embed contact after update
        from app.services.embedding_service import embed_crm_contact_background
        embed_crm_contact_background(contact.id)

        return ToolResult(success=True, output=_contact_to_dict(contact))


async def crm_list_deals(inp: dict, ctx: ToolContext) -> ToolResult:
    """List CRM deals with optional filters."""
    limit = min(inp.get("limit", 10), 25)
    status_filter = inp.get("status")
    contact_id = inp.get("contact_id")

    async with async_session() as session:
        stmt = select(CRMDeal).order_by(CRMDeal.updated_at.desc()).limit(limit)
        if status_filter:
            stmt = stmt.where(CRMDeal.status == status_filter)
        if contact_id:
            stmt = stmt.where(CRMDeal.contact_id == contact_id)
        results = await session.execute(stmt)
        deals = [_deal_to_dict(d) for d in results.scalars().all()]

    return ToolResult(success=True, output={"deals": deals, "count": len(deals)})


async def crm_create_deal(inp: dict, ctx: ToolContext) -> ToolResult:
    """Create a new CRM deal."""
    title = inp.get("title")
    contact_id = inp.get("contact_id")
    pipeline_id = inp.get("pipeline_id")
    if not title or not contact_id or not pipeline_id:
        return ToolResult(success=False, output=None, error="title, contact_id, and pipeline_id are required")

    deal = CRMDeal(
        id=str(uuid.uuid4()),
        title=title,
        contact_id=contact_id,
        pipeline_id=pipeline_id,
        company_id=inp.get("company_id"),
        stage=inp.get("stage", "new"),
        value=inp.get("value"),
        status="open",
        owner_id=ctx.user_id,
        created_by=ctx.agent_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(deal)
        await session.commit()
        await session.refresh(deal)

    return ToolResult(success=True, output=_deal_to_dict(deal))


async def crm_update_deal_stage(inp: dict, ctx: ToolContext) -> ToolResult:
    """Update the stage of an existing CRM deal."""
    deal_id = inp.get("deal_id", "")
    new_stage = inp.get("stage", "")
    if not deal_id or not new_stage:
        return ToolResult(success=False, output=None, error="deal_id and stage are required")

    async with async_session() as session:
        deal = await session.get(CRMDeal, deal_id)
        if not deal:
            return ToolResult(success=False, output=None, error=f"Deal {deal_id} not found")

        was_open = deal.status != "won"
        deal.stage = new_stage
        deal.stage_entered_at = datetime.utcnow()
        deal.updated_at = datetime.utcnow()

        # If stage indicates a win, mark deal as won and celebrate
        if new_stage.lower() in ("won", "closed_won") and was_open:
            deal.status = "won"
            deal.probability = 100
            deal.actual_close_date = datetime.utcnow()

        session.add(deal)
        await session.commit()
        await session.refresh(deal)

        # Post celebration if deal was just won
        if new_stage.lower() in ("won", "closed_won") and was_open:
            from app.core.shared_infra import get_background, get_event_bus
            from app.services.crm_deal_service import DealService
            svc = DealService(session, get_event_bus(), get_background())
            await svc._post_deal_celebration(deal, ctx.user_id or "system")

        return ToolResult(success=True, output=_deal_to_dict(deal))


async def crm_search_companies(inp: dict, ctx: ToolContext) -> ToolResult:
    """Hybrid semantic + keyword search for CRM companies."""
    query = inp.get("query", "")
    limit = min(inp.get("limit", 10), 25)

    companies: list[dict] = []
    seen_ids: set[str] = set()

    # 1. Semantic vector search
    if query.strip():
        try:
            from app.services.embedding_service import vector_search_crm_companies

            vec_results = await vector_search_crm_companies(query, limit=limit)
            for r in vec_results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    companies.append({
                        "id": r["id"],
                        "name": r["name"],
                        "domain": r["domain"],
                        "industry": r["industry"],
                        "description": r.get("description"),
                        "similarity": r.get("similarity"),
                    })
        except Exception:
            pass  # Fall through to keyword search

    # 2. Keyword fallback
    remaining = max(0, limit - len(companies))
    if remaining > 0 and query.strip():
        async with async_session() as session:
            stmt = (
                select(CRMCompany)
                .where(
                    CRMCompany.is_archived == False,  # noqa: E712
                    or_(
                        col(CRMCompany.name).ilike(f"%{query}%"),
                        col(CRMCompany.domain).ilike(f"%{query}%"),
                        col(CRMCompany.industry).ilike(f"%{query}%"),
                    ),
                )
                .order_by(CRMCompany.updated_at.desc())
                .limit(remaining + len(seen_ids))
            )
            results = await session.execute(stmt)
            for co in results.scalars().all():
                if co.id not in seen_ids:
                    seen_ids.add(co.id)
                    companies.append(_company_to_dict(co))
    elif not query.strip():
        async with async_session() as session:
            stmt = (
                select(CRMCompany)
                .where(CRMCompany.is_archived == False)  # noqa: E712
                .order_by(CRMCompany.updated_at.desc())
                .limit(limit)
            )
            results = await session.execute(stmt)
            companies = [_company_to_dict(co) for co in results.scalars().all()]

    return ToolResult(success=True, output={"companies": companies[:limit], "count": len(companies)})


async def crm_log_activity(inp: dict, ctx: ToolContext) -> ToolResult:
    """Log an activity against a CRM contact."""
    contact_id = inp.get("contact_id")
    activity_type = inp.get("type")
    if not contact_id or not activity_type:
        return ToolResult(success=False, output=None, error="contact_id and type are required")

    activity = CRMActivity(
        id=str(uuid.uuid4()),
        contact_id=contact_id,
        type=activity_type,
        title=inp.get("title"),
        content=inp.get("content"),
        performed_by=ctx.agent_id,
        performer_type="agent",
        created_at=datetime.utcnow(),
    )

    async with async_session() as session:
        session.add(activity)
        # Update contact's last_activity_at
        contact = await session.get(CRMContact, contact_id)
        if contact:
            contact.last_activity_at = datetime.utcnow()
            contact.activity_count += 1
            session.add(contact)
        await session.commit()

    return ToolResult(
        success=True,
        output={"activity_id": activity.id, "type": activity_type, "contact_id": contact_id},
    )


async def crm_get_pipeline(inp: dict, ctx: ToolContext) -> ToolResult:
    """Get a CRM pipeline's stages."""
    pipeline_id = inp.get("pipeline_id")

    async with async_session() as session:
        if pipeline_id:
            pipeline = await session.get(CRMPipeline, pipeline_id)
            if not pipeline:
                return ToolResult(success=False, output=None, error=f"Pipeline {pipeline_id} not found")
            return ToolResult(success=True, output={
                "id": pipeline.id,
                "name": pipeline.name,
                "stages": json.loads(pipeline.stages) if pipeline.stages else [],
            })
        # List all pipelines
        stmt = select(CRMPipeline).order_by(CRMPipeline.created_at)
        results = await session.execute(stmt)
        pipelines = [
            {"id": p.id, "name": p.name, "is_default": p.is_default}
            for p in results.scalars().all()
        ]
        return ToolResult(success=True, output={"pipelines": pipelines})


async def crm_count_contacts(inp: dict, ctx: ToolContext) -> ToolResult:
    """Count CRM contacts with optional filters."""
    from sqlalchemy import func as sa_func

    stage_filter = inp.get("stage")
    company_filter = inp.get("company")

    async with async_session() as session:
        base_where = [CRMContact.is_archived == False]  # noqa: E712
        if stage_filter:
            base_where.append(CRMContact.stage == stage_filter)
        if company_filter:
            base_where.append(col(CRMContact.company).ilike(f"%{company_filter}%"))

        total_stmt = select(sa_func.count()).select_from(CRMContact).where(*base_where)
        total = (await session.execute(total_stmt)).scalar() or 0

        breakdown: dict[str, int] = {}
        if not stage_filter and not company_filter:
            breakdown_stmt = (
                select(CRMContact.stage, sa_func.count())
                .select_from(CRMContact)
                .where(CRMContact.is_archived == False)  # noqa: E712
                .group_by(CRMContact.stage)
            )
            rows = (await session.execute(breakdown_stmt)).all()
            breakdown = {row[0] or "unknown": row[1] for row in rows}

    return ToolResult(
        success=True,
        output={
            "total_contacts": total,
            "breakdown_by_stage": breakdown,
            "filters_applied": {k: v for k, v in inp.items() if v},
        },
    )


async def crm_add_note(inp: dict, ctx: ToolContext) -> ToolResult:
    """Add a text note to a CRM contact."""
    contact_id = inp.get("contact_id", "")
    content = inp.get("content", "")
    if not contact_id or not content:
        return ToolResult(success=False, output=None, error="contact_id and content are required")

    async with async_session() as session:
        contact = await session.get(CRMContact, contact_id)
        if not contact:
            return ToolResult(success=False, output=None, error=f"Contact {contact_id} not found")

        contact_name = contact.name  # capture before session closes

        note = CRMNote(
            id=str(uuid.uuid4()),
            contact_id=contact_id,
            content=content,
            created_by=ctx.user_id,
            created_at=datetime.utcnow(),
        )
        session.add(note)
        await session.commit()
        await session.refresh(note)
        note_id = note.id  # capture after refresh

    # Embed note in background (async — non-blocking)
    from app.services.embedding_service import embed_crm_note_background
    embed_crm_note_background(note_id)

    return ToolResult(
        success=True,
        output={
            "note_id": note_id,
            "contact_id": contact_id,
            "contact_name": contact_name,
            "content": content[:200],
        },
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(registry: ToolRegistry) -> None:
    """Register all CRM tools."""

    registry.register_builtin(ToolDefinition(
        name="crm_search_contacts",
        display_name="Search CRM Contacts",
        description=(
            "Search CRM contacts by name, email, phone, or company. "
            "Omit query to list all contacts. Use when user asks to find, list, look up, or show contacts."
        ),
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search term — matches name, email, or company. Omit to list all."},
                "limit": {"type": "integer", "description": "Max results (default 10, max 25)", "default": 10},
            },
        },
        handler=crm_search_contacts,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_get_contact",
        display_name="Get CRM Contact",
        description="Get full details for a single CRM contact by their UUID. Use when you already have a contact_id from a previous search.",
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "UUID of the contact"},
            },
            "required": ["contact_id"],
        },
        handler=crm_get_contact,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_create_contact",
        display_name="Create CRM Contact",
        description="Create a new CRM contact. Only name is required — extract name, email, phone, company from the user's message. Parse comma-separated, labeled, or prose formats.",
        category="crm",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Full name of the contact"},
                "email": {"type": "string", "description": "Email address"},
                "phone": {"type": "string", "description": "Phone number"},
                "company": {"type": "string", "description": "Company name"},
                "title": {"type": "string", "description": "Job title"},
                "stage": {"type": "string", "description": "Pipeline stage (default: lead)", "enum": ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]},
            },
            "required": ["name"],
        },
        handler=crm_create_contact,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_update_contact",
        display_name="Update CRM Contact",
        description="Update fields on an existing CRM contact. Provide contact_id and any fields to change. Use after searching to find the right contact.",
        category="crm",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "UUID of the contact to update"},
                "name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "company": {"type": "string"},
                "title": {"type": "string"},
                "stage": {"type": "string"},
                "lifecycle_stage": {"type": "string"},
                "value": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["contact_id"],
        },
        handler=crm_update_contact,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_list_deals",
        display_name="List CRM Deals",
        description="List deals in the CRM pipeline. Filter by status (open/won/lost) or contact_id. Use when user asks about deals, pipeline, revenue, or opportunities.",
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by status", "enum": ["open", "won", "lost"]},
                "contact_id": {"type": "string", "description": "Filter by contact UUID"},
                "limit": {"type": "integer", "description": "Max results (default 10, max 25)", "default": 10},
            },
        },
        handler=crm_list_deals,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_create_deal",
        display_name="Create CRM Deal",
        description="Create a new CRM deal. Requires title, contact_id, and pipeline_id. Use when user wants to track a new opportunity.",
        category="crm",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Deal title"},
                "contact_id": {"type": "string", "description": "UUID of the associated contact"},
                "pipeline_id": {"type": "string", "description": "UUID of the pipeline"},
                "company_id": {"type": "string", "description": "UUID of the associated company"},
                "stage": {"type": "string", "description": "Initial stage (default: new)"},
                "value": {"type": "number", "description": "Deal value in default currency"},
            },
            "required": ["title", "contact_id", "pipeline_id"],
        },
        handler=crm_create_deal,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_update_deal_stage",
        display_name="Update Deal Stage",
        description="Move a CRM deal to a new pipeline stage. Use when user wants to advance or change a deal's status.",
        category="crm",
        requires_confirmation=True,
        input_schema={
            "type": "object",
            "properties": {
                "deal_id": {"type": "string", "description": "UUID of the deal"},
                "stage": {"type": "string", "description": "New stage name"},
            },
            "required": ["deal_id", "stage"],
        },
        handler=crm_update_deal_stage,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_search_companies",
        display_name="Search CRM Companies",
        description="Search companies in the CRM by name, domain, or industry. Omit query to list all companies.",
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search term — matches name, domain, or industry. Omit to list all."},
                "limit": {"type": "integer", "description": "Max results", "default": 10},
            },
        },
        handler=crm_search_companies,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_log_activity",
        display_name="Log CRM Activity",
        description="Log a sales activity (call, email, meeting, note, task) against a CRM contact. Use to record interactions.",
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "UUID of the contact"},
                "type": {"type": "string", "description": "Activity type", "enum": ["call", "email", "meeting", "note", "task"]},
                "title": {"type": "string", "description": "Activity title/subject"},
                "content": {"type": "string", "description": "Activity details or notes"},
            },
            "required": ["contact_id", "type"],
        },
        handler=crm_log_activity,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_get_pipeline",
        display_name="Get CRM Pipeline",
        description="Get a pipeline's stages by ID, or list all pipelines if no ID given. Use when user asks about deal stages or pipeline structure.",
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string", "description": "UUID of the pipeline (omit to list all)"},
            },
        },
        handler=crm_get_pipeline,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_count_contacts",
        display_name="Count CRM Contacts",
        description=(
            "Count total CRM contacts, optionally filtered by stage or company. "
            "Returns total and per-stage breakdown. Use when user asks 'how many' contacts, leads, or entries."
        ),
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "stage": {
                    "type": "string",
                    "description": "Filter by pipeline stage",
                    "enum": ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
                },
                "company": {"type": "string", "description": "Filter by company name (partial match)"},
            },
        },
        handler=crm_count_contacts,
    ))

    registry.register_builtin(ToolDefinition(
        name="crm_add_note",
        display_name="Add CRM Note",
        description=(
            "Add a text note to a CRM contact's record. "
            "Use when user wants to record information, observations, or follow-up notes about a contact."
        ),
        category="crm",
        input_schema={
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "UUID of the contact"},
                "content": {"type": "string", "description": "Note text content"},
            },
            "required": ["contact_id", "content"],
        },
        handler=crm_add_note,
    ))
