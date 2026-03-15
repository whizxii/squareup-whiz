from app.websocket.manager import hub_manager
from app.core.db import async_session
from app.models.chat import Message, ChannelMember
from sqlmodel import select
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


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

    now = datetime.now(timezone.utc)
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
        session.add(message)

        # Increment reply count on parent if thread reply
        if thread_id:
            parent = await session.get(Message, thread_id)
            if parent:
                parent.reply_count = (parent.reply_count or 0) + 1
                session.add(parent)

        await session.commit()

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
        result = await session.exec(stmt)
        member = result.first()
        if member:
            member.last_read_message_id = message_id
            member.last_read_at = datetime.now(timezone.utc)
            session.add(member)
            await session.commit()


async def handle_office_move(user_id: str, data: dict):
    """Handle avatar movement."""
    x = data.get("x", 0)
    y = data.get("y", 0)
    await hub_manager.broadcast_all(
        {"type": "office.user_moved", "user_id": user_id, "x": x, "y": y},
        exclude=user_id,
    )


async def handle_office_status(user_id: str, data: dict):
    """Handle status update."""
    status = data.get("status", "online")
    status_message = data.get("status_message")
    await hub_manager.broadcast_all(
        {
            "type": "office.user_status",
            "user_id": user_id,
            "status": status,
            "status_message": status_message,
        },
        exclude=user_id,
    )
