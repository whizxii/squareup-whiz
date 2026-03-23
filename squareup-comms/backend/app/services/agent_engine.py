"""ReAct execution engine — streaming LLM + tool loop with WebSocket broadcast."""

from __future__ import annotations

import asyncio
import copy
import json
import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime

# Maximum seconds to wait for a single LLM streaming response before timing out.
LLM_STREAM_TIMEOUT = 120


# Python 3.9 compatibility: asyncio.timeout was added in 3.11
if sys.version_info >= (3, 11):
    _async_timeout = asyncio.timeout
else:
    @asynccontextmanager
    async def _async_timeout(delay: float):
        """Polyfill for asyncio.timeout on Python <3.11.

        Uses asyncio.wait_for semantics by scheduling a cancellation.
        """
        loop = asyncio.get_running_loop()
        task = asyncio.current_task()
        handle = loop.call_later(delay, task.cancel)
        try:
            yield
        except asyncio.CancelledError:
            raise asyncio.TimeoutError() from None
        finally:
            handle.cancel()

from sqlmodel import select
from sqlalchemy import func

from app.core.db import async_session
from app.models.agents import Agent, AgentExecution
from app.models.chat import Message
from app.services.conversation_memory import (
    build_system_prompt,
    extract_and_save_memory,
    load_agent_memory,
    load_conversation_context,
    load_crm_intelligence,
)
from app.services.llm_service import (
    TextDelta,
    ToolUseComplete,
    UsageUpdate,
    calculate_cost,
    get_fallback_client,
    get_llm_client,
    is_quota_exhausted,
    is_rate_limit_error,
    resolve_model_for_client,
)
from app.services.plan_and_execute import (
    PLAN_EXECUTION_INSTRUCTION,
    PLAN_REJECTED_INSTRUCTION,
    boosted_max_iterations,
    count_plan_steps,
    generate_plan,
    is_complex_request,
)
from app.services.tools import tool_registry
from app.services.tools.registry import ToolContext, ToolResult
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# WebSocket broadcast helpers
# ---------------------------------------------------------------------------

async def _broadcast(channel_id: str, event: dict) -> None:
    """Broadcast an event to WebSocket clients in the target channel room.

    Falls back to broadcast_all if no users are in the channel room (e.g.,
    users connected before room auto-join was added).
    """
    room_id = f"channel:{channel_id}"
    room_members = hub_manager.rooms.get(room_id, set())
    if room_members:
        await hub_manager.broadcast_to_room(room_id, event)
    else:
        # Fallback: broadcast to all if no room membership yet
        await hub_manager.broadcast_all(event)


async def _broadcast_status(
    channel_id: str, agent_id: str, status: str, description: str | None = None,
) -> None:
    event: dict = {
        "type": "agent.status",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "status": status,
    }
    if description:
        event["description"] = description
    await _broadcast(channel_id, event)


async def _broadcast_text_delta(
    channel_id: str, agent_id: str, message_id: str, delta: str,
) -> None:
    await _broadcast(channel_id, {
        "type": "agent.text_delta",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "message_id": message_id,
        "delta": delta,
    })


async def _broadcast_tool_start(
    channel_id: str, agent_id: str, tool_name: str, tool_input: dict,
) -> None:
    await _broadcast(channel_id, {
        "type": "agent.tool_start",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "tool_name": tool_name,
        "tool_input_preview": json.dumps(tool_input)[:300],
    })


async def _broadcast_tool_result(
    channel_id: str, agent_id: str, tool_name: str, success: bool, output_preview: str,
) -> None:
    await _broadcast(channel_id, {
        "type": "agent.tool_result",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "tool_name": tool_name,
        "success": success,
        "output_preview": output_preview[:500],
    })


async def _broadcast_complete(
    channel_id: str, agent_id: str, message_id: str,
) -> None:
    await _broadcast(channel_id, {
        "type": "agent.complete",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "message_id": message_id,
    })


async def _broadcast_progress(
    channel_id: str,
    agent_id: str,
    current: int,
    total: int,
    description: str | None = None,
) -> None:
    await _broadcast(channel_id, {
        "type": "agent.progress",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "current": current,
        "total": total,
        "description": description,
    })


async def _broadcast_error(
    channel_id: str, agent_id: str, error_message: str,
) -> None:
    await _broadcast(channel_id, {
        "type": "agent.error",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "error_message": error_message[:500],
    })


# ---------------------------------------------------------------------------
# Tool confirmation system
# ---------------------------------------------------------------------------

# Pending confirmation requests — maps request_id → asyncio.Future[dict]
_pending_confirmations: dict[str, asyncio.Future] = {}

# How long to wait for user to approve/reject before auto-rejecting
CONFIRMATION_TIMEOUT = 120  # seconds


async def _request_confirmation(
    channel_id: str,
    agent_id: str,
    agent_name: str,
    tool_name: str,
    tool_input: dict,
) -> dict:
    """Broadcast a confirmation request and wait for the user's response.

    Returns ``{"approved": bool, "edited_input": dict | None}``.
    Auto-rejects after ``CONFIRMATION_TIMEOUT`` seconds.
    """
    request_id = str(uuid.uuid4())
    loop = asyncio.get_running_loop()
    future: asyncio.Future[dict] = loop.create_future()
    _pending_confirmations[request_id] = future

    await _broadcast(channel_id, {
        "type": "agent.confirmation",
        "request_id": request_id,
        "channel_id": channel_id,
        "agent_id": agent_id,
        "agent_name": agent_name,
        "tool_name": tool_name,
        "tool_input": tool_input,
    })

    try:
        return await asyncio.wait_for(future, timeout=CONFIRMATION_TIMEOUT)
    except asyncio.TimeoutError:
        logger.warning(
            "Confirmation request %s timed out after %ds (tool=%s, agent=%s)",
            request_id, CONFIRMATION_TIMEOUT, tool_name, agent_id,
        )
        return {"approved": False, "edited_input": None}
    finally:
        _pending_confirmations.pop(request_id, None)


def submit_confirmation_response(
    request_id: str,
    approved: bool,
    edited_input: dict | None = None,
) -> bool:
    """Submit a user's confirmation response. Returns True if the request existed."""
    future = _pending_confirmations.get(request_id)
    if future is None or future.done():
        return False
    future.set_result({"approved": approved, "edited_input": edited_input})
    return True


# ---------------------------------------------------------------------------
# Contextual status labels — map tool name prefixes to human-readable labels
# ---------------------------------------------------------------------------

