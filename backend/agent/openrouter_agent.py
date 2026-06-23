from __future__ import annotations

import json
import logging
import re
from typing import AsyncGenerator

import httpx

from agent.language import detect_language
from agent.prompts import apply_behavior_hint_to_system_prompt, build_user_message, get_system_prompt
from agent.provider_selector import select_model
from agent.tools import TOOLS_DEFINITION, build_tool_result_event, coerce_tool_args, execute_tool, format_tool_result_for_model
from cart.manager import cart_manager
from cart.sync import cart_sync
from config import settings

logger = logging.getLogger(__name__)

http_client = httpx.AsyncClient(timeout=60.0)


def _openrouter_tools() -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["parameters"],
            },
        }
        for tool in TOOLS_DEFINITION
    ]


def _tool_has_param(fn_name: str, param: str) -> bool:
    tool_def = next((tool for tool in TOOLS_DEFINITION if tool["name"] == fn_name), {})
    return param in tool_def.get("parameters", {}).get("properties", {})


def _format_openrouter_error(exc: Exception) -> str:
    text = str(exc)
    if "429" in text:
        return "The AI model is busy right now. Please wait a little and try again."
    return f"OpenRouter API error: {exc}"


async def _update_context_from_message(session_id: str, user_text: str, ctx: dict) -> dict:
    lower = user_text.lower()

    occasion_match = re.search(r"(birthday|wedding|anniversary|valentine|christmas|new year|party)", lower)
    if occasion_match:
        ctx["occasion"] = occasion_match.group(0)

    budget_match = re.search(r"(?:budget|around|about|roughly)\s*(?:rs\.?|lkr|rupees?)?\s*(\d[\d,]*)", lower)
    if budget_match:
        ctx["budget_max"] = int(budget_match.group(1).replace(",", ""))

    city_match = re.search(
        r"(?:deliver(?:y)?\s+(?:to|in|at)|location)\s+([a-zA-Z\s]+?)(?:\s+on|\s+for|\s*,|\s*\.|$)", lower
    )
    if city_match:
        ctx["delivery_city"] = city_match.group(1).strip()

    date_match = re.search(r"(?:on|date|deliver)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)", lower)
    if date_match:
        ctx["delivery_date"] = date_match.group(1).strip()

    return ctx


async def _call_openrouter(messages: list[dict], tools: list[dict], model: str, retries: int = 2):
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url,
        "X-Title": settings.openrouter_app_name,
    }

    payload: dict = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    for attempt in range(retries):
        try:
            response = await http_client.post(
                f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json(), model
        except Exception as exc:
            if "429" in str(exc) and attempt < retries - 1:
                import asyncio

                wait = 20 * (attempt + 1)
                logger.warning("OpenRouter rate limited, waiting %ss before retry", wait)
                await asyncio.sleep(wait)
                continue
            raise


async def chat(
    session_id: str,
    user_text: str,
    history: list[dict] | None = None,
    model_override: str | None = None,
) -> AsyncGenerator[dict, None]:
    lang = detect_language(user_text)
    system_prompt = apply_behavior_hint_to_system_prompt(get_system_prompt(lang), user_text)

    cart_state = await cart_manager.get_cart(session_id)
    ctx = await cart_manager.get_context(session_id)
    ctx = await _update_context_from_message(session_id, user_text, ctx)
    await cart_manager.save_context(session_id, ctx)
    if ctx.get("budget_max") is not None and ctx.get("budget_max") != cart_state.get("budget_max"):
        await cart_manager.update_budget(session_id, ctx["budget_max"])

    user_message = build_user_message(user_text, cart_state, ctx)
    model = select_model("openrouter", user_text, model_override=model_override)

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    tool_calls_made = 0
    max_tool_rounds = 10
    seen_tool_signatures: set[str] = set()

    try:
        response, active_model = await _call_openrouter(messages, _openrouter_tools(), model)
        logger.info("Using OpenRouter model: %s", active_model)
    except Exception as exc:
        logger.exception("OpenRouter API call failed")
        yield {"type": "error", "error": _format_openrouter_error(exc)}
        return

    while True:
        choices = response.get("choices") or []
        if not choices:
            yield {"type": "error", "error": "OpenRouter returned an empty response."}
            return

        choice = choices[0]
        message = choice.get("message", {})
        finish_reason = choice.get("finish_reason")
        tool_calls = message.get("tool_calls") or []

        if finish_reason == "stop" or not tool_calls:
            text = message.get("content")
            if text:
                yield {"type": "text", "text": text}
            return

        messages.append({"role": "assistant", "content": message.get("content") or "", "tool_calls": tool_calls})

        for tool_call in tool_calls:
            fn_name = tool_call.get("function", {}).get("name", "")
            try:
                fn_args = json.loads(tool_call.get("function", {}).get("arguments") or "{}")
            except json.JSONDecodeError:
                fn_args = {}

            if _tool_has_param(fn_name, "session_id"):
                fn_args["session_id"] = session_id
            fn_args = coerce_tool_args(fn_name, fn_args)
            signature = f"{fn_name}:{json.dumps(fn_args, sort_keys=True, default=str)}"
            if signature in seen_tool_signatures:
                yield {"type": "text", "text": "I already checked that exact step, so I’m wrapping up with the best answer I have."}
                return
            seen_tool_signatures.add(signature)

            yield {"type": "tool_call", "tool": fn_name, "args": fn_args}
            result = await execute_tool(fn_name, fn_args)
            tool_event = build_tool_result_event(fn_name, result)
            yield {"type": "tool_result", "tool": fn_name, **tool_event}

            if fn_name in ("add_to_cart", "remove_from_cart", "update_cart_quantity"):
                cart_state = await cart_manager.get_cart(session_id)
                await cart_sync.broadcast(session_id, {"type": "cart_updated", "cart": cart_state})

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.get("id"),
                    "content": format_tool_result_for_model(fn_name, result, user_text, fn_args),
                }
            )

            tool_calls_made += 1
            if tool_calls_made >= max_tool_rounds:
                yield {"type": "text", "text": "I’ve gathered enough to help. Here’s the best answer I can give from the data I found."}
                return

        try:
            response, _ = await _call_openrouter(messages, _openrouter_tools(), model)
        except Exception as exc:
            yield {"type": "error", "error": _format_openrouter_error(exc)}
            return

    yield {"type": "text", "text": "I'm sorry, I couldn't process that request. Please try again."}
