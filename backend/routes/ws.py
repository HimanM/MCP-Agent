import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from cart.manager import cart_manager
from cart.sync import cart_sync

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws/cart/{session_id}")
async def websocket_cart(ws: WebSocket, session_id: str):
    await cart_sync.connect(session_id, ws)
    try:
        cart = await cart_manager.get_cart(session_id)
        await ws.send_json({"type": "cart_initialized", "cart": cart})

        while True:
            data = await ws.receive_json()
            if data.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        cart_sync.disconnect(session_id, ws)
    except Exception as e:
        logger.exception("WebSocket error for session %s", session_id)
        cart_sync.disconnect(session_id, ws)
