from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.provider_selector import resolve_provider_config
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    history: list[dict] | None = None


async def _get_chat_fn(message_text: str):
    provider = resolve_provider_config(message_text).provider

    async def unavailable_chat(session_id: str, user_text: str, history: list[dict] | None = None):
        yield {
            'type': 'error',
            'error': 'No LLM provider is configured. Set OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in the repo .env file.'
        }

    if provider == 'none':
        return unavailable_chat

    if provider == 'openrouter':
        from agent.openrouter_agent import chat
        return chat
    if provider == 'groq' and settings.groq_api_key:
        try:
            from agent.groq_agent import chat
            return chat
        except Exception:
            return unavailable_chat
    if provider == 'gemini' and settings.gemini_api_key:
        try:
            from agent.gemini_agent import chat
            return chat
        except Exception:
            return unavailable_chat

    if settings.openrouter_api_key:
        from agent.openrouter_agent import chat
        return chat
    if settings.groq_api_key:
        try:
            from agent.groq_agent import chat
            return chat
        except Exception:
            return unavailable_chat
    if settings.gemini_api_key:
        try:
            from agent.gemini_agent import chat
            return chat
        except Exception:
            return unavailable_chat
    return unavailable_chat


@router.post('/chat')
async def chat_endpoint(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    chat_fn = await _get_chat_fn(req.message)
    provider_config = resolve_provider_config(req.message)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id, 'provider': provider_config.provider, 'model': provider_config.model})}\n\n"

        try:
            async for event in chat_fn(session_id, req.message, req.history or []):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception('Chat stream error')
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

        yield 'data: [DONE]\n\n'

    return StreamingResponse(event_stream(), media_type='text/event-stream')
