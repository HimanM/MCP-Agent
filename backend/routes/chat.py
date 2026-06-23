from __future__ import annotations

import json
import logging
import re
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.tools import parse_tracking_result
from agent.provider_selector import resolve_provider_config
from config import settings
from mcp.client import mcp_client
from rate_limit import rate_limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    history: list[dict] | None = None
    model_override: str | None = None


def _needs_order_number_prompt(message_text: str) -> bool:
    normalized = message_text.lower()
    asks_to_track = any(
        phrase in normalized
        for phrase in (
            "track order",
            "track my order",
            "track package",
            "order status",
            "where is my order",
            "delivery status",
        )
    )
    has_order_number = bool(re.search(r"\b(?=[A-Za-z0-9-]{6,}\b)(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]+\b", message_text))
    return asks_to_track and not has_order_number


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


def _client_ip(req: Request) -> str:
    forwarded = req.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = req.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return req.client.host if req.client else "unknown"


@router.post('/chat')
async def chat_endpoint(req: ChatRequest, request: Request):
    session_id = req.session_id or str(uuid.uuid4())
    provider_config = resolve_provider_config(req.message, model_override=req.model_override)
    allowed, retry_after = await rate_limiter.check(
        f"chat:{_client_ip(request)}",
        settings.rate_limit_requests_per_window,
        settings.rate_limit_window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    async def event_stream():
        if _needs_order_number_prompt(req.message):
            yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id, 'provider': 'local', 'model': 'order-tracking-guard'})}\n\n"
            yield f"data: {json.dumps({'type': 'text', 'text': 'Please share your Kapruka order number and I will track the latest status for you.'})}\n\n"
            yield 'data: [DONE]\n\n'
            return

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
            candidate_config = resolve_provider_config(req.message, model_override=req.model_override)
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

                async for event in chat_fn(session_id, req.message, req.history or [], model_override=req.model_override):
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


@router.get('/track-order/{order_number}')
async def track_order_endpoint(order_number: str, request: Request):
    allowed, retry_after = await rate_limiter.check(
        f"track:{_client_ip(request)}",
        settings.rate_limit_requests_per_window,
        settings.rate_limit_window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    raw = await mcp_client.call_tool("kapruka_track_order", {"order_number": order_number})
    if not isinstance(raw, str):
        raise HTTPException(status_code=502, detail="Unexpected tracking response from Kapruka MCP.")

    tracking = parse_tracking_result(raw)
    if not tracking.get("order_number") and not tracking.get("status") and not tracking.get("events"):
        raise HTTPException(status_code=404, detail="No tracking details found for that order number.")

    return tracking
