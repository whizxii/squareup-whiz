import asyncio
import json
import logging
import time
import uuid
from datetime import datetime

from sqlmodel import select

from app.core.config import settings
from app.core.db import async_session
from app.models.agents import Agent, AgentExecution
from app.models.chat import Message
from app.models.users import UserProfile
from app.services.llm_service import llm_service
from app.websocket.manager import hub_manager

logger = logging.getLogger(__name__)


async def execute_agent_for_message(
    agent_id: str,
    trigger_message_id: str,
    channel_id: str,
    user_id: str,
    content: str,
):
    """
    Background task triggered by the WebSocket when an agent is mentioned.
    Executes the LLM and streams/broadcasts the response back to the channel.
    """
    if not llm_service.available:
        logger.warning("LLM service unavailable. Cannot execute agent.")
        return

    start_time = time.monotonic()
    
    async with async_session() as session:
        agent = await session.get(Agent, agent_id)
        if not agent or not agent.active:
            return
            
        # 1. Update status to working
        agent.status = "working"
        agent.current_task = f"Replying in channel"
        session.add(agent)
        await session.commit()
        
        # Tell the channel the agent is thinking
        await hub_manager.broadcast_all({
            "type": "agent.status",
            "agent_id": agent.id,
            "channel_id": channel_id,
            "status": "working"
        })

    system_prompt = (
        f"{agent.system_prompt}\n\n"
        "UI INSTRUCTIONS:\n"
        "If you want to render an interactive widget in the chat instead of raw text, "
        "you MUST return ONLY a valid JSON object matching this schema:\n"
        "{\"widget_type\": \"crm_card\" | \"calendar_card\" | \"github_issue\", \"data\": { ... }}\n"
        "Otherwise, respond with normal markdown text."
    )

    # 2. Build brief context (just the system prompt and the user's triggering message for now)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": content},
    ]

    exec_status = "success"
    error_message: str | None = None
    response_text = ""
    input_tokens = 0
    output_tokens = 0

    try:
        # For a 15/10 app, this should ideally be a stream
        # To keep it simple for this file we'll do an awaited complete response,
        # but the UI can still handle it cleanly via websocket injection
        response = await llm_service.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        response_text = response.choices[0].message.content or ""
        input_tokens = getattr(response.usage, "prompt_tokens", 0)
        output_tokens = getattr(response.usage, "completion_tokens", 0)

    except Exception as exc:
        exec_status = "error"
        error_message = str(exc)[:500]
        response_text = "I encountered an error trying to process that."
        logger.error(f"Agent execution failed: {exc}")

    elapsed_ms = int((time.monotonic() - start_time) * 1000)
    total_cost = (input_tokens * 0.000003) + (output_tokens * 0.000015)

    # 3. Create the agent's response message in the DB
    now = datetime.utcnow()
    agent_message = Message(
        id=str(uuid.uuid4()),
        channel_id=channel_id,
        sender_id=agent.id,
        sender_type="agent",
        content=response_text,
        thread_id=None, # TBD: handle threading
        created_at=now,
    )

    async with async_session() as session:
        session.add(agent_message)
        
        # 4. Create execution record
        execution = AgentExecution(
            agent_id=agent.id,
            trigger_message_id=trigger_message_id,
            trigger_channel_id=channel_id,
            conversation_messages=json.dumps(messages),
            tools_called="[]",
            response_text=response_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_cost_usd=total_cost,
            duration_ms=elapsed_ms,
            num_tool_calls=0,
            status=exec_status,
            error_message=error_message,
        )
        session.add(execution)
        
        # Set agent back to idle
        db_agent = await session.get(Agent, agent.id)
        if db_agent:
            db_agent.status = "idle"
            db_agent.current_task = None
            db_agent.total_executions += 1
            db_agent.total_cost_usd += total_cost
            session.add(db_agent)
            
        await session.commit()

    # Check if the response_text is a JSON widget
    content_html = None
    try:
        if response_text.strip().startswith("{") and response_text.strip().endswith("}"):
            widget_data = json.loads(response_text)
            if "widget_type" in widget_data and "data" in widget_data:
                # Store the raw JSON as the message content, frontend will parse it
                pass
    except json.JSONDecodeError:
        pass

    # 5. Broadcast the new message back to the channel
    await hub_manager.broadcast_all({
        "type": "chat.message",
        "message": {
            "id": agent_message.id,
            "channel_id": agent_message.channel_id,
            "sender_id": agent_message.sender_id,
            "sender_type": agent_message.sender_type,
            "content": agent_message.content,
            "content_html": content_html,
            "thread_id": agent_message.thread_id,
            "reply_count": 0,
            "edited": False,
            "pinned": False,
            "created_at": now.isoformat(),
            "attachments": [],
            "mentions": [],
            "reactions": [],
            "sender_name": agent.name, # Include name so frontend can render directly
        },
    })
    
    # Send status back to idle
    await hub_manager.broadcast_all({
        "type": "agent.status",
        "agent_id": agent.id,
        "channel_id": channel_id,
        "status": "idle"
    })