TOOL_CATEGORY_LABELS: dict[str, str] = {
    "crm_": "Looking up CRM records",
    "list_tasks": "Checking your tasks",
    "create_task": "Creating a task",
    "update_task": "Updating a task",
    "complete_task": "Completing a task",
    "assign_task": "Assigning a task",
    "set_reminder": "Setting a reminder",
    "list_reminders": "Checking reminders",
    "cancel_reminder": "Cancelling a reminder",
    "list_calendar": "Checking your calendar",
    "create_calendar": "Creating a calendar event",
    "update_calendar": "Updating a calendar event",
    "check_availability": "Checking availability",
    "draft_email": "Drafting an email",
    "send_email": "Sending an email",
    "search_email": "Searching emails",
    "get_email": "Reading email thread",
    "list_channels": "Browsing channels",
    "search_messages": "Searching messages",
    "send_channel": "Sending a message",
    "get_channel": "Checking channel info",
    "search_workspace": "Searching the workspace",
    "search_crm_notes": "Searching CRM notes",
    "get_contact_history": "Loading contact history",
    "get_deal_metrics": "Analyzing deal metrics",
    "get_pipeline": "Reviewing pipeline",
    "get_contact_stats": "Analyzing contacts",
    "get_current_time": "Checking the time",
    "parse_relative_date": "Parsing a date",
    "calculate_date": "Calculating a date",
    "ai_": "Running AI analysis",
    "invoke_agent": "Delegating to another agent",
    "delegate_to_agent": "Consulting a specialist agent",
    "list_agents": "Listing available agents",
    "entity_360_view": "Building complete entity profile",
    "relationship_map": "Mapping relationships",
    "report_progress": "Updating progress",
    "generate_weekly_report": "Compiling weekly intelligence report",
    "catch_up_summary": "Gathering what you missed",
    "list_workflows": "Listing workflows",
    "trigger_workflow": "Triggering a workflow",
}


def _get_tool_status_label(tool_name: str) -> str:
    """Get a human-readable status label for a tool name."""
    # Exact match first
    if tool_name in TOOL_CATEGORY_LABELS:
        return TOOL_CATEGORY_LABELS[tool_name]
    # Prefix match
    for prefix, label in TOOL_CATEGORY_LABELS.items():
        if prefix.endswith("_") and tool_name.startswith(prefix):
            return label
    return f"Running {tool_name.replace('_', ' ')}"


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

