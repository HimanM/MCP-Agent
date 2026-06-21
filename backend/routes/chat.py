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


def _provider_fallback_order(message_text: str) -> list[str]:
    preferred = resolve_provider_config(message_text).provider
    ordered: list[str] = []
    available = {
        "openrouter": bool(settings.openrouter_api_key),
        "groq": bool(settings.groq_api_key),
        "gemini": bool(settings.gemini_api_key),
    }

    for provider in (preferred, "openrouter", "gemini", "groq"):
        if provider == "none":
            continue
        if available.get(provider) and provider not in ordered:
            ordered.append(provider)

    return ordered


def _provider_chat_fn(provider: str):
    if provider == "openrouter":
        from agent.openrouter_agent import chat
        return chat
    if provider == "groq":
        from agent.groq_agent import chat
        return chat
    if provider == "gemini":
        from agent.gemini_agent import chat
        return chat
    return None


@router.post('/chat')
async def chat_endpoint(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    provider_config = resolve_provider_config(req.message)

    async def event_stream():
        candidates = _provider_fallback_order(req.message)
        if not candidates:
            yield (
                f"data: {json.dumps({'type': 'error', 'error': 'No LLM provider is configured. Set OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in the repo .env file.'})}\n\n"
            )
            yield 'data: [DONE]\n\n'
            return

        yielded_session = False
        last_error = 'No LLM provider is configured.'

        for provider in candidates:
            candidate_config = resolve_provider_config(req.message)
            model = candidate_config.model if candidate_config.provider == provider else ""
            chat_fn = _provider_chat_fn(provider)
            if chat_fn is None:
                continue

            try:
                if not yielded_session:
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id, 'provider': provider, 'model': model or provider_config.model})}\n\n"
                    yielded_session = True

                produced_output = False
                first_event = True

                async for event in chat_fn(session_id, req.message, req.history or []):
                    is_fallback_error = (
                        first_event
                        and event.get('type') == 'error'
                        and provider != candidates[-1]
                    )
                    first_event = False

                    if is_fallback_error:
                        last_error = event.get('error') or f'{provider} failed'
                        logger.warning('Provider %s failed before producing output, trying fallback: %s', provider, last_error)
                        break

                    produced_output = produced_output or event.get('type') != 'error'
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get('type') == 'error':
                        last_error = event.get('error') or f'{provider} failed'
                        return

                else:
                    return

                if produced_output:
                    return
            except Exception as exc:
                last_error = str(exc)
                logger.exception('Chat stream error for provider %s', provider)
                if provider == candidates[-1]:
                    yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"
                    break

        else:
            yield f"data: {json.dumps({'type': 'error', 'error': last_error})}\n\n"

        yield 'data: [DONE]\n\n'

    return StreamingResponse(event_stream(), media_type='text/event-stream')
