import json
import logging
import uuid

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    history: list[dict] | None = None


async def _get_chat_fn():
    if settings.llm_provider == "groq" and settings.groq_api_key:
        from agent.groq_agent import chat
        return chat
    from agent.gemini_agent import chat
    return chat


@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    chat_fn = await _get_chat_fn()

    async def event_stream():
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"

        try:
            async for event in chat_fn(session_id, req.message, req.history or []):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.exception("Chat stream error")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