async def run_agent(
    agent_id: str,
    trigger_message_id: str,
    channel_id: str,
    user_id: str,
    content: str,
) -> None:
    """Full ReAct loop with streaming, tool execution, and memory.

    1. Load agent from DB, set status to working
    2. Build context (channel history + persistent memory)
    3. Build tool list from registry
    4. Loop: LLM stream → text deltas → tool_use blocks → execute → feed back
    5. Save final message + execution record
    6. Extract and persist memory facts
    """
    start_time = time.monotonic()

    # Instant acknowledgment — sub-100ms feedback before any DB operations
    await _broadcast_status(channel_id, agent_id, "thinking", "On it...")

    # 1. Load agent
    async with async_session() as session:
        agent = await session.get(Agent, agent_id)
        if not agent or not agent.active:
            logger.warning("Agent %s not found or inactive", agent_id)
            return

        # --- Budget enforcement (wrapped in try/except for schema resilience) ---
        try:
            current_month = datetime.utcnow().strftime("%Y-%m")

            # Reset monthly cost if month changed
            if agent.cost_month_key != current_month:
                agent.cost_this_month = 0.0
                agent.cost_month_key = current_month

            # Check monthly budget
            if agent.monthly_budget_usd is not None and agent.cost_this_month >= agent.monthly_budget_usd:
                logger.info("Agent %s exceeded monthly budget ($%.2f/$%.2f)",
                            agent_id, agent.cost_this_month, agent.monthly_budget_usd)
                session.add(agent)
                await session.commit()
                await _broadcast_error(
                    channel_id, agent_id,
                    f"I've hit my monthly budget limit (${agent.monthly_budget_usd:.2f}). "
                    "Ask an admin to increase it.",
                )
                return

            # Check daily execution limit
            if agent.daily_execution_limit is not None:
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                count_result = await session.execute(
                    select(func.count(AgentExecution.id)).where(
                        AgentExecution.agent_id == agent_id,
                        AgentExecution.created_at >= today_start,
                    )
                )
                today_count = count_result.scalar() or 0
                if today_count >= agent.daily_execution_limit:
                    logger.info("Agent %s hit daily limit (%d/%d)",
                                agent_id, today_count, agent.daily_execution_limit)
                    await _broadcast_error(
                        channel_id, agent_id,
                        f"I've reached my daily execution limit ({agent.daily_execution_limit} runs/day). "
                        "Try again tomorrow or ask an admin to increase the limit.",
                    )
                    return
        except Exception:
            logger.warning("Budget enforcement failed (non-fatal), proceeding", exc_info=True)

        agent.status = "working"
        agent.current_task = "Processing message"
        session.add(agent)
        await session.commit()

    await _broadcast_status(channel_id, agent.id, "thinking", "Preparing context...")

    max_iterations = agent.max_iterations or 5
    temperature = agent.temperature if agent.temperature is not None else 0.7
    try:
        llm = get_llm_client(agent.model)
    except RuntimeError as exc:
        logger.error("No LLM client available: %s", exc)
        await _broadcast_error(
            channel_id, agent_id,
            "No LLM API key is configured. Set GEMINI_API_KEY (free), GROQ_API_KEY, or ANTHROPIC_API_KEY.",
        )
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        return
    stream_message_id = str(uuid.uuid4())

    # 2. Build context — wrapped in try/except so a crash here (e.g. unmigrated
    #    models in load_crm_intelligence) doesn't leave the agent stuck "working".
    try:
        history = await load_conversation_context(
            channel_id, agent.id, limit=20, deep_context=True, total_messages=80,
        )
        memory_facts = await load_agent_memory(agent.id, user_id)
        crm_intelligence = await load_crm_intelligence(user_id)
        system_prompt = build_system_prompt(agent, memory_facts, crm_intelligence=crm_intelligence)
    except Exception as ctx_exc:
        logger.error("Agent %s (%s): context build failed: %s", agent.id, agent.name, ctx_exc, exc_info=True)
        await _broadcast_error(
            channel_id, agent.id,
            "Something went wrong preparing my context. Please try again.",
        )
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        await _broadcast_status(channel_id, agent.id, "idle")
        return

    # Start with history + trigger message
    messages: list[dict] = [*history, {"role": "user", "content": content}]

    # Ensure messages alternate roles (Claude API requirement)
    messages = _ensure_alternating_roles(messages)

    # 3. Build tools (built-in + custom + MCP)
    try:
        tools = await tool_registry.get_tools_for_agent(
            agent.tools or "[]",
            user_id,
            custom_tools_json=agent.custom_tools,
            mcp_servers_json=agent.mcp_servers,
        )
        tool_schemas = [t.to_claude_schema() for t in tools]
    except Exception as tool_exc:
        logger.error("Agent %s (%s): tool build failed: %s", agent.id, agent.name, tool_exc, exc_info=True)
        await _broadcast_error(
            channel_id, agent.id,
            "Something went wrong loading my tools. Please try again.",
        )
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        await _broadcast_status(channel_id, agent.id, "idle")
        return
    tool_context = ToolContext(user_id=user_id, channel_id=channel_id, agent_id=agent.id)

    # ---------------------------------------------------------------
    # Plan-and-execute: detect complex requests, generate a plan,
    # confirm with the user, then boost the iteration budget.
    # Skipped for system-triggered executions (scheduled runs, nudges).
    # ---------------------------------------------------------------
    if user_id != "system" and is_complex_request(content):
        await _broadcast_status(channel_id, agent.id, "thinking", "Planning approach...")
        resolved_plan_model = resolve_model_for_client(llm, agent.model)
        plan_text = await generate_plan(
            llm, resolved_plan_model, system_prompt, content,
        )
        if plan_text is not None:
            logger.info(
                "Agent %s (%s): generated plan (%d steps) for complex request",
                agent.id, agent.name, count_plan_steps(plan_text),
            )
            # Stream the plan to the user as a regular text delta
            await _broadcast_text_delta(
                channel_id, agent.id, stream_message_id, plan_text,
            )
            # Request confirmation using the existing confirmation infra
            confirmation = await _request_confirmation(
                channel_id=channel_id,
                agent_id=agent.id,
                agent_name=agent.name,
                tool_name="__plan__",
                tool_input={"plan": plan_text},
            )
            if confirmation.get("approved"):
                step_count = count_plan_steps(plan_text)
                max_iterations = boosted_max_iterations(max_iterations, step_count)
                logger.info(
                    "Agent %s: plan approved — boosted max_iterations to %d",
                    agent.id, max_iterations,
                )
                # Inject the approved plan + execution instructions into messages
                messages.append({
                    "role": "assistant",
                    "content": plan_text,
                })
                messages.append({
                    "role": "user",
                    "content": PLAN_EXECUTION_INSTRUCTION,
                })
            else:
                logger.info("Agent %s: plan rejected — proceeding with direct handling", agent.id)
                messages.append({
                    "role": "user",
                    "content": PLAN_REJECTED_INSTRUCTION,
                })
            messages = _ensure_alternating_roles(messages)

    tool_calls_log: list[dict] = []
    total_input_tokens = 0
    total_output_tokens = 0
    iteration = 0
    final_text = ""
    exec_status = "success"
    error_message: str | None = None
    failed_providers: set[str] = set()

    resolved_model = resolve_model_for_client(llm, agent.model)
    logger.info(
        "Agent %s (%s): starting ReAct loop — provider=%s, resolved_model=%s, "
        "tools=%d, system_prompt_len=%d",
        agent.id, agent.name, llm.PROVIDER, resolved_model,
        len(tool_schemas), len(system_prompt),
    )

    try:
        while iteration < max_iterations:
            text_parts: list[str] = []
            tool_use_blocks: list[ToolUseComplete] = []

            # Stream LLM response (with rate-limit retry + provider fallback)
            async def _stream_once(
                client, model, tp: list, tub: list,
            ) -> None:
                async with _async_timeout(LLM_STREAM_TIMEOUT):
                    async for event in client.stream_with_tools(
                        system=system_prompt,
                        messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        model=model,
                        max_tokens=4096,
                        temperature=temperature,
                    ):
                        if isinstance(event, TextDelta):
                            tp.append(event.text)
                            await _broadcast_text_delta(
                                channel_id, agent.id, stream_message_id, event.text,
                            )
                        elif isinstance(event, ToolUseComplete):
                            tub.append(event)
                        elif isinstance(event, UsageUpdate):
                            nonlocal total_input_tokens, total_output_tokens
                            total_input_tokens += event.input_tokens
                            total_output_tokens += event.output_tokens

            RATE_LIMIT_BACKOFFS = [1, 3, 5]  # seconds

            async def _stream_with_retry(client, model) -> tuple[list[str], list[ToolUseComplete]]:
                """Try streaming, retrying with backoff on transient rate limits.

                Quota exhaustion (daily/monthly cap) skips retries entirely.
                """
                last_exc: Exception | None = None
                for attempt, delay in enumerate([0] + RATE_LIMIT_BACKOFFS):
                    if delay:
                        logger.info(
                            "Agent %s: rate-limited by %s, retrying in %ds (attempt %d)...",
                            agent.id, client.PROVIDER, delay, attempt + 1,
                        )
                        await _broadcast_status(
                            channel_id, agent.id, "thinking",
                            f"Rate-limited, retrying in {delay}s...",
                        )
                        await asyncio.sleep(delay)
                    tp: list[str] = []
                    tub: list[ToolUseComplete] = []
                    try:
                        await _stream_once(client, model, tp, tub)
                        return tp, tub
                    except (TimeoutError, asyncio.TimeoutError):
                        raise
                    except Exception as exc:
                        last_exc = exc
                        if not is_rate_limit_error(exc):
                            raise  # Non-rate-limit error — don't retry
                        if is_quota_exhausted(exc):
                            raise  # Daily quota burned — retrying won't help
                assert last_exc is not None
                raise last_exc  # All retries exhausted

            try:
                text_parts, tool_use_blocks = await _stream_with_retry(llm, resolved_model)
            except (TimeoutError, asyncio.TimeoutError):
                raise  # Let outer handler deal with timeouts
            except Exception as stream_exc:
                failed_providers.add(llm.PROVIDER)
                fallback = get_fallback_client(failed_providers)
                if not fallback:
                    raise RuntimeError(
                        "All LLM providers are unavailable (rate-limited or misconfigured). "
                        "Please try again in a few minutes or add an ANTHROPIC_API_KEY."
                    ) from stream_exc
                logger.warning(
                    "Agent %s LLM (%s) failed on iteration %d: %s. Switching to fallback (%s).",
                    agent.id, llm.PROVIDER, iteration, stream_exc, fallback.PROVIDER,
                )
                await _broadcast_status(channel_id, agent.id, "thinking", "Switching providers...")
                llm = fallback
                resolved_model = fallback.DEFAULT_MODEL
                try:
                    text_parts, tool_use_blocks = await _stream_with_retry(llm, resolved_model)
                except (TimeoutError, asyncio.TimeoutError):
                    raise
                except Exception as fallback_exc:
                    failed_providers.add(llm.PROVIDER)
                    raise RuntimeError(
                        "All LLM providers are unavailable (rate-limited or misconfigured). "
                        "Please try again in a few minutes or add an ANTHROPIC_API_KEY."
                    ) from fallback_exc

            full_text = "".join(text_parts)

            if not full_text and not tool_use_blocks:
                logger.warning(
                    "Agent %s: LLM stream produced no text and no tool calls "
                    "(provider=%s, model=%s, iteration=%d)",
                    agent.id, llm.PROVIDER, resolved_model, iteration,
                )

            # No tool calls → done
            if not tool_use_blocks:
                final_text = full_text
                break

            # 4. Execute tools — broadcast contextual status per first tool
            first_tool_label = _get_tool_status_label(tool_use_blocks[0].name) if tool_use_blocks else None
            await _broadcast_status(channel_id, agent.id, "tool_calling", first_tool_label)

            # Build assistant content block for next loop
            assistant_content: list[dict] = []
            if full_text:
                assistant_content.append({"type": "text", "text": full_text})

            tool_results: list[dict] = []
            for tu in tool_use_blocks:
                tool_block: dict = {
                    "type": "tool_use",
                    "id": tu.tool_use_id,
                    "name": tu.name,
                    "input": tu.input,
                }
                # Gemini 3+ requires thought_signature echoed back on function call parts
                if getattr(tu, "thought_signature", None):
                    tool_block["thought_signature"] = tu.thought_signature
                assistant_content.append(tool_block)

                await _broadcast_tool_start(channel_id, agent.id, tu.name, tu.input)
                await _broadcast_status(
                    channel_id, agent.id, "tool_calling",
                    _get_tool_status_label(tu.name),
                )

                # Check if this tool requires user confirmation before execution
                tool_def = next((t for t in tools if t.name == tu.name), None)
                actual_input = tu.input
                if tool_def and tool_def.requires_confirmation:
                    await _broadcast_status(channel_id, agent.id, "awaiting_confirmation")
                    confirmation = await _request_confirmation(
                        channel_id, agent.id, agent.name, tu.name, tu.input,
                    )
                    if not confirmation["approved"]:
                        result = ToolResult(
                            success=False, output=None,
                            error="User rejected this action.",
                        )
                        output_str = f"Error: {result.error}"
                        await _broadcast_tool_result(
                            channel_id, agent.id, tu.name, result.success, output_str,
                        )
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tu.tool_use_id,
                            "name": tu.name,
                            "content": output_str[:10000],
                            "is_error": True,
                        })
                        tool_calls_log.append({
                            "name": tu.name,
                            "input": tu.input,
                            "output": None,
                            "success": False,
                            "duration_ms": 0,
                            "error": "User rejected this action.",
                        })
                        continue
                    if confirmation.get("edited_input"):
                        actual_input = confirmation["edited_input"]
                    await _broadcast_status(channel_id, agent.id, "tool_calling")

                tool_start = time.monotonic()
                result = await tool_registry.execute(
                    tu.name, actual_input, tool_context, available_tools=tools,
                )
                tool_duration_ms = int((time.monotonic() - tool_start) * 1000)

                output_str = json.dumps(result.output) if result.success else f"Error: {result.error}"

                # If the tool returned a progress update, broadcast it
                if (
                    result.success
                    and isinstance(result.output, dict)
                    and result.output.get("__progress__")
                ):
                    await _broadcast_progress(
                        channel_id, agent.id,
                        current=result.output.get("current", 0),
                        total=result.output.get("total", 0),
                        description=result.output.get("description"),
                    )

                await _broadcast_tool_result(
                    channel_id, agent.id, tu.name, result.success, output_str,
                )

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.tool_use_id,
                    "name": tu.name,
                    "content": output_str[:10000],
                    "is_error": not result.success,
                })
                tool_calls_log.append({
                    "name": tu.name,
                    "input": actual_input,
                    "output": result.output,
                    "success": result.success,
                    "duration_ms": tool_duration_ms,
                    "error": result.error,
                })

            # Feed tool results back into conversation
            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})

            # Continue to thinking for next iteration
            iteration += 1
            await _broadcast_progress(
                channel_id, agent.id,
                current=iteration,
                total=max_iterations,
                description=f"Step {iteration} of {max_iterations}",
            )
            await _broadcast_status(channel_id, agent.id, "thinking", "Processing results...")

        # If we exhausted iterations without a clean finish, use last text
        if not final_text and iteration >= max_iterations:
            final_text = "I've reached my maximum number of reasoning steps. Here's what I found so far."

    except (TimeoutError, asyncio.TimeoutError):
        logger.error(
            "Agent %s (%s): LLM stream timed out after %ds (provider=%s, iteration=%d)",
            agent.id, agent.name, LLM_STREAM_TIMEOUT, llm.PROVIDER, iteration,
        )
        exec_status = "error"
        error_message = f"LLM provider ({llm.PROVIDER}) timed out after {LLM_STREAM_TIMEOUT}s"
        final_text = "I'm taking too long to respond. Please try again — if this keeps happening, the request may be too complex for a single message."
        await _broadcast_error(channel_id, agent.id, final_text)

    except Exception as exc:
        exec_status = "error"
        error_message = str(exc)[:500]
        exc_str = str(exc)
        if "All LLM providers are unavailable" in exc_str:
            final_text = "I can't respond right now — all AI providers are rate-limited. Please try again in a few minutes."
        else:
            final_text = final_text or f"Something went wrong: {exc_str[:200]}"
        logger.error("Agent %s execution failed: %s", agent.id, exc, exc_info=True)
        await _broadcast_error(channel_id, agent.id, final_text[:500])

    elapsed_ms = int((time.monotonic() - start_time) * 1000)
    # Per-provider cost calculation
    total_cost = calculate_cost(llm.PROVIDER, total_input_tokens, total_output_tokens)

    # 5. Save message + execution + reset agent status atomically
    now = datetime.utcnow()
    agent_message = Message(
        id=stream_message_id,
        channel_id=channel_id,
        sender_id=agent.id,
        sender_type="agent",
        content=final_text,
        created_at=now,
    )

    try:
        async with async_session() as session:
            session.add(agent_message)

            execution = AgentExecution(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                trigger_message_id=trigger_message_id,
                trigger_channel_id=channel_id,
                conversation_messages=json.dumps(messages, default=str)[:50000],
                tools_called=json.dumps(tool_calls_log, default=str)[:50000],
                response_text=final_text[:10000],
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                total_cost_usd=total_cost,
                duration_ms=elapsed_ms,
                num_tool_calls=len(tool_calls_log),
                status=exec_status,
                error_message=error_message,
                created_at=now,
            )
            session.add(execution)

            # Update agent stats (including budget tracking + success rate)
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None

                # Incrementally recalculate success_rate (no intermediate rounding)
                prev_total = db_agent.total_executions
                is_success = 1 if exec_status == "success" else 0
                new_total = prev_total + 1
                prev_rate_fraction = (db_agent.success_rate / 100.0) if prev_total > 0 else 0.0
                db_agent.success_rate = round(
                    ((prev_rate_fraction * prev_total) + is_success) / new_total * 100.0, 1
                )

                db_agent.total_executions = new_total
                db_agent.total_cost_usd += total_cost
                # Track monthly cost for budget enforcement
                current_month = now.strftime("%Y-%m")
                if db_agent.cost_month_key != current_month:
                    db_agent.cost_this_month = total_cost
                    db_agent.cost_month_key = current_month
                else:
                    db_agent.cost_this_month += total_cost
                session.add(db_agent)

            await session.commit()
    except Exception as save_exc:
        logger.error("Failed to save agent execution: %s", save_exc)
        # Even if save fails, ensure agent status is reset to idle in DB
        try:
            async with async_session() as session:
                db_agent = await session.get(Agent, agent.id)
                if db_agent:
                    db_agent.status = "idle"
                    db_agent.current_task = None
                    session.add(db_agent)
                    await session.commit()
        except Exception:
            logger.error("Failed to reset agent %s status to idle", agent.id)

    # Broadcast the final assembled message
    await _broadcast(channel_id, {
        "type": "chat.message",
        "message": {
            "id": agent_message.id,
            "channel_id": agent_message.channel_id,
            "sender_id": agent_message.sender_id,
            "sender_type": "agent",
            "content": agent_message.content,
            "thread_id": None,
            "reply_count": 0,
            "edited": False,
            "pinned": False,
            "created_at": now.isoformat(),
            "attachments": [],
            "mentions": [],
            "reactions": [],
            "sender_name": agent.name,
            "tool_calls": [
                {"name": tc["name"], "success": tc.get("success", True)}
                for tc in tool_calls_log
            ],
        },
    })

    await _broadcast_complete(channel_id, agent.id, stream_message_id)
    await _broadcast_status(channel_id, agent.id, "idle")

    # Embed agent message in background
    from app.services.embedding_service import embed_message_background
    embed_message_background(agent_message.id)

    # 6. Best-effort memory extraction (non-blocking for the user)
    if final_text and exec_status == "success":
        try:
            await extract_and_save_memory(
                agent.id,
                user_id,
                final_text,
                llm.chat,
            )
        except Exception as exc:
            logger.warning("Memory extraction failed: %s", exc)


