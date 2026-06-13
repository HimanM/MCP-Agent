from __future__ import annotations

import json
import logging
import re
import asyncio
from typing import AsyncGenerator

from google import genai
from google.genai import types

from agent.language import detect_language
from agent.prompts import get_system_prompt, build_user_message
from agent.tools import TOOLS_DEFINITION, execute_tool
from cart.manager import cart_manager
from cart.sync import cart_sync
from config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.gemini_api_key)

GEMINI_MODEL = settings.gemini_model


def _gemini_tools():
    return [types.Tool(function_declarations=TOOLS_DEFINITION)]


def _tool_has_param(fn_name: str, param: str) -> bool:
    tool_def = next((t for t in TOOLS_DEFINITION if t["name"] == fn_name), {})
    return param in tool_def.get("parameters", {}).get("properties", {})


async def _call_gemini(contents, system_prompt, retries=2):
    for attempt in range(retries):
        try:
            return await client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    tools=_gemini_tools(),
                    temperature=0.7,
                ),
            )
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                import asyncio
                wait = 30
                logger.warning("Rate limited, waiting %ds", wait)
                await asyncio.sleep(wait)
            else:
                raise


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


async def chat(
    session_id: str,
    user_text: str,
    history: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    lang = detect_language(user_text)
    system_prompt = get_system_prompt(lang)

    cart_state = await cart_manager.get_cart(session_id)
    ctx = await cart_manager.get_context(session_id)
    ctx = await _update_context_from_message(session_id, user_text, ctx)
    await cart_manager.save_context(session_id, ctx)

    user_message = build_user_message(user_text, cart_state, ctx)

    contents: list[types.Content] = []
    if history:
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))]))

    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    try:
        response = await _call_gemini(contents, system_prompt)
    except Exception as e:
        logger.exception("Gemini API call failed")
        yield {"type": "error", "error": f"Gemini API error: {e}"}
        return

    tool_calls_made = 0
    max_tool_rounds = 10

    while response.candidates and response.candidates[0].content:
        candidate = response.candidates[0]
        parts = candidate.content.parts or []

        function_calls = [p for p in parts if p.function_call]

        if not function_calls:
            for part in parts:
                if part.text:
                    yield {"type": "text", "text": part.text}
            return

        tool_response_parts = []
        for part in function_calls:
            fn_name = part.function_call.name
            fn_args = dict(part.function_call.args) if part.function_call.args else {}

            if _tool_has_param(fn_name, "session_id"):
                fn_args["session_id"] = session_id

            yield {"type": "tool_call", "tool": fn_name, "args": fn_args}

            result = await execute_tool(fn_name, fn_args)

            yield {"type": "tool_result", "tool": fn_name, "result": result}

            if fn_name in ("add_to_cart", "remove_from_cart", "update_cart_quantity"):
                cart_state = await cart_manager.get_cart(session_id)
                await cart_sync.broadcast(session_id, {
                    "type": "cart_updated",
                    "cart": cart_state,
                })

            tool_response_parts.append(types.Part(
                function_response=types.FunctionResponse(
                    name=fn_name, response={"result": result}
                )
            ))

            tool_calls_made += 1
            if tool_calls_made >= max_tool_rounds:
                yield {"type": "text", "text": "I've made several tool calls. Let me summarize what I found."}
                return

        contents.append(candidate.content)
        contents.append(types.Content(role="user", parts=tool_response_parts))

        try:
            response = await _call_gemini(contents, system_prompt)
        except Exception as e:
            logger.exception("Gemini API call failed in loop")
            yield {"type": "error", "error": f"Gemini API error: {e}"}
            return

    yield {"type": "text", "text": "I'm sorry, I couldn't process that request. Please try again."}
