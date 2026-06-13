from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class CartSync:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}

    async def connect(self, session_id: str, ws: WebSocket):
        await ws.accept()
        if session_id not in self.connections:
            self.connections[session_id] = set()
        self.connections[session_id].add(ws)
        logger.info("WebSocket connected for session %s", session_id)

    def disconnect(self, session_id: str, ws: WebSocket):
        if session_id in self.connections:
            self.connections[session_id].discard(ws)
            if not self.connections[session_id]:
                del self.connections[session_id]
        logger.info("WebSocket disconnected for session %s", session_id)

    async def broadcast(self, session_id: str, message: dict[str, Any]):
        if session_id not in self.connections:
            return
        dead: list[WebSocket] = []
        for ws in self.connections[session_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connections[session_id].discard(ws)


cart_sync = CartSync()
