from fastapi import WebSocket
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)


class HubConnectionManager:
    """Multiplexed WebSocket connection manager with room-based broadcasting."""

    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # room_id -> set of user_ids
        self.rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected. Total: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        # Remove from all rooms
        for room_id in list(self.rooms.keys()):
            self.rooms[room_id].discard(user_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        logger.info(f"User {user_id} disconnected. Total: {len(self.active_connections)}")

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
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude: str = None):
        user_ids = self.rooms.get(room_id, set())
        for uid in user_ids:
            if uid != exclude:
                await self.send_to_user(uid, message)

    async def broadcast_all(self, message: dict, exclude: str = None):
        for uid in list(self.active_connections.keys()):
            if uid != exclude:
                await self.send_to_user(uid, message)

    def get_online_users(self) -> list:
        return list(self.active_connections.keys())


# Singleton
hub_manager = HubConnectionManager()
