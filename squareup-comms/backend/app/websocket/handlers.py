from __future__ import annotations

from app.websocket.manager import hub_manager
from app.core.db import async_session
from app.models.chat import Message, ChannelMember
from app.models.users import UserProfile
from app.core.events import EventBus
from sqlmodel import select
import asyncio
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Module-level EventBus reference — set by main.py lifespan via set_event_bus()
_event_bus: EventBus | None = None


def set_event_bus(bus: EventBus) -> None:
    """Called from main.py lifespan to give handlers access to the EventBus."""
    global _event_bus
    _event_bus = bus


def _log_task_exception(task: asyncio.Task) -> None:
    """Callback for asyncio.create_task — logs unhandled exceptions instead of swallowing them."""
    if task.cancelled():
        return
    exc = task.exception()
    if exc is not None:
        logger.error("Background task %s failed: %s", task.get_name(), exc, exc_info=exc)


async def handle_ws_message(user_id: str, data: dict):
    """Route incoming WebSocket messages by type."""
    msg_type = data.get("type", "")

    if msg_type == "ping":
        await hub_manager.send_to_user(user_id, {"type": "pong"})

    elif msg_type == "chat.send":
        await handle_chat_send(user_id, data)

    elif msg_type == "chat.typing":
        await handle_chat_typing(user_id, data)

    elif msg_type == "chat.read":
        await handle_chat_read(user_id, data)

    elif msg_type == "office.move":
        await handle_office_move(user_id, data)

    elif msg_type == "office.status":
        await handle_office_status(user_id, data)

    elif msg_type == "office.presence":
        await handle_office_presence(user_id, data)

    elif msg_type == "office.reaction":
        await handle_office_reaction(user_id, data)

    elif msg_type == "call.invite":
        await handle_call_invite(user_id, data)

    elif msg_type == "call.accept":
        await handle_call_accept(user_id, data)

    elif msg_type == "call.reject":
        await handle_call_reject(user_id, data)

    else:
        logger.warning(f"Unknown message type: {msg_type}")


async def handle_chat_send(user_id: str, data: dict):
    """Handle incoming chat message via WebSocket — save to DB and broadcast."""
    channel_id = data.get("channel_id")
    content = data.get("content", "")
    content_html = data.get("content_html")
    thread_id = data.get("thread_id")
    mentions = data.get("mentions")

    if not channel_id or not content.strip():
        return

    now = datetime.utcnow()
    message = Message(
        id=str(uuid.uuid4()),
        channel_id=channel_id,
        sender_id=user_id,
        sender_type="user",
        content=content,
        content_html=content_html,
        thread_id=thread_id,
        mentions=str(mentions) if mentions else "[]",
        created_at=now,
    )

    # Save to database
    async with async_session() as session:
        # Check if mentions contains an agent
        agent_mentions = []
        if mentions:
            from app.models.agents import Agent
            from sqlmodel import select
            
            for m in mentions:
                if m.get("type") == "agent":
                    agent_id = m.get("id")
                    if agent_id:
                        agent_stmt = select(Agent).where(Agent.id == agent_id, Agent.active == True)
                        result = await session.execute(agent_stmt)
                        agent = result.scalar_one_or_none()
                        if agent:
                            agent_mentions.append(agent)

        session.add(message)

        # Increment reply count on parent if thread reply
        if thread_id:
            parent = await session.get(Message, thread_id)
            if parent:
                parent.reply_count = (parent.reply_count or 0) + 1
                session.add(parent)

        await session.commit()

    # Emit event for Chat Intelligence pipeline (async — non-blocking)
    if _event_bus is not None:
        task = asyncio.create_task(
            _event_bus.emit(
                "chat.message_sent",
                {
                    "message_id": message.id,
                    "channel_id": channel_id,
                    "sender_id": user_id,
                    "content": content,
                    "thread_id": thread_id,
                },
            ),
            name=f"event_bus_emit:{message.id}",
        )
        task.add_done_callback(_log_task_exception)

    # Broadcast to all connected users (simple for 3-person team)
    broadcast_data = {
        "type": "chat.message",
        "message": {
            "id": message.id,
            "channel_id": message.channel_id,
            "sender_id": message.sender_id,
            "sender_type": message.sender_type,
            "content": message.content,
            "content_html": message.content_html,
            "thread_id": message.thread_id,
            "reply_count": 0,
            "edited": False,
            "pinned": False,
            "created_at": now.isoformat(),
            "attachments": [],
            "mentions": mentions or [],
            "reactions": [],
        },
    }

    await hub_manager.broadcast_all(broadcast_data, exclude=user_id)

    # Send confirmation back to sender
    await hub_manager.send_to_user(user_id, broadcast_data)

    # If agents were mentioned, route to ReAct engine in the background
    triggered_agent_ids: set[str] = set()
    if agent_mentions:
        from app.services.agent_engine import run_agent

        for agent in agent_mentions:
            triggered_agent_ids.add(agent.id)
            task = asyncio.create_task(
                run_agent(
                    agent_id=agent.id,
                    trigger_message_id=message.id,
                    channel_id=channel_id,
                    user_id=user_id,
                    content=content,
                ),
                name=f"run_agent:{agent.id}:{message.id}",
            )
            task.add_done_callback(_log_task_exception)

    # Auto-respond agents: trigger agents assigned to this channel with trigger_mode="auto"
    async with async_session() as session:
        from app.models.agents import Agent
        from app.models.chat import Channel
        from sqlmodel import select

        channel = await session.get(Channel, channel_id)
        if channel and channel.agent_id and channel.agent_id not in triggered_agent_ids:
            agent_stmt = select(Agent).where(
                Agent.id == channel.agent_id,
                Agent.active == True,  # noqa: E712
                Agent.trigger_mode == "auto",
            )
            result = await session.execute(agent_stmt)
            auto_agent = result.scalar_one_or_none()
            if auto_agent:
                from app.services.agent_engine import run_agent

                task = asyncio.create_task(
                    run_agent(
                        agent_id=auto_agent.id,
                        trigger_message_id=message.id,
                        channel_id=channel_id,
                        user_id=user_id,
                        content=content,
                    ),
                    name=f"run_agent_auto:{auto_agent.id}:{message.id}",
                )
                task.add_done_callback(_log_task_exception)


