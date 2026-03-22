"""AI Copilot service — LLM-powered CRM agent with tool-use.

Uses stream_with_tools() for real agentic behavior: the LLM can
search contacts, query deals, create records, and more — all through
function-calling, not regex pattern-matching.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, func

from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.crm_company import CRMCompany
from app.services.base import BaseService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CopilotResponse:
    type: str  # answer / action / insight / clarification
    message: str
    data: dict[str, Any] | None


# ─── CRM Tool Schemas (Claude format) ────────────────────────────────────

CRM_TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_contacts",
        "description": (
            "Search CRM contacts by name, email, company, stage, or tags. "
            "Returns up to 10 matches with key fields."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term — name, email, or company",
                },
                "stage": {
                    "type": "string",
                    "description": "Filter by stage: lead/qualified/proposal/negotiation/won/lost",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results (default 10)",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_contact_details",
        "description": (
            "Get full details for a contact by ID, including company, "
            "deals, recent activities, and upcoming events."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The contact ID"},
            },
            "required": ["contact_id"],
        },
    },
    {
        "name": "search_deals",
        "description": "Search deals by title, stage, status, or contact name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term for deal title or contact name",
                },
                "stage": {"type": "string", "description": "Filter by stage"},
                "status": {
                    "type": "string",
                    "enum": ["open", "won", "lost"],
                    "description": "Filter by status",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_pipeline_summary",
        "description": (
            "Get pipeline overview: deal counts per stage, total values, "
            "at-risk deals."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "search_companies",
        "description": "Search companies by name or industry.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Company name or industry to search",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_company_details",
        "description": "Get company details with associated contacts and deals.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_id": {"type": "string", "description": "The company ID"},
            },
            "required": ["company_id"],
        },
    },
    {
        "name": "create_contact",
        "description": (
            "Create a new CRM contact. Also auto-creates company record "
            "and pipeline deal when company name is provided."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Full name"},
                "email": {"type": "string", "description": "Email address"},
                "phone": {"type": "string", "description": "Phone number"},
                "company": {"type": "string", "description": "Company name"},
                "title": {"type": "string", "description": "Job title"},
                "stage": {"type": "string", "description": "Pipeline stage (default: lead)"},
                "notes": {"type": "string", "description": "Notes about the contact"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "update_contact",
        "description": "Update fields on an existing contact.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string", "description": "The contact ID"},
                "fields": {
                    "type": "object",
                    "description": (
                        "Key-value pairs to update (e.g. stage, company, "
                        "phone, email, title, notes)"
                    ),
                },
            },
            "required": ["contact_id", "fields"],
        },
    },
    {
        "name": "move_deal_stage",
        "description": "Move a deal to a new pipeline stage.",
        "input_schema": {
            "type": "object",
            "properties": {
                "deal_id": {"type": "string", "description": "The deal ID"},
                "new_stage": {
                    "type": "string",
                    "description": "Target stage to move the deal to",
                },
            },
            "required": ["deal_id", "new_stage"],
        },
    },
    {
        "name": "get_analytics_summary",
        "description": (
            "Get CRM analytics: conversion rates, revenue metrics, "
            "contact/deal counts by stage."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


# ─── Agent System Prompt ─────────────────────────────────────────────────

_AGENT_SYSTEM = """\
You are an AI CRM copilot for SquareUp — a sales intelligence assistant \
with full access to the CRM database.

You can search, read, create, and update contacts, companies, and deals. \
Use your tools to answer ANY question about the CRM data.

CAPABILITIES:
- Look up any contact's details (name, email, phone, company, stage, score)
- Search contacts, companies, and deals by any criteria
- Get pipeline summaries and analytics
- Create new contacts (auto-creates company + deal)
- Update contact fields and move deals between stages
- Provide sales insights and recommendations

BEHAVIOR:
- ALWAYS use tools to look up data before answering — never guess
- If a user mentions a person's name, search for them first
- Give concise, specific answers with real data from the CRM
- Use markdown formatting (bold, lists, etc.) for readability
- If multiple contacts match, list them and ask which one
- For write operations, confirm what you did
- If asked about a specific field (stage, company, email, phone), \
search the contact first and return just that field clearly
- Never say "I don't have access" — you DO have access via tools