# ---------------------------------------------------------------------------
# Synchronous invoke — used by REST endpoint (no WebSocket streaming)
# ---------------------------------------------------------------------------

@dataclass
class InvokeResult:
    """Return value for the synchronous invoke path."""
    response_text: str
    tool_calls_log: list[dict]
    input_tokens: int
    output_tokens: int
    total_cost_usd: float
    duration_ms: int
    status: str  # "success" | "error" | "awaiting_confirmation"
    error_message: str | None
    execution_id: str | None = None
    pending_confirmation: dict | None = None  # {tool_name, tool_input, tool_use_id}


async def invoke_agent_sync(
    agent_id: str,
    user_id: str,
    content: str,
    channel_id: str | None = None,
) -> InvokeResult:
    """Run the ReAct loop synchronously (no WS streaming) and return result.

    Used by the REST ``POST /api/agents/{id}/invoke`` endpoint.
    Shares the same tool execution & LLM logic as the WS-based ``run_agent``,
    but collects the result in-memory and returns it instead of broadcasting.
    """
    start_time = time.monotonic()

    # 1. Load agent
    async with async_session() as session:
        agent = await session.get(Agent, agent_id)
        if not agent or not agent.active:
            return InvokeResult(
                response_text="Agent not found or inactive.",
                tool_calls_log=[], input_tokens=0, output_tokens=0,
                total_cost_usd=0, duration_ms=0, status="error",
                error_message="Agent not found or inactive",
            )

        agent.status = "working"
        agent.current_task = "Processing message"
        session.add(agent)
        await session.commit()

    max_iterations = agent.max_iterations or 5
    temperature = agent.temperature if agent.temperature is not None else 0.7
    try:
        llm = get_llm_client(agent.model)
    except RuntimeError as exc:
        # Reset agent status so it doesn't stay stuck as "working"
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return InvokeResult(
            response_text="No LLM API key is configured. Set GEMINI_API_KEY (free), GROQ_API_KEY, or ANTHROPIC_API_KEY.",
            tool_calls_log=[], input_tokens=0, output_tokens=0,
            total_cost_usd=0, duration_ms=elapsed_ms, status="error",
            error_message=str(exc)[:500],
        )

    # 2. Build context — no channel history for direct invoke (chat panel),
    #    but still load CRM intelligence for situational awareness.
    try:
        memory_facts = await load_agent_memory(agent.id, user_id)
        crm_intelligence = await load_crm_intelligence(user_id)
        system_prompt = build_system_prompt(agent, memory_facts, crm_intelligence=crm_intelligence)
    except Exception as ctx_exc:
        logger.error("Agent %s (%s): sync context build failed: %s", agent.id, agent.name, ctx_exc, exc_info=True)
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return InvokeResult(
            response_text="Something went wrong preparing my context. Please try again.",
            tool_calls_log=[], input_tokens=0, output_tokens=0,
            total_cost_usd=0, duration_ms=elapsed_ms, status="error",
            error_message=str(ctx_exc)[:500],
        )
    messages: list[dict] = [{"role": "user", "content": content}]

    # 3. Build tools
    try:
        tools = await tool_registry.get_tools_for_agent(
            agent.tools or "[]",
            user_id,
            custom_tools_json=agent.custom_tools,
            mcp_servers_json=agent.mcp_servers,
        )
        tool_schemas = [t.to_claude_schema() for t in tools]
    except Exception as tool_exc:
        logger.error("Agent %s (%s): sync tool build failed: %s", agent.id, agent.name, tool_exc, exc_info=True)
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return InvokeResult(
            response_text="Something went wrong loading my tools. Please try again.",
            tool_calls_log=[], input_tokens=0, output_tokens=0,
            total_cost_usd=0, duration_ms=elapsed_ms, status="error",
            error_message=str(tool_exc)[:500],
        )
    tool_context = ToolContext(user_id=user_id, channel_id=channel_id or "direct", agent_id=agent.id)

    tool_calls_log: list[dict] = []
    total_input_tokens = 0
    total_output_tokens = 0
    iteration = 0
    final_text = ""
    exec_status = "success"
    error_message: str | None = None
    failed_providers: set[str] = set()

    resolved_model = resolve_model_for_client(llm, agent.model)
    logger.info(
        "Agent %s (%s): starting direct invoke — provider=%s, resolved_model=%s, "
        "tools=%d, system_prompt_len=%d",
        agent.id, agent.name, llm.PROVIDER, resolved_model,
        len(tool_schemas), len(system_prompt),
    )

    try:
        while iteration < max_iterations:
            text_parts: list[str] = []
            tool_use_blocks: list[ToolUseComplete] = []

            # Stream LLM response (with rate-limit retry + provider fallback)
            RATE_LIMIT_BACKOFFS_SYNC = [1, 3, 5]

            async def _sync_stream_once(client, model):
                tp: list[str] = []
                tub: list[ToolUseComplete] = []
                async with _async_timeout(LLM_STREAM_TIMEOUT):
                    async for event in client.stream_with_tools(
                        system=system_prompt,
                        messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        model=model,
                        max_tokens=4096,
                        temperature=temperature,
                    ):
                        if isinstance(event, TextDelta):
                            tp.append(event.text)
                        elif isinstance(event, ToolUseComplete):
                            tub.append(event)
                        elif isinstance(event, UsageUpdate):
                            nonlocal total_input_tokens, total_output_tokens
                            total_input_tokens += event.input_tokens
                            total_output_tokens += event.output_tokens
                return tp, tub

            async def _sync_stream_with_retry(client, model):
                last_exc: Exception | None = None
                for attempt, delay in enumerate([0] + RATE_LIMIT_BACKOFFS_SYNC):
                    if delay:
                        logger.info(
                            "Agent %s: rate-limited by %s, retrying in %ds (attempt %d)...",
                            agent.id, client.PROVIDER, delay, attempt + 1,
                        )
                        await asyncio.sleep(delay)
                    try:
                        return await _sync_stream_once(client, model)
                    except (TimeoutError, asyncio.TimeoutError):
                        raise
                    except Exception as exc:
                        last_exc = exc
                        if not is_rate_limit_error(exc):
                            raise
                        if is_quota_exhausted(exc):
                            raise  # Daily quota burned — skip to fallback
                assert last_exc is not None
                raise last_exc

            try:
                text_parts, tool_use_blocks = await _sync_stream_with_retry(llm, resolved_model)
            except (TimeoutError, asyncio.TimeoutError):
                raise
            except Exception as stream_exc:
                failed_providers.add(llm.PROVIDER)
                fallback = get_fallback_client(failed_providers)
                if not fallback:
                    raise RuntimeError(
                        "All LLM providers are unavailable (rate-limited or misconfigured). "
                        "Please try again in a few minutes or add an ANTHROPIC_API_KEY."
                    ) from stream_exc
                logger.warning(
                    "Agent %s sync LLM (%s) failed on iteration %d: %s. Switching to fallback (%s).",
                    agent.id, llm.PROVIDER, iteration, stream_exc, fallback.PROVIDER,
                )
                llm = fallback
                resolved_model = fallback.DEFAULT_MODEL
                try:
                    text_parts, tool_use_blocks = await _sync_stream_with_retry(llm, resolved_model)
                except (TimeoutError, asyncio.TimeoutError):
                    raise
                except Exception as fallback_exc:
                    failed_providers.add(llm.PROVIDER)
                    raise RuntimeError(
                        "All LLM providers are unavailable (rate-limited or misconfigured). "
                        "Please try again in a few minutes or add an ANTHROPIC_API_KEY."
                    ) from fallback_exc

            full_text = "".join(text_parts)

            if not full_text and not tool_use_blocks:
                logger.warning(
                    "Agent %s sync: LLM stream produced no text and no tool calls "
                    "(provider=%s, model=%s, iteration=%d)",
                    agent.id, llm.PROVIDER, resolved_model, iteration,
                )

            if not tool_use_blocks:
                final_text = full_text
                break

            # Execute tools
            assistant_content: list[dict] = []
            if full_text:
                assistant_content.append({"type": "text", "text": full_text})

            tool_results: list[dict] = []
            for tu in tool_use_blocks:
                tool_block: dict = {
                    "type": "tool_use",
                    "id": tu.tool_use_id,
                    "name": tu.name,
                    "input": tu.input,
                }
                # Gemini 3+ requires thought_signature echoed back on function call parts
                if getattr(tu, "thought_signature", None):
                    tool_block["thought_signature"] = tu.thought_signature
                assistant_content.append(tool_block)

                # Check if this tool requires user confirmation
                tool_def = next((t for t in tools if t.name == tu.name), None)
                if tool_def and tool_def.requires_confirmation:
                    # Save partial state and return for confirmation
                    elapsed_ms = int((time.monotonic() - start_time) * 1000)
                    total_cost = calculate_cost(llm.PROVIDER, total_input_tokens, total_output_tokens)
                    exec_id = str(uuid.uuid4())

                    # Build partial state to persist for resumption
                    partial_state = {
                        "messages": messages,
                        "assistant_content": assistant_content,
                        "tool_use_blocks": [
                            {"tool_use_id": t.tool_use_id, "name": t.name, "input": t.input,
                             "thought_signature": getattr(t, "thought_signature", None)}
                            for t in tool_use_blocks
                        ],
                        "pending_tool_index": tool_use_blocks.index(tu),
                        "tool_calls_log": tool_calls_log,
                        "tool_results_so_far": tool_results,
                        "iteration": iteration,
                        "system_prompt": system_prompt,
                        "total_input_tokens": total_input_tokens,
                        "total_output_tokens": total_output_tokens,
                    }

                    try:
                        async with async_session() as session:
                            execution = AgentExecution(
                                id=exec_id,
                                agent_id=agent.id,
                                conversation_messages=json.dumps(partial_state, default=str)[:50000],
                                tools_called=json.dumps(tool_calls_log, default=str)[:50000],
                                response_text=full_text[:10000] if full_text else None,
                                input_tokens=total_input_tokens,
                                output_tokens=total_output_tokens,
                                total_cost_usd=total_cost,
                                duration_ms=elapsed_ms,
                                num_tool_calls=len(tool_calls_log),
                                status="awaiting_confirmation",
                                created_at=datetime.utcnow(),
                            )
                            session.add(execution)
                            await session.commit()
                    except Exception as save_exc:
                        logger.error("Failed to save confirmation state: %s", save_exc)

                    return InvokeResult(
                        response_text=full_text or f"I'd like to execute **{tu.name}**, but it requires your approval first.",
                        tool_calls_log=tool_calls_log,
                        input_tokens=total_input_tokens,
                        output_tokens=total_output_tokens,
                        total_cost_usd=total_cost,
                        duration_ms=elapsed_ms,
                        status="awaiting_confirmation",
                        error_message=None,
                        execution_id=exec_id,
                        pending_confirmation={
                            "tool_name": tu.name,
                            "tool_display_name": tool_def.display_name,
                            "tool_input": tu.input,
                            "tool_use_id": tu.tool_use_id,
                        },
                    )

                tool_start = time.monotonic()
                result = await tool_registry.execute(
                    tu.name, tu.input, tool_context, available_tools=tools,
                )
                tool_duration_ms = int((time.monotonic() - tool_start) * 1000)

                output_str = json.dumps(result.output) if result.success else f"Error: {result.error}"
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.tool_use_id,
                    "name": tu.name,
                    "content": output_str[:10000],
                    "is_error": not result.success,
                })
                tool_calls_log.append({
                    "name": tu.name,
                    "input": tu.input,
                    "output": result.output,
                    "success": result.success,
                    "duration_ms": tool_duration_ms,
                    "error": result.error,
                })

            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})
            iteration += 1

        if not final_text and iteration >= max_iterations:
            final_text = "I've reached my maximum number of reasoning steps. Here's what I found so far."

    except (TimeoutError, asyncio.TimeoutError):
        logger.error(
            "Agent %s (%s): sync LLM stream timed out after %ds (provider=%s, iteration=%d)",
            agent.id, agent.name, LLM_STREAM_TIMEOUT, llm.PROVIDER, iteration,
        )
        exec_status = "error"
        error_message = f"LLM provider ({llm.PROVIDER}) timed out after {LLM_STREAM_TIMEOUT}s"
        final_text = "I'm taking too long to respond. Please try again — if this keeps happening, the request may be too complex for a single message."

    except Exception as exc:
        exec_status = "error"
        error_message = str(exc)[:500]
        exc_str = str(exc)
        if "All LLM providers are unavailable" in exc_str:
            final_text = "I can't respond right now — all AI providers are rate-limited. Please try again in a few minutes."
        else:
            final_text = final_text or f"Something went wrong: {exc_str[:200]}"
        logger.error("Agent %s sync invoke failed: %s", agent.id, exc, exc_info=True)

    elapsed_ms = int((time.monotonic() - start_time) * 1000)
    total_cost = calculate_cost(llm.PROVIDER, total_input_tokens, total_output_tokens)

    # Save execution record + update agent stats
    now = datetime.utcnow()
    try:
        async with async_session() as session:
            execution = AgentExecution(
                id=str(uuid.uuid4()),
                agent_id=agent.id,
                conversation_messages=json.dumps(messages, default=str)[:50000],
                tools_called=json.dumps(tool_calls_log, default=str)[:50000],
                response_text=final_text[:10000],
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                total_cost_usd=total_cost,
                duration_ms=elapsed_ms,
                num_tool_calls=len(tool_calls_log),
                status=exec_status,
                error_message=error_message,
                created_at=now,
            )
            session.add(execution)

            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None

                # Incrementally recalculate success_rate (no intermediate rounding)
                prev_total = db_agent.total_executions
                is_success = 1 if exec_status == "success" else 0
                new_total = prev_total + 1
                prev_rate_fraction = (db_agent.success_rate / 100.0) if prev_total > 0 else 0.0
                db_agent.success_rate = round(
                    ((prev_rate_fraction * prev_total) + is_success) / new_total * 100.0, 1
                )

                db_agent.total_executions = new_total
                db_agent.total_cost_usd += total_cost
                current_month = now.strftime("%Y-%m")
                if db_agent.cost_month_key != current_month:
                    db_agent.cost_this_month = total_cost
                    db_agent.cost_month_key = current_month
                else:
                    db_agent.cost_this_month += total_cost
                session.add(db_agent)

            await session.commit()
    except Exception as save_exc:
        logger.error("Failed to save sync invoke execution: %s", save_exc)
        # Ensure agent status is reset to idle even if save fails
        try:
            async with async_session() as session:
                db_agent = await session.get(Agent, agent.id)
                if db_agent:
                    db_agent.status = "idle"
                    db_agent.current_task = None
                    session.add(db_agent)
                    await session.commit()
        except Exception:
            logger.error("Failed to reset agent %s status to idle", agent.id)

    # Best-effort memory extraction
    if final_text and exec_status == "success":
        try:
            await extract_and_save_memory(agent.id, user_id, final_text, llm.chat)
        except Exception as exc:
            logger.warning("Memory extraction failed: %s", exc)

    return InvokeResult(
        response_text=final_text,
        tool_calls_log=tool_calls_log,
        input_tokens=total_input_tokens,
        output_tokens=total_output_tokens,
        total_cost_usd=total_cost,
        duration_ms=elapsed_ms,
        status=exec_status,
        error_message=error_message,
    )