async def handle_chat_typing(user_id: str, data: dict):
    """Handle typing indicator — broadcast to all other users."""
    channel_id = data.get("channel_id")
    is_typing = data.get("is_typing", False)
    display_name = data.get("display_name", user_id)

    if channel_id:
        await hub_manager.broadcast_all(
            {
                "type": "chat.typing",
                "channel_id": channel_id,
                "user_id": user_id,
                "display_name": display_name,
                "is_typing": is_typing,
            },
            exclude=user_id,
        )


async def handle_chat_read(user_id: str, data: dict):
    """Handle read receipt — update last_read for the user in the channel."""
    channel_id = data.get("channel_id")
    message_id = data.get("message_id")

    if not channel_id or not message_id:
        return

    async with async_session() as session:
        stmt = select(ChannelMember).where(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == user_id,
        )
        result = await session.execute(stmt)
        member = result.scalars().first()
        if member:
            member.last_read_message_id = message_id
            member.last_read_at = datetime.utcnow()
            session.add(member)
            await session.commit()


async def handle_office_move(user_id: str, data: dict):
    """Handle avatar movement — persist position and broadcast."""
    x = data.get("x", 0)
    y = data.get("y", 0)
    direction = data.get("direction", "down")

    async with async_session() as session:
        profile = await session.get(UserProfile, user_id)
        if profile is not None:
            profile.office_x = x
            profile.office_y = y
            session.add(profile)
            await session.commit()

    await hub_manager.broadcast_all(
        {"type": "office.user_moved", "user_id": user_id, "x": x, "y": y, "direction": direction},
        exclude=user_id,
    )


async def handle_office_status(user_id: str, data: dict):
    """Handle status update — persist status and broadcast."""
    status = data.get("status", "online")
    status_message = data.get("status_message")

    async with async_session() as session:
        profile = await session.get(UserProfile, user_id)
        if profile is not None:
            profile.status = status
            profile.status_message = status_message
            session.add(profile)
            await session.commit()

    await hub_manager.broadcast_all(
        {
            "type": "office.user_status",
            "user_id": user_id,
            "status": status,
            "status_message": status_message,
        },
        exclude=user_id,
    )


async def handle_office_presence(user_id: str, data: dict):
    """Handle idle/active presence broadcast — persist status and broadcast to others."""
    status = data.get("status", "online")
    status_message = data.get("status_message")

    try:
        async with async_session() as session:
            profile = await session.get(UserProfile, user_id)
            if profile is not None:
                profile.status = status
                if status_message is not None:
                    profile.status_message = status_message
                session.add(profile)
                await session.commit()
    except Exception:
        logger.warning("Failed to persist presence for %s", user_id, exc_info=True)

    await hub_manager.broadcast_all(
        {
            "type": "office.presence_updated",
            "user_id": user_id,
            "status": status,
            "status_message": status_message,
        },
        exclude=user_id,
    )


async def handle_office_reaction(user_id: str, data: dict):
    """Handle emoji reaction — broadcast to all other users."""
    emoji = data.get("emoji", "")
    if not emoji:
        return

    await hub_manager.broadcast_all(
        {
            "type": "office.reaction",
            "user_id": user_id,
            "emoji": emoji,
        },
        exclude=user_id,
    )


# ---------------------------------------------------------------------------
# Call signaling
# ---------------------------------------------------------------------------


async def handle_call_invite(user_id: str, data: dict):
    """Handle call invite — forward to target user."""
    target_user_id = data.get("target_user_id")
    room_name = data.get("room_name")

    if not target_user_id or not room_name:
        return

    # Look up sender display name
    display_name = user_id
    async with async_session() as session:
        profile = await session.get(UserProfile, user_id)
        if profile is not None:
            display_name = profile.display_name or profile.email or user_id

    await hub_manager.send_to_user(
        target_user_id,
        {
            "type": "call.invite",
            "from_user_id": user_id,
            "from_name": display_name,
            "room_name": room_name,
        },
    )


async def handle_call_accept(user_id: str, data: dict):
    """Handle call accept — notify the inviter that the call was accepted."""
    target_user_id = data.get("target_user_id")
    room_name = data.get("room_name")

    if not target_user_id or not room_name:
        return

    await hub_manager.send_to_user(
        target_user_id,
        {
            "type": "call.accepted",
            "from_user_id": user_id,
            "room_name": room_name,
        },
    )


async def handle_call_reject(user_id: str, data: dict):
    """Handle call reject — notify the inviter that the call was declined."""
    target_user_id = data.get("target_user_id")
    room_name = data.get("room_name")

    if not target_user_id or not room_name:
        return

    await hub_manager.send_to_user(
        target_user_id,
        {
            "type": "call.rejected",
            "from_user_id": user_id,
            "room_name": room_name,
        },
    )