CURRENT CRM SUMMARY:
{context}
"""


# ─── Copilot Service ─────────────────────────────────────────────────────


class CopilotService(BaseService):
    """LLM-powered CRM copilot with tool-use agentic loop."""

    _MAX_ITERATIONS = 5

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._user_id: str | None = None
        self._tool_handlers: dict[str, Any] = {
            "search_contacts": self._tool_search_contacts,
            "get_contact_details": self._tool_get_contact_details,
            "search_deals": self._tool_search_deals,
            "get_pipeline_summary": self._tool_get_pipeline_summary,
            "search_companies": self._tool_search_companies,
            "get_company_details": self._tool_get_company_details,
            "create_contact": self._tool_create_contact,
            "update_contact": self._tool_update_contact,
            "move_deal_stage": self._tool_move_deal_stage,
            "get_analytics_summary": self._tool_get_analytics_summary,
        }

    # ── Context builder ───────────────────────────────────────────────

    async def _build_context(self) -> str:
        """Build compact CRM summary for the system prompt."""
        try:
            hot_stmt = (
                select(CRMContact)
                .where(
                    CRMContact.is_archived == False,  # noqa: E712
                    CRMContact.lead_score >= 70,
                )
                .order_by(CRMContact.lead_score.desc())
                .limit(5)
            )
            hot_result = await self.session.execute(hot_stmt)
            hot_leads = hot_result.scalars().all()

            deal_result = await self.session.execute(
                select(CRMDeal).where(CRMDeal.status == "open")
            )
            deals = deal_result.scalars().all()

            contact_count = await self.session.execute(
                select(func.count(CRMContact.id)).where(
                    CRMContact.is_archived == False  # noqa: E712
                )
            )
            total_contacts = contact_count.scalar() or 0

            total_value = sum(d.value or 0 for d in deals)
            at_risk = [d for d in deals if d.deal_health in ("yellow", "red")]

            hot_text = "\n".join(
                f"  - {c.name} (score={c.lead_score}, stage={c.stage})"
                for c in hot_leads
            ) or "  None"

            return (
                f"Total contacts: {total_contacts}\n"
                f"Hot leads (score 70+):\n{hot_text}\n"
                f"Open deals: {len(deals)} worth ${total_value:,.0f}\n"
                f"At-risk deals: {len(at_risk)}"
            )
        except Exception:
            logger.warning("Failed to build CRM context", exc_info=True)
            return "CRM context unavailable"

    # ── Tool handlers ─────────────────────────────────────────────────

    async def _tool_search_contacts(self, params: dict) -> dict:
        query = params.get("query", "")
        stage_filter = params.get("stage")
        limit = min(params.get("limit", 10), 20)

        stmt = select(CRMContact).where(
            CRMContact.is_archived == False  # noqa: E712
        )
        if query:
            like = f"%{query}%"
            stmt = stmt.where(
                CRMContact.name.ilike(like)
                | CRMContact.email.ilike(like)
                | CRMContact.company.ilike(like)
            )
        if stage_filter:
            stmt = stmt.where(CRMContact.stage == stage_filter)

        stmt = stmt.order_by(
            CRMContact.lead_score.desc().nullslast()
        ).limit(limit)

        result = await self.session.execute(stmt)
        contacts = result.scalars().all()
        return {
            "count": len(contacts),
            "contacts": [
                {
                    "id": c.id,
                    "name": c.name,
                    "email": c.email,
                    "phone": c.phone,
                    "company": c.company,
                    "title": c.title,
                    "stage": c.stage,
                    "lead_score": c.lead_score,
                    "source": c.source,
                }
                for c in contacts
            ],
        }

    async def _tool_get_contact_details(self, params: dict) -> dict:
        contact_id = params["contact_id"]
        contact = await self.session.get(CRMContact, contact_id)
        if not contact:
            return {"error": f"Contact {contact_id} not found"}

        deal_result = await self.session.execute(
            select(CRMDeal).where(CRMDeal.contact_id == contact_id).limit(10)
        )
        deals = deal_result.scalars().all()

        activity_result = await self.session.execute(
            select(CRMActivity)
            .where(CRMActivity.contact_id == contact_id)
            .order_by(CRMActivity.created_at.desc())
            .limit(5)
        )
        activities = activity_result.scalars().all()

        company_data = None
        if contact.company_id:
            company = await self.session.get(CRMCompany, contact.company_id)
            if company:
                company_data = {
                    "id": company.id,
                    "name": company.name,
                    "industry": company.industry,
                }

        return {
            "contact": {
                "id": contact.id,
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone,
                "company": contact.company,
                "company_id": contact.company_id,
                "title": contact.title,
                "stage": contact.stage,
                "lead_score": contact.lead_score,
                "source": contact.source,
                "notes": contact.notes,
                "created_at": str(contact.created_at),
            },
            "company": company_data,
            "deals": [
                {
                    "id": d.id,
                    "title": d.title,
                    "stage": d.stage,
                    "value": d.value,
                    "status": d.status,
                }
                for d in deals
            ],
            "recent_activities": [
                {
                    "id": a.id,
                    "type": a.type,
                    "title": a.title,
                    "created_at": str(a.created_at),
                }
                for a in activities
            ],
        }

    async def _tool_search_deals(self, params: dict) -> dict:
        query = params.get("query", "")
        stage_filter = params.get("stage")
        status_filter = params.get("status")

        stmt = select(CRMDeal)
        if query:
            stmt = stmt.where(CRMDeal.title.ilike(f"%{query}%"))
        if stage_filter:
            stmt = stmt.where(CRMDeal.stage == stage_filter)
        if status_filter:
            stmt = stmt.where(CRMDeal.status == status_filter)

        stmt = stmt.order_by(CRMDeal.created_at.desc()).limit(20)
        result = await self.session.execute(stmt)
        deals = result.scalars().all()

        return {
            "count": len(deals),
            "deals": [
                {
                    "id": d.id,
                    "title": d.title,
                    "stage": d.stage,
                    "value": d.value,
                    "status": d.status,
                    "deal_health": d.deal_health,
                    "contact_id": d.contact_id,
                    "company_id": d.company_id,
                }
                for d in deals
            ],
        }

    async def _tool_get_pipeline_summary(self, _params: dict) -> dict:
        result = await self.session.execute(
            select(CRMDeal).where(CRMDeal.status == "open")
        )
        deals = result.scalars().all()

        by_stage: dict[str, list[CRMDeal]] = {}
        for d in deals:
            by_stage.setdefault(d.stage or "unknown", []).append(d)

        stages = {}
        for stage, stage_deals in sorted(by_stage.items()):
            stages[stage] = {
                "count": len(stage_deals),
                "total_value": sum(d.value or 0 for d in stage_deals),
            }

        at_risk = [
            {
                "id": d.id,
                "title": d.title,
                "stage": d.stage,
                "value": d.value,
                "health": d.deal_health,
            }
            for d in deals
            if d.deal_health in ("yellow", "red")
        ]

        return {
            "total_deals": len(deals),
            "total_value": sum(d.value or 0 for d in deals),
            "stages": stages,
            "at_risk_deals": at_risk[:10],
        }

    async def _tool_search_companies(self, params: dict) -> dict:
        query = params.get("query", "")
        stmt = (
            select(CRMCompany)
            .where(
                CRMCompany.is_archived == False,  # noqa: E712
                CRMCompany.name.ilike(f"%{query}%"),
            )
            .limit(10)
        )
        result = await self.session.execute(stmt)
        companies = result.scalars().all()

        return {
            "count": len(companies),
            "companies": [
                {
                    "id": c.id,
                    "name": c.name,
                    "industry": c.industry,
                    "website": c.website,
                }
                for c in companies
            ],
        }

    async def _tool_get_company_details(self, params: dict) -> dict:
        company_id = params["company_id"]
        company = await self.session.get(CRMCompany, company_id)
        if not company:
            return {"error": f"Company {company_id} not found"}

        contact_result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.company_id == company_id,
                CRMContact.is_archived == False,  # noqa: E712
            ).limit(20)
        )
        contacts = contact_result.scalars().all()

        deal_result = await self.session.execute(
            select(CRMDeal).where(CRMDeal.company_id == company_id).limit(20)
        )
        deals = deal_result.scalars().all()

        return {
            "company": {
                "id": company.id,
                "name": company.name,
                "industry": company.industry,
                "website": company.website,
                "size": company.size,
                "description": company.description,
            },
            "contacts": [
                {
                    "id": c.id,
                    "name": c.name,
                    "title": c.title,
                    "stage": c.stage,
                }
                for c in contacts
            ],
            "deals": [
                {
                    "id": d.id,
                    "title": d.title,
                    "stage": d.stage,
                    "value": d.value,
                    "status": d.status,
                }
                for d in deals
            ],
        }

    async def _tool_create_contact(self, params: dict) -> dict:
        """Create a contact via ContactService for full cascade."""
        from app.services.crm_contact_service import ContactService

        name = params.get("name", "").strip()
        if not name:
            return {"error": "Name is required"}

        data: dict[str, Any] = {"name": name}
        for field in ("email", "phone", "company", "title", "stage", "notes"):
            val = params.get(field)
            if val:
                data[field] = val
        data.setdefault("stage", "lead")
        data["tags"] = params.get("tags", [])

        svc = ContactService(
            self.session, self.events, self.background, self.cache
        )
        contact = await svc.create_contact(
            data, user_id=self._user_id or "copilot"
        )

        return {
            "created": True,
            "contact": {
                "id": contact.id,
                "name": contact.name,
                "email": contact.email,
                "company": contact.company,
                "stage": contact.stage,
            },
        }

    async def _tool_update_contact(self, params: dict) -> dict:
        """Update a contact via ContactService for audit + events."""
        from app.services.crm_contact_service import ContactService

        contact_id = params["contact_id"]
        fields = params.get("fields", {})

        allowed = {
            "name", "email", "phone", "company", "title",
            "stage", "notes", "source",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return {"updated": True, "contact_id": contact_id, "fields_updated": []}

        svc = ContactService(
            self.session, self.events, self.background, self.cache
        )
        contact = await svc.update_contact(
            contact_id, updates, user_id=self._user_id or "copilot"
        )
        if contact is None:
            return {"error": f"Contact {contact_id} not found"}

        return {
            "updated": True,
            "contact_id": contact_id,
            "fields_updated": list(updates.keys()),
        }

    async def _tool_move_deal_stage(self, params: dict) -> dict:
        """Move a deal stage via DealService for audit + auto-probability."""
        from app.services.crm_deal_service import DealService

        deal_id = params["deal_id"]
        new_stage = params["new_stage"]

        # Read current stage before move for the response
        existing = await self.session.get(CRMDeal, deal_id)
        if not existing:
            return {"error": f"Deal {deal_id} not found"}
        old_stage = existing.stage

        svc = DealService(
            self.session, self.events, self.background, self.cache
        )
        deal = await svc.move_stage(
            deal_id, new_stage, user_id=self._user_id or "copilot"
        )

        return {
            "moved": True,
            "deal_id": deal_id,
            "title": deal.title if deal else existing.title,
            "old_stage": old_stage,
            "new_stage": new_stage,
        }

    async def _tool_get_analytics_summary(self, _params: dict) -> dict:
        stage_result = await self.session.execute(
            select(CRMContact.stage, func.count(CRMContact.id))
            .where(CRMContact.is_archived == False)  # noqa: E712
            .group_by(CRMContact.stage)
        )
        contacts_by_stage = {
            row[0] or "none": row[1] for row in stage_result.all()
        }

        deal_result = await self.session.execute(select(CRMDeal))
        deals = deal_result.scalars().all()
        open_deals = [d for d in deals if d.status == "open"]
        won_deals = [d for d in deals if d.status == "won"]
        lost_deals = [d for d in deals if d.status == "lost"]

        total_result = await self.session.execute(
            select(func.count(CRMContact.id)).where(
                CRMContact.is_archived == False  # noqa: E712
            )
        )
        total_contacts = total_result.scalar() or 0

        closed = len(won_deals) + len(lost_deals)
        win_rate = (len(won_deals) / closed * 100) if closed else 0.0

        return {
            "total_contacts": total_contacts,
            "contacts_by_stage": contacts_by_stage,
            "total_deals": len(deals),
            "open_deals": len(open_deals),
            "won_deals": len(won_deals),
            "lost_deals": len(lost_deals),
            "open_pipeline_value": sum(d.value or 0 for d in open_deals),
            "won_revenue": sum(d.value or 0 for d in won_deals),
            "win_rate": f"{win_rate:.1f}%",
        }

    # ── Tool dispatcher ───────────────────────────────────────────────

    async def _execute_tool(self, name: str, params: dict) -> str:
        """Execute a CRM tool by name and return JSON string."""
        handler = self._tool_handlers.get(name)
        if not handler:
            return json.dumps({"error": f"Unknown tool: {name}"})
        try:
            result = await handler(params)
            return json.dumps(result, default=str)
        except Exception as exc:
            logger.exception("Tool %s failed", name)
            return json.dumps({"error": str(exc)})

    # ── Main entry point ──────────────────────────────────────────────

    async def ask(
        self,
        query: str,
        *,
        history: list[dict] | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Process a natural language CRM query via LLM agentic loop."""
        if not query or not query.strip():
            return {
                "type": "clarification",
                "message": "Please ask a question about your CRM data.",
                "data": None,
            }

        self._user_id = user_id

        from app.services.llm_service import (
            TextDelta,
            ToolUseComplete,
            UsageUpdate,
            get_fallback_client,
            get_llm_client,
            llm_available,
        )

        if not llm_available():
            return {
                "type": "clarification",
                "message": (
                    "AI copilot is not configured. Please set an LLM API key "
                    "(GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY)."
                ),
                "data": None,
            }

        # Build system prompt with live CRM summary
        context = await self._build_context()
        system_prompt = _AGENT_SYSTEM.format(context=context)

        # Build conversation messages
        messages: list[dict] = []
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": query})

        try:
            client = get_llm_client()
        except RuntimeError:
            return {
                "type": "clarification",
                "message": "No LLM provider available. Please configure an API key.",
                "data": None,
            }

        failed_providers: set[str] = set()
        final_text = ""

        try:
            for iteration in range(self._MAX_ITERATIONS):
                text_parts: list[str] = []
                tool_use_blocks: list = []

                try:
                    async for event in client.stream_with_tools(
                        system=system_prompt,
                        messages=messages,
                        tools=CRM_TOOLS,
                        max_tokens=2000,
                        temperature=0.3,
                    ):
                        if isinstance(event, TextDelta):
                            text_parts.append(event.text)
                        elif isinstance(event, ToolUseComplete):
                            tool_use_blocks.append(event)
                        elif isinstance(event, UsageUpdate):
                            pass
                except Exception as stream_exc:
                    failed_providers.add(client.PROVIDER)
                    fallback = get_fallback_client(failed_providers)
                    if not fallback:
                        raise RuntimeError(
                            "All LLM providers unavailable"
                        ) from stream_exc

                    logger.warning(
                        "Copilot LLM (%s) failed: %s — switching to %s",
                        client.PROVIDER,
                        stream_exc,
                        fallback.PROVIDER,
                    )
                    client = fallback
                    text_parts = []
                    tool_use_blocks = []

                    async for event in client.stream_with_tools(
                        system=system_prompt,
                        messages=messages,
                        tools=CRM_TOOLS,
                        max_tokens=2000,
                        temperature=0.3,
                    ):
                        if isinstance(event, TextDelta):
                            text_parts.append(event.text)
                        elif isinstance(event, ToolUseComplete):
                            tool_use_blocks.append(event)

                full_text = "".join(text_parts)

                # No tool calls → LLM is done, return text response
                if not tool_use_blocks:
                    final_text = full_text
                    break

                # Build assistant message with text + tool_use blocks
                assistant_content: list[dict] = []
                if full_text:
                    assistant_content.append(
                        {"type": "text", "text": full_text}
                    )

                for tu in tool_use_blocks:
                    tool_block: dict = {
                        "type": "tool_use",
                        "id": tu.tool_use_id,
                        "name": tu.name,
                        "input": tu.input,
                    }
                    # Gemini 3+ requires thought_signature echoed back
                    if getattr(tu, "thought_signature", None):
                        tool_block["thought_signature"] = tu.thought_signature
                    assistant_content.append(tool_block)

                messages.append(
                    {"role": "assistant", "content": assistant_content}
                )

                # Execute each tool and collect results
                tool_results: list[dict] = []
                for tu in tool_use_blocks:
                    result_str = await self._execute_tool(
                        tu.name, tu.input
                    )
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tu.tool_use_id,
                        "content": result_str[:10_000],
                    })
                    logger.info(
                        "Copilot tool: %s(%s) → %s",
                        tu.name,
                        json.dumps(tu.input)[:100],
                        result_str[:200],
                    )

                messages.append({"role": "user", "content": tool_results})

            if not final_text:
                final_text = (
                    "I reached the maximum reasoning steps. "
                    "Please try a simpler query."
                )

        except Exception:
            logger.exception("Copilot agentic loop failed")
            return {
                "type": "clarification",
                "message": (
                    "Something went wrong processing your query. "
                    "Please try again."
                ),
                "data": None,
            }

        logger.info(
            "Copilot query: %s → response length: %d",
            query[:80],
            len(final_text),
        )
        return {
            "type": "answer",
            "message": final_text,
            "data": None,
        }
