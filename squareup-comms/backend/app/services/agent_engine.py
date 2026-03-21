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
    resolve_model_for_client,
)
from app.services.tools import tool_registry
from app.services.tools.registry import ToolContext
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# WebSocket broadcast helpers
# ---------------------------------------------------------------------------

async def _broadcast(_channel_id: str, event: dict) -> None:
    """Broadcast an event to all WebSocket clients.

    TODO: scope to channel once hub_manager supports channel-targeted broadcast.
    """
    await hub_manager.broadcast_all(event)


async def _broadcast_status(channel_id: str, agent_id: str, status: str) -> None:
    await _broadcast(channel_id, {
        "type": "agent.status",
        "agent_id": agent_id,
        "channel_id": channel_id,
        "status": status,
    })


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

    await _broadcast_status(channel_id, agent.id, "thinking")

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
        history = await load_conversation_context(channel_id, agent.id, limit=20)
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

            # Stream LLM response (with fallback on provider failure)
            try:
                async with _async_timeout(LLM_STREAM_TIMEOUT):
                    async for event in llm.stream_with_tools(
                        system=system_prompt,
                        messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        model=resolved_model,
                        max_tokens=4096,
                        temperature=temperature,
                    ):
                        if isinstance(event, TextDelta):
                            text_parts.append(event.text)
                            await _broadcast_text_delta(
                                channel_id, agent.id, stream_message_id, event.text,
                            )
                        elif isinstance(event, ToolUseComplete):
                            tool_use_blocks.append(event)
                        elif isinstance(event, UsageUpdate):
                            total_input_tokens += event.input_tokens
                            total_output_tokens += event.output_tokens
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
                await _broadcast_status(channel_id, agent.id, "thinking")
                llm = fallback
                resolved_model = fallback.DEFAULT_MODEL
                text_parts = []
                tool_use_blocks = []
                try:
                    async with _async_timeout(LLM_STREAM_TIMEOUT):
                        async for event in llm.stream_with_tools(
                            system=system_prompt,
                            messages=messages,
                            tools=tool_schemas if tool_schemas else None,
                            model=resolved_model,
                            max_tokens=4096,
                            temperature=temperature,
                        ):
                            if isinstance(event, TextDelta):
                                text_parts.append(event.text)
                                await _broadcast_text_delta(
                                    channel_id, agent.id, stream_message_id, event.text,
                                )
                            elif isinstance(event, ToolUseComplete):
                                tool_use_blocks.append(event)
                            elif isinstance(event, UsageUpdate):
                                total_input_tokens += event.input_tokens
                                total_output_tokens += event.output_tokens
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

            # 4. Execute tools
            await _broadcast_status(channel_id, agent.id, "tool_calling")

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

                tool_start = time.monotonic()
                result = await tool_registry.execute(
                    tu.name, tu.input, tool_context, available_tools=tools,
                )
                tool_duration_ms = int((time.monotonic() - tool_start) * 1000)

                output_str = json.dumps(result.output) if result.success else f"Error: {result.error}"
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
                    "input": tu.input,
                    "output": result.output,
                    "success": result.success,
                    "duration_ms": tool_duration_ms,
                    "error": result.error,
                })

            # Feed tool results back into conversation
            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})

            # Continue to thinking for next iteration
            await _broadcast_status(channel_id, agent.id, "thinking")
            iteration += 1

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
    status: str  # "success" | "error"
    error_message: str | None


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

    # 2. Build context — no channel context for direct invoke (chat panel)
    try:
        memory_facts = await load_agent_memory(agent.id, user_id)
        system_prompt = build_system_prompt(agent, memory_facts)
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

            # Stream LLM response (with fallback on provider failure)
            try:
                async with _async_timeout(LLM_STREAM_TIMEOUT):
                    async for event in llm.stream_with_tools(
                        system=system_prompt,
                        messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        model=resolved_model,
                        max_tokens=4096,
                        temperature=temperature,
                    ):
                        if isinstance(event, TextDelta):
                            text_parts.append(event.text)
                        elif isinstance(event, ToolUseComplete):
                            tool_use_blocks.append(event)
                        elif isinstance(event, UsageUpdate):
                            total_input_tokens += event.input_tokens
                            total_output_tokens += event.output_tokens
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
                    "Agent %s sync LLM (%s) failed on iteration %d: %s. Switching to fallback (%s).",
                    agent.id, llm.PROVIDER, iteration, stream_exc, fallback.PROVIDER,
                )
                llm = fallback
                resolved_model = fallback.DEFAULT_MODEL
                text_parts = []
                tool_use_blocks = []
                try:
                    async with _async_timeout(LLM_STREAM_TIMEOUT):
                        async for event in llm.stream_with_tools(
                            system=system_prompt,
                            messages=messages,
                            tools=tool_schemas if tool_schemas else None,
                            model=resolved_model,
                            max_tokens=4096,
                            temperature=temperature,
                        ):
                            if isinstance(event, TextDelta):
                                text_parts.append(event.text)
                            elif isinstance(event, ToolUseComplete):
                                tool_use_blocks.append(event)
                            elif isinstance(event, UsageUpdate):
                                total_input_tokens += event.input_tokens
                                total_output_tokens += event.output_tokens
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
