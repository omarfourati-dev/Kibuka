from __future__ import annotations

import contextlib

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info("WebSocket connected: user={}", user_id)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        if user_id in self._connections and websocket in self._connections[user_id]:
            self._connections[user_id].remove(websocket)
        logger.info("WebSocket disconnected: user={}", user_id)

    async def send_to_user(self, user_id: str, message: dict[str, object]) -> None:
        for ws in self._connections.get(user_id, []):
            with contextlib.suppress(Exception):
                await ws.send_json(message)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, user_id: str) -> None:
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
