"""Tests for /api/messages endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Message
from tests.conftest import TEST_USER_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_channel(client: AsyncClient, name: str = "msg-ch") -> str:
    """Create a channel and return its ID."""
    resp = await client.post("/api/channels/", json={"name": name, "type": "public"})
    return resp.json()["id"]


async def _send_message(
    client: AsyncClient,
    channel_id: str,
    content: str = "Hello",
    **kwargs,
) -> dict:
    """Send a message and return the response JSON."""
    payload = {"channel_id": channel_id, "content": content, **kwargs}
    resp = await client.post("/api/messages/", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/messages/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_message(client: AsyncClient):
    """Send a message returns 201."""
    ch_id = await _create_channel(client)
    data = await _send_message(client, ch_id, content="Hi there!")
    assert data["content"] == "Hi there!"
    assert data["sender_id"] == TEST_USER_ID
    assert data["channel_id"] == ch_id
    assert data["reply_count"] == 0


@pytest.mark.asyncio
async def test_send_thread_reply_increments_reply_count(client: AsyncClient):
    """Thread reply increments parent reply_count."""
    ch_id = await _create_channel(client, name="thread-ch")
    parent = await _send_message(client, ch_id, content="Parent")

    await _send_message(client, ch_id, content="Reply 1", thread_id=parent["id"])
    await _send_message(client, ch_id, content="Reply 2", thread_id=parent["id"])

    # Fetch parent to check reply count
    resp = await client.get(f"/api/messages/{parent['id']}")
    assert resp.status_code == 200
    assert resp.json()["reply_count"] == 2


# ---------------------------------------------------------------------------
# GET /api/messages/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_messages(client: AsyncClient):
    """List messages returns only top-level messages."""
    ch_id = await _create_channel(client, name="list-ch")
    parent = await _send_message(client, ch_id, content="Top level")
    await _send_message(client, ch_id, content="Thread reply", thread_id=parent["id"])

    resp = await client.get("/api/messages/", params={"channel_id": ch_id})
    assert resp.status_code == 200
    data = resp.json()
    # Only the top-level message should appear (thread replies excluded)
    assert len(data["messages"]) == 1
    assert data["messages"][0]["content"] == "Top level"


@pytest.mark.asyncio
async def test_list_messages_pagination(client: AsyncClient):
    """Pagination with limit returns correct has_more flag."""
    ch_id = await _create_channel(client, name="page-ch")
    for i in range(5):
        await _send_message(client, ch_id, content=f"Msg {i}")

    resp = await client.get("/api/messages/", params={"channel_id": ch_id, "limit": 3})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["messages"]) == 3
    assert data["has_more"] is True


# ---------------------------------------------------------------------------
# GET /api/messages/threads/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_thread_replies(client: AsyncClient):
    """Thread replies endpoint returns replies to a parent message."""
    ch_id = await _create_channel(client, name="thread-replies-ch")
    parent = await _send_message(client, ch_id, content="Parent")
    await _send_message(client, ch_id, content="R1", thread_id=parent["id"])
    await _send_message(client, ch_id, content="R2", thread_id=parent["id"])

    resp = await client.get(f"/api/messages/threads/{parent['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["messages"]) == 2


# ---------------------------------------------------------------------------
# GET /api/messages/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_message_by_id(client: AsyncClient):
    """Get a single message by ID."""
    ch_id = await _create_channel(client, name="get-ch")
    msg = await _send_message(client, ch_id, content="Fetch me")
    resp = await client.get(f"/api/messages/{msg['id']}")
    assert resp.status_code == 200
    assert resp.json()["content"] == "Fetch me"


@pytest.mark.asyncio
async def test_get_message_not_found(client: AsyncClient):
    """Get non-existent message returns 404."""
    resp = await client.get("/api/messages/fake-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/messages/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_edit_own_message(client: AsyncClient):
    """Editing own message returns updated content and edited=True."""
    ch_id = await _create_channel(client, name="edit-ch")
    msg = await _send_message(client, ch_id, content="Original")

    resp = await client.put(
        f"/api/messages/{msg['id']}",
        json={"content": "Edited"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] == "Edited"
    assert data["edited"] is True


@pytest.mark.asyncio
async def test_edit_other_user_message_returns_403(
    client: AsyncClient,
    session: AsyncSession,
):
    """Editing another user's message returns 403."""
    ch_id = await _create_channel(client, name="edit403-ch")

    # Insert a message directly from a different sender
    msg = Message(
        id="other-user-msg",
        channel_id=ch_id,
        sender_id="other-user-999",
        sender_type="user",
        content="Not yours",
    )
    session.add(msg)
    await session.commit()

    resp = await client.put(
        "/api/messages/other-user-msg",
        json={"content": "Hacked"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# DELETE /api/messages/{id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_own_message(client: AsyncClient):
    """Deleting own message returns 204."""
    ch_id = await _create_channel(client, name="del-ch")
    msg = await _send_message(client, ch_id, content="Goodbye")
    resp = await client.delete(f"/api/messages/{msg['id']}")
    assert resp.status_code == 204

    # Confirm gone
    resp = await client.get(f"/api/messages/{msg['id']}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_thread_reply_decrements_parent(client: AsyncClient):
    """Deleting a thread reply decrements parent reply_count."""
    ch_id = await _create_channel(client, name="del-thread-ch")
    parent = await _send_message(client, ch_id, content="Parent")
    reply = await _send_message(client, ch_id, content="Reply", thread_id=parent["id"])

    # Delete the reply
    resp = await client.delete(f"/api/messages/{reply['id']}")
    assert resp.status_code == 204

    # Check parent reply_count
    resp = await client.get(f"/api/messages/{parent['id']}")
    assert resp.json()["reply_count"] == 0


# ---------------------------------------------------------------------------
# POST /api/messages/{id}/reactions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_reaction(client: AsyncClient):
    """Adding a reaction returns 201."""
    ch_id = await _create_channel(client, name="react-ch")
    msg = await _send_message(client, ch_id, content="React to me")

    resp = await client.post(
        f"/api/messages/{msg['id']}/reactions",
        json={"emoji": "👍"},
    )
    assert resp.status_code == 201
    assert resp.json()["emoji"] == "👍"


@pytest.mark.asyncio
async def test_add_duplicate_reaction_returns_409(client: AsyncClient):
    """Adding the same emoji reaction twice returns 409."""
    ch_id = await _create_channel(client, name="dup-react-ch")
    msg = await _send_message(client, ch_id, content="Double react")

    await client.post(
        f"/api/messages/{msg['id']}/reactions",
        json={"emoji": "🔥"},
    )
    resp = await client.post(
        f"/api/messages/{msg['id']}/reactions",
        json={"emoji": "🔥"},
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# DELETE /api/messages/{id}/reactions/{emoji}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_remove_reaction(client: AsyncClient):
    """Removing a reaction returns 204."""
    ch_id = await _create_channel(client, name="unreact-ch")
    msg = await _send_message(client, ch_id, content="Unreact me")

    await client.post(
        f"/api/messages/{msg['id']}/reactions",
        json={"emoji": "❤️"},
    )
    resp = await client.delete(f"/api/messages/{msg['id']}/reactions/❤️")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_remove_nonexistent_reaction_returns_404(client: AsyncClient):
    """Removing a reaction that doesn't exist returns 404."""
    ch_id = await _create_channel(client, name="no-react-ch")
    msg = await _send_message(client, ch_id, content="Nothing here")

    resp = await client.delete(f"/api/messages/{msg['id']}/reactions/🤷")
    assert resp.status_code == 404
