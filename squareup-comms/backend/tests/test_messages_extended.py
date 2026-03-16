"""Extended tests for /api/messages — covering cursor pagination, attachments, mentions, content_html."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Message
from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_channel(client: AsyncClient, name: str = "ext-ch") -> str:
    resp = await client.post("/api/channels/", json={"name": name, "type": "public"})
    return resp.json()["id"]


async def _send_message(client: AsyncClient, channel_id: str, content: str = "Hi", **kwargs) -> dict:
    payload = {"channel_id": channel_id, "content": content, **kwargs}
    resp = await client.post("/api/messages/", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# Cursor-based pagination (before_id)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_messages_with_before_id(client: AsyncClient):
    """Passing before_id fetches older messages."""
    ch_id = await _create_channel(client, "cursor-ch")
    msgs = []
    for i in range(5):
        m = await _send_message(client, ch_id, content=f"Msg {i}")
        msgs.append(m)

    # Use the last message as cursor — should return older messages
    resp = await client.get(
        "/api/messages/",
        params={"channel_id": ch_id, "before_id": msgs[-1]["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Should have messages older than the last one
    returned_ids = [m["id"] for m in data["messages"]]
    assert msgs[-1]["id"] not in returned_ids


@pytest.mark.asyncio
async def test_list_messages_before_id_invalid(client: AsyncClient):
    """before_id that doesn't exist returns all messages (graceful fallback)."""
    ch_id = await _create_channel(client, "invalid-cursor-ch")
    await _send_message(client, ch_id, content="msg1")

    resp = await client.get(
        "/api/messages/",
        params={"channel_id": ch_id, "before_id": "nonexistent-id"},
    )
    assert resp.status_code == 200
    # Should still return messages (cursor_msg is None, no filter applied)
    assert len(resp.json()["messages"]) >= 1


@pytest.mark.asyncio
async def test_list_messages_has_more_false(client: AsyncClient):
    """When all messages fit in one page, has_more is False."""
    ch_id = await _create_channel(client, "no-more-ch")
    await _send_message(client, ch_id, content="Only one")

    resp = await client.get(
        "/api/messages/",
        params={"channel_id": ch_id, "limit": 50},
    )
    assert resp.status_code == 200
    assert resp.json()["has_more"] is False


# ---------------------------------------------------------------------------
# Attachments and mentions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_message_with_attachments(client: AsyncClient):
    """Sending a message with attachments stores and returns them."""
    ch_id = await _create_channel(client, "attach-ch")
    data = await _send_message(
        client, ch_id,
        content="See attached",
        attachments=["file1.pdf", "file2.png"],
    )
    assert data["attachments"] == ["file1.pdf", "file2.png"]


@pytest.mark.asyncio
async def test_send_message_with_mentions(client: AsyncClient):
    """Sending a message with mentions stores and returns them."""
    ch_id = await _create_channel(client, "mention-ch")
    data = await _send_message(
        client, ch_id,
        content="Hey @alice!",
        mentions=["user-alice", "user-bob"],
    )
    assert data["mentions"] == ["user-alice", "user-bob"]


@pytest.mark.asyncio
async def test_send_message_with_content_html(client: AsyncClient):
    """Sending a message with content_html stores it."""
    ch_id = await _create_channel(client, "html-ch")
    resp = await client.post("/api/messages/", json={
        "channel_id": ch_id,
        "content": "Bold text",
        "content_html": "<strong>Bold text</strong>",
    })
    assert resp.status_code == 201
    assert resp.json()["content_html"] == "<strong>Bold text</strong>"


# ---------------------------------------------------------------------------
# Edit with content_html
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_edit_message_content_html(client: AsyncClient):
    """Editing content_html field works."""
    ch_id = await _create_channel(client, "edit-html-ch")
    msg = await _send_message(client, ch_id, content="Original")

    resp = await client.put(
        f"/api/messages/{msg['id']}",
        json={"content_html": "<em>Updated</em>"},
    )
    assert resp.status_code == 200
    assert resp.json()["content_html"] == "<em>Updated</em>"
    assert resp.json()["edited"] is True


# ---------------------------------------------------------------------------
# Delete with reactions (cascading)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_message_with_reactions(client: AsyncClient):
    """Deleting a message also cleans up its reactions."""
    ch_id = await _create_channel(client, "del-react-ch")
    msg = await _send_message(client, ch_id, content="React then delete")

    # Add a reaction
    await client.post(
        f"/api/messages/{msg['id']}/reactions",
        json={"emoji": "thumbsup"},
    )

    # Delete the message
    resp = await client.delete(f"/api/messages/{msg['id']}")
    assert resp.status_code == 204

    # Message should be gone
    resp = await client.get(f"/api/messages/{msg['id']}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete another user's message (403)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_other_user_message_returns_403(
    client: AsyncClient,
    session: AsyncSession,
):
    """Deleting another user's message returns 403."""
    ch_id = await _create_channel(client, "del403-ch")
    msg = Message(
        id="other-del-msg",
        channel_id=ch_id,
        sender_id="other-user-999",
        sender_type="user",
        content="Not yours",
    )
    session.add(msg)
    await session.commit()

    resp = await client.delete("/api/messages/other-del-msg")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Thread replies with cursor pagination
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_thread_replies_with_before_id(client: AsyncClient):
    """Thread replies endpoint supports before_id cursor."""
    ch_id = await _create_channel(client, "thread-cursor-ch")
    parent = await _send_message(client, ch_id, content="Thread parent")

    replies = []
    for i in range(3):
        r = await _send_message(client, ch_id, content=f"Reply {i}", thread_id=parent["id"])
        replies.append(r)

    # Fetch with before_id set to last reply
    resp = await client.get(
        f"/api/messages/threads/{parent['id']}",
        params={"before_id": replies[-1]["id"]},
    )
    assert resp.status_code == 200
    returned_ids = [m["id"] for m in resp.json()["messages"]]
    assert replies[-1]["id"] not in returned_ids


@pytest.mark.asyncio
async def test_thread_replies_parent_not_found(client: AsyncClient):
    """Thread replies for nonexistent parent returns 404."""
    resp = await client.get("/api/messages/threads/nonexistent-parent")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Channel members edge cases (coverage for channels.py)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_member_channel_not_found(client: AsyncClient):
    """Adding member to nonexistent channel returns 404."""
    resp = await client.post(
        "/api/channels/nonexistent-ch/members",
        json={"user_id": "user-x"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_members_channel_not_found(client: AsyncClient):
    """Listing members of nonexistent channel returns 404."""
    resp = await client.get("/api/channels/nonexistent-ch/members")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Message listing with reactions in response
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_messages_includes_reactions(client: AsyncClient):
    """Listed messages include their reactions."""
    ch_id = await _create_channel(client, "react-list-ch")
    msg = await _send_message(client, ch_id, content="React and list")

    await client.post(
        f"/api/messages/{msg['id']}/reactions",
        json={"emoji": "fire"},
    )

    resp = await client.get("/api/messages/", params={"channel_id": ch_id})
    assert resp.status_code == 200
    messages = resp.json()["messages"]
    assert len(messages) == 1
    assert len(messages[0]["reactions"]) == 1
    assert messages[0]["reactions"][0]["emoji"] == "fire"
