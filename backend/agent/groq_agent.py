from __future__ import annotations

import json
import logging
import re
from typing import AsyncGenerator

from groq import AsyncGroq

from agent.language import detect_language
from agent.prompts import build_system_prompt, build_user_message
from agent.provider_selector import select_model
from agent.tools import TOOLS_DEFINITION, build_tool_result_event, coerce_tool_args, execute_tool, format_tool_result_for_model, parse_failed_tool_generation
from cart.manager import cart_manager
from cart.sync import cart_sync
from config import settings

logger = logging.getLogger(__name__)

client = AsyncGroq(api_key=settings.groq_api_key)

GROQ_MODELS = ["llama-3.3-70b-versatile"]


def _groq_tools() -> list[dict]:
    tools = []
    for t in TOOLS_DEFINITION:
        tools.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        })
    return tools


def _tool_has_param(fn_name: str, param: str) -> bool:
    tool_def = next((t for t in TOOLS_DEFINITION if t["name"] == fn_name), {})
    return param in tool_def.get("parameters", {}).get("properties", {})


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


async def _call_groq(messages, tools, model: str, retries=2):
    for attempt in range(retries):
        try:
            request = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096,
            }
            if tools:
                request["tools"] = tools
                request["tool_choice"] = "auto"
            response = await client.chat.completions.create(**request)
            return response, model
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                import asyncio
                wait = 30
                logger.warning("Rate limited, waiting %ds before retry", wait)
                await asyncio.sleep(wait)
            else:
                raise
    raise Exception("Groq rate limited. Please wait a minute and try again.")


def _extract_failed_generation(error: Exception) -> str:
    body = getattr(error, "body", None)
    if isinstance(body, dict):
        failed_generation = body.get("error", {}).get("failed_generation")
        if isinstance(failed_generation, str):
            return failed_generation
    return str(error)


async def _recover_failed_tool_use(error: Exception, messages: list[dict]) -> tuple[object, str] | None:
    if "tool_use_failed" not in str(error) and "Failed to call a function" not in str(error):
        return None

    parsed = parse_failed_tool_generation(_extract_failed_generation(error))
    if not parsed:
        return None

    tool_name, tool_args = parsed
    logger.warning("Recovering failed Groq tool generation by executing %s with coerced args", tool_name)
    tool_result = await execute_tool(tool_name, tool_args)

    recovered_messages = [
        *messages,
        {
            "role": "assistant",
            "content": (
                f"I searched Kapruka using {tool_name} with the user's request. "
                "Use the tool result below to answer naturally. Do not call another tool for the same search."
            ),
        },
        {
            "role": "user",
            "content": f"<tool_result name=\"{tool_name}\">\n{tool_result}\n</tool_result>",
        },
    ]
    return await _call_groq(recovered_messages, None, select_model('groq'))


async def _recover_failed_tool_use_text(error: Exception, messages: list[dict]) -> str | None:
    recovered = await _recover_failed_tool_use(error, messages)
    if not recovered:
        return None
    response, _ = recovered
    if not response.choices:
        return None
    return response.choices[0].message.content


async def chat(
    session_id: str,
    user_text: str,
    history: list[dict] | None = None,
    history_summary: str = "",
    model_override: str | None = None,
) -> AsyncGenerator[dict, None]:
    lang = detect_language(user_text)
    system_prompt = build_system_prompt(lang, user_text)

    cart_state = await cart_manager.get_cart(session_id)
    ctx = await cart_manager.get_context(session_id)
    ctx = await _update_context_from_message(session_id, user_text, ctx)
    await cart_manager.save_context(session_id, ctx)
    if ctx.get("budget_max") is not None and ctx.get("budget_max") != cart_state.get("budget_max"):
        await cart_manager.update_budget(session_id, ctx["budget_max"])

    user_message = build_user_message(user_text, cart_state, ctx, history_summary=history_summary)

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
        response, active_model = await _call_groq(messages, _groq_tools(), select_model('groq', user_text))
        logger.info("Using model: %s", active_model)
    except Exception as e:
        recovered = await _recover_failed_tool_use(e, messages)
        if recovered:
            response, active_model = recovered
            logger.info("Recovered failed tool use with model: %s", active_model)
        else:
            yield {"type": "error", "error": str(e)}
            return

    while True:
        choice = response.choices[0]
        msg = choice.message

        if choice.finish_reason == "stop" or not msg.tool_calls:
            if msg.content:
                yield {"type": "text", "text": msg.content}
            return

        if msg.tool_calls:
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            })

            for tc in msg.tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args = json.loads(tc.function.arguments) if tc.function.arguments else {}
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
                    await cart_sync.broadcast(session_id, {
                        "type": "cart_updated",
                        "cart": cart_state,
                    })

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": format_tool_result_for_model(fn_name, result, user_text, fn_args),
                })

                tool_calls_made += 1
                if tool_calls_made >= max_tool_rounds:
                    yield {"type": "text", "text": "I’ve gathered enough to help. Here’s the best answer I can give from the data I found."}
                    return

        if choice.finish_reason == "length":
            yield {"type": "text", "text": "Response was cut short. Let me know if you need more details."}
            return

        try:
            response, _ = await _call_groq(messages, _groq_tools(), select_model('groq', user_text))
        except Exception as e:
            recovered_text = await _recover_failed_tool_use_text(e, messages)
            if recovered_text:
                yield {"type": "text", "text": recovered_text}
            else:
                yield {"type": "error", "error": str(e)}
            return

    yield {"type": "text", "text": "I'm sorry, I couldn't process that request. Please try again."}