async def resume_after_confirmation(
    execution_id: str,
    agent_id: str,
    user_id: str,
    approved: bool,
    edited_input: dict | None = None,
) -> InvokeResult:
    """Resume a paused invoke after the user approves/rejects a confirmation-required tool.

    Loads saved state from the execution record, applies the confirmation decision,
    and continues the ReAct loop from where it left off.
    """
    start_time = time.monotonic()

    # 1. Load execution state
    async with async_session() as session:
        execution = await session.get(AgentExecution, execution_id)
        if not execution or execution.status != "awaiting_confirmation":
            return InvokeResult(
                response_text="No pending confirmation found for this execution.",
                tool_calls_log=[], input_tokens=0, output_tokens=0,
                total_cost_usd=0, duration_ms=0, status="error",
                error_message="Execution not found or not awaiting confirmation",
            )
        agent = await session.get(Agent, agent_id)
        if not agent or not agent.active:
            return InvokeResult(
                response_text="Agent not found or inactive.",
                tool_calls_log=[], input_tokens=0, output_tokens=0,
                total_cost_usd=0, duration_ms=0, status="error",
                error_message="Agent not found or inactive",
            )

        agent.status = "working"
        agent.current_task = "Resuming after confirmation"
        session.add(agent)
        await session.commit()

    # 2. Restore state
    try:
        partial_state = json.loads(execution.conversation_messages or "{}")
    except (json.JSONDecodeError, TypeError):
        return InvokeResult(
            response_text="Could not restore execution state.",
            tool_calls_log=[], input_tokens=0, output_tokens=0,
            total_cost_usd=0, duration_ms=0, status="error",
            error_message="Corrupt execution state",
        )

    messages: list[dict] = partial_state.get("messages", [])
    assistant_content: list[dict] = partial_state.get("assistant_content", [])
    saved_tool_blocks = partial_state.get("tool_use_blocks", [])
    pending_idx = partial_state.get("pending_tool_index", 0)
    tool_calls_log: list[dict] = partial_state.get("tool_calls_log", [])
    tool_results_so_far: list[dict] = partial_state.get("tool_results_so_far", [])
    iteration = partial_state.get("iteration", 0)
    system_prompt = partial_state.get("system_prompt", "")
    total_input_tokens = partial_state.get("total_input_tokens", 0)
    total_output_tokens = partial_state.get("total_output_tokens", 0)

    max_iterations = agent.max_iterations or 5
    temperature = agent.temperature if agent.temperature is not None else 0.7

    try:
        llm = get_llm_client(agent.model)
    except RuntimeError as exc:
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        return InvokeResult(
            response_text="No LLM API key is configured.",
            tool_calls_log=tool_calls_log, input_tokens=total_input_tokens,
            output_tokens=total_output_tokens, total_cost_usd=0,
            duration_ms=0, status="error", error_message=str(exc)[:500],
        )

    resolved_model = resolve_model_for_client(llm, agent.model)

    # 3. Build tools
    try:
        tools = await tool_registry.get_tools_for_agent(
            agent.tools or "[]", user_id,
            custom_tools_json=agent.custom_tools,
            mcp_servers_json=agent.mcp_servers,
        )
        tool_schemas = [t.to_claude_schema() for t in tools]
    except Exception as tool_exc:
        async with async_session() as session:
            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None
                session.add(db_agent)
                await session.commit()
        return InvokeResult(
            response_text="Something went wrong loading my tools.",
            tool_calls_log=tool_calls_log, input_tokens=total_input_tokens,
            output_tokens=total_output_tokens, total_cost_usd=0,
            duration_ms=0, status="error", error_message=str(tool_exc)[:500],
        )

    tool_context = ToolContext(user_id=user_id, channel_id="direct", agent_id=agent.id)

    # 4. Process the pending tool and remaining tools from the saved block
    tool_results = list(tool_results_so_far)
    for i, tb in enumerate(saved_tool_blocks):
        if i < pending_idx:
            continue  # Already processed before pause

        actual_input = tb["input"]
        if i == pending_idx:
            # This is the confirmation-required tool
            if not approved:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tb["tool_use_id"],
                    "name": tb["name"],
                    "content": "Error: User rejected this action.",
                    "is_error": True,
                })
                tool_calls_log.append({
                    "name": tb["name"],
                    "input": tb["input"],
                    "output": None,
                    "success": False,
                    "duration_ms": 0,
                    "error": "User rejected this action.",
                })
                continue
            if edited_input is not None:
                actual_input = edited_input

        tool_start = time.monotonic()
        result = await tool_registry.execute(
            tb["name"], actual_input, tool_context, available_tools=tools,
        )
        tool_duration_ms = int((time.monotonic() - tool_start) * 1000)

        output_str = json.dumps(result.output) if result.success else f"Error: {result.error}"
        tool_results.append({
            "type": "tool_result",
            "tool_use_id": tb["tool_use_id"],
            "name": tb["name"],
            "content": output_str[:10000],
            "is_error": not result.success,
        })
        tool_calls_log.append({
            "name": tb["name"],
            "input": actual_input,
            "output": result.output,
            "success": result.success,
            "duration_ms": tool_duration_ms,
            "error": result.error,
        })

    messages.append({"role": "assistant", "content": assistant_content})
    messages.append({"role": "user", "content": tool_results})
    iteration += 1

    # 5. Continue the ReAct loop
    final_text = ""
    exec_status = "success"
    error_message: str | None = None
    failed_providers: set[str] = set()

    try:
        while iteration < max_iterations:
            text_parts: list[str] = []
            tool_use_blocks: list[ToolUseComplete] = []

            RATE_LIMIT_BACKOFFS_CONF = [1, 3, 5]

            async def _conf_stream_once(client, model):
                tp: list[str] = []
                tub: list[ToolUseComplete] = []
                async with _async_timeout(LLM_STREAM_TIMEOUT):
                    async for event in client.stream_with_tools(
                        system=system_prompt, messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        model=model, max_tokens=4096,
                        temperature=temperature,
                    ):
                        if isinstance(event, TextDelta):
                            tp.append(event.text)
                        elif isinstance(event, ToolUseComplete):
                            tub.append(event)
                        elif isinstance(event, UsageUpdate):
                            nonlocal total_input_tokens, total_output_tokens
                            total_input_tokens += event.input_tokens
                            total_output_tokens += event.output_tokens
                return tp, tub

            async def _conf_stream_with_retry(client, model):
                last_exc: Exception | None = None
                for attempt, delay in enumerate([0] + RATE_LIMIT_BACKOFFS_CONF):
                    if delay:
                        logger.info(
                            "Confirmation loop: rate-limited by %s, retrying in %ds...",
                            client.PROVIDER, delay,
                        )
                        await asyncio.sleep(delay)
                    try:
                        return await _conf_stream_once(client, model)
                    except (TimeoutError, asyncio.TimeoutError):
                        raise
                    except Exception as exc:
                        last_exc = exc
                        if not is_rate_limit_error(exc):
                            raise
                        if is_quota_exhausted(exc):
                            raise  # Daily quota burned — skip to fallback
                assert last_exc is not None
                raise last_exc

            try:
                text_parts, tool_use_blocks = await _conf_stream_with_retry(llm, resolved_model)
            except (TimeoutError, asyncio.TimeoutError):
                raise
            except Exception as stream_exc:
                failed_providers.add(llm.PROVIDER)
                fallback = get_fallback_client(failed_providers)
                if not fallback:
                    raise RuntimeError("All LLM providers are unavailable.") from stream_exc
                llm = fallback
                resolved_model = fallback.DEFAULT_MODEL
                try:
                    text_parts, tool_use_blocks = await _conf_stream_with_retry(llm, resolved_model)
                except (TimeoutError, asyncio.TimeoutError):
                    raise
                except Exception as fallback_exc:
                    raise RuntimeError("All LLM providers are unavailable.") from fallback_exc

            full_text = "".join(text_parts)
            if not tool_use_blocks:
                final_text = full_text
                break

            new_assistant_content: list[dict] = []
            if full_text:
                new_assistant_content.append({"type": "text", "text": full_text})

            new_tool_results: list[dict] = []
            for tu in tool_use_blocks:
                tool_block: dict = {
                    "type": "tool_use", "id": tu.tool_use_id,
                    "name": tu.name, "input": tu.input,
                }
                if getattr(tu, "thought_signature", None):
                    tool_block["thought_signature"] = tu.thought_signature
                new_assistant_content.append(tool_block)

                tool_start = time.monotonic()
                result = await tool_registry.execute(
                    tu.name, tu.input, tool_context, available_tools=tools,
                )
                tool_duration_ms = int((time.monotonic() - tool_start) * 1000)

                output_str = json.dumps(result.output) if result.success else f"Error: {result.error}"
                new_tool_results.append({
                    "type": "tool_result", "tool_use_id": tu.tool_use_id,
                    "name": tu.name, "content": output_str[:10000],
                    "is_error": not result.success,
                })
                tool_calls_log.append({
                    "name": tu.name, "input": tu.input, "output": result.output,
                    "success": result.success, "duration_ms": tool_duration_ms,
                    "error": result.error,
                })

            messages.append({"role": "assistant", "content": new_assistant_content})
            messages.append({"role": "user", "content": new_tool_results})
            iteration += 1

        if not final_text and iteration >= max_iterations:
            final_text = "I've reached my maximum number of reasoning steps. Here's what I found so far."

    except (TimeoutError, asyncio.TimeoutError):
        exec_status = "error"
        error_message = f"LLM provider timed out after {LLM_STREAM_TIMEOUT}s"
        final_text = "I'm taking too long to respond. Please try again."
    except Exception as exc:
        exec_status = "error"
        error_message = str(exc)[:500]
        final_text = final_text or f"Something went wrong: {str(exc)[:200]}"
        logger.error("Agent %s resume invoke failed: %s", agent.id, exc, exc_info=True)

    elapsed_ms = int((time.monotonic() - start_time) * 1000)
    total_cost = calculate_cost(llm.PROVIDER, total_input_tokens, total_output_tokens)

    # 6. Update execution record
    now = datetime.utcnow()
    try:
        async with async_session() as session:
            db_exec = await session.get(AgentExecution, execution_id)
            if db_exec:
                db_exec.conversation_messages = json.dumps(messages, default=str)[:50000]
                db_exec.tools_called = json.dumps(tool_calls_log, default=str)[:50000]
                db_exec.response_text = final_text[:10000]
                db_exec.input_tokens = total_input_tokens
                db_exec.output_tokens = total_output_tokens
                db_exec.total_cost_usd = total_cost
                db_exec.duration_ms = (db_exec.duration_ms or 0) + elapsed_ms
                db_exec.num_tool_calls = len(tool_calls_log)
                db_exec.status = exec_status
                db_exec.error_message = error_message
                session.add(db_exec)

            db_agent = await session.get(Agent, agent.id)
            if db_agent:
                db_agent.status = "idle"
                db_agent.current_task = None

                prev_total = db_agent.total_executions
                is_success = 1 if exec_status == "success" else 0
                new_total = prev_total + 1
                prev_rate_fraction = (db_agent.success_rate / 100.0) if prev_total > 0 else 0.0
                db_agent.success_rate = round(
                    ((prev_rate_fraction * prev_total) + is_success) / new_total * 100.0, 1
                )

                db_agent.total_executions = new_total
                db_agent.total_cost_usd += total_cost
                current_month = now.strftime("%Y-%m")
                if db_agent.cost_month_key != current_month:
                    db_agent.cost_this_month = total_cost
                    db_agent.cost_month_key = current_month
                else:
                    db_agent.cost_this_month += total_cost
                session.add(db_agent)

            await session.commit()
    except Exception as save_exc:
        logger.error("Failed to save resumed execution: %s", save_exc)
        try:
            async with async_session() as session:
                db_agent = await session.get(Agent, agent.id)
                if db_agent:
                    db_agent.status = "idle"
                    db_agent.current_task = None
                    session.add(db_agent)
                    await session.commit()
        except Exception:
            logger.error("Failed to reset agent %s status to idle", agent.id)

    # Best-effort memory extraction
    if final_text and exec_status == "success":
        try:
            await extract_and_save_memory(agent.id, user_id, final_text, llm.chat)
        except Exception as exc:
            logger.warning("Memory extraction failed: %s", exc)

    return InvokeResult(
        response_text=final_text,
        tool_calls_log=tool_calls_log,
        input_tokens=total_input_tokens,
        output_tokens=total_output_tokens,
        total_cost_usd=total_cost,
        duration_ms=elapsed_ms,
        status=exec_status,
        error_message=error_message,
        execution_id=execution_id,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_alternating_roles(messages: list[dict]) -> list[dict]:
    """Merge consecutive same-role messages to satisfy Claude API requirement."""
    if not messages:
        return messages

    merged: list[dict] = [copy.deepcopy(messages[0])]
    for msg in messages[1:]:
        if msg["role"] == merged[-1]["role"]:
            # Merge content
            prev_content = merged[-1]["content"]
            new_content = msg["content"]
            if isinstance(prev_content, str) and isinstance(new_content, str):
                merged[-1] = {**merged[-1], "content": f"{prev_content}\n{new_content}"}
            else:
                # Can't merge complex content blocks; insert a separator
                merged.append({"role": "user" if msg["role"] == "assistant" else "assistant", "content": "(continued)"})
                merged.append(copy.deepcopy(msg))
        else:
            merged.append(copy.deepcopy(msg))

    # Ensure first message is "user" (required by Claude)
    if merged and merged[0]["role"] != "user":
        merged.insert(0, {"role": "user", "content": "(conversation context follows)"})

    return merged
