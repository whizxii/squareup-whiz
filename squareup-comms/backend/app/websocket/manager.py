from __future__ import annotations

from fastapi import WebSocket
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)


class HubConnectionManager:
    """Multiplexed WebSocket connection manager with room-based broadcasting.

    Supports multiple simultaneous connections per user (e.g. multiple browser
    tabs or frontend components each opening their own WebSocket).
    """

    def __init__(self):
        # user_id -> list of WebSocket connections
        self.active_connections: Dict[str, list[WebSocket]] = {}
        # room_id -> set of user_ids
        self.rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        total = sum(len(conns) for conns in self.active_connections.values())
        logger.info(
            "User %s connected (connections: %d). Total sockets: %d, users: %d",
            user_id, len(self.active_connections[user_id]), total, len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket, user_id: str):
        conns = self.active_connections.get(user_id, [])
        try:
            conns.remove(websocket)
        except ValueError:
            pass  # already removed by a concurrent call
        if not conns:
            self.active_connections.pop(user_id, None)
            # Remove user from all rooms when last connection closes
            for room_id in list(self.rooms.keys()):
                self.rooms[room_id].discard(user_id)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
        total = sum(len(c) for c in self.active_connections.values())
        logger.info(
            "User %s disconnected a socket. Total sockets: %d, users: %d",
            user_id, total, len(self.active_connections),
        )

    def join_room(self, user_id: str, room_id: str):
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(user_id)

    def leave_room(self, user_id: str, room_id: str):
        if room_id in self.rooms:
            self.rooms[room_id].discard(user_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def send_to_user(self, user_id: str, message: dict):
        conns = list(self.active_connections.get(user_id, []))
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception as exc:
                logger.warning(
                    "WebSocket send failed for user %s, removing socket: %s",
                    user_id, exc,
                )
                self.disconnect(ws, user_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude: str | None = None):
        user_ids = self.rooms.get(room_id, set())
        for uid in user_ids:
            if uid != exclude:
                await self.send_to_user(uid, message)

    async def broadcast_all(self, message: dict, exclude: str | None = None):
        for uid in list(self.active_connections.keys()):
            if uid != exclude:
                await self.send_to_user(uid, message)

    def get_online_users(self) -> list:
        return list(self.active_connections.keys())


# Singleton
hub_manager = HubConnectionManager()
