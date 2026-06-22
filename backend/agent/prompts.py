from pathlib import Path


PROMPT_DIR = Path(__file__).resolve().parents[2] / "docs" / "prompts" / "system"
SINGLISH_MARKERS = ("mage", "wifet", "ahuw", "kiye", "kiyapan", "ekak", "hari", "ane", "aiyo", "raa", "beela")
TANGLISH_MARKERS = ("kitta", "konjam", "irukku", "vandhen", "sollu", "paakalam", "venum", "kulla", "amma", "enna")
WEAK_PLAN_REFUSAL_MARKERS = (
    "talking is not needed",
    "no need to talk",
    "don't want to talk",
    "dont want to talk",
    "just send flowers",
    "send flowers only",
)


def _read_prompt_file(filename: str) -> str:
    return (PROMPT_DIR / filename).read_text(encoding="utf-8").strip()


SYSTEM_PROMPT_EN = _read_prompt_file("en.md")
SYSTEM_PROMPT_SINHALA = _read_prompt_file("si.md")
SYSTEM_PROMPT_TAMIL = _read_prompt_file("ta.md")


def get_system_prompt(language: str) -> str:
    prompts = {"si": SYSTEM_PROMPT_SINHALA, "ta": SYSTEM_PROMPT_TAMIL}
    return prompts.get(language, SYSTEM_PROMPT_EN)


def detect_input_style(user_text: str) -> str:
    normalized = user_text.lower()
    singlish_hits = sum(marker in normalized for marker in SINGLISH_MARKERS)
    tanglish_hits = sum(marker in normalized for marker in TANGLISH_MARKERS)
    if tanglish_hits >= 2 and tanglish_hits > singlish_hits:
        return "IMPORTANT: user is writing in Tanglish. Reply in mixed Tamil + English Romanized style. Do not reply in plain English."
    if singlish_hits >= 2:
        return "IMPORTANT: user is writing in Singlish. Reply in mixed Sinhala + English Romanized style. Do not reply in plain English."
    return "Default"


def detect_behavior_hint(user_text: str) -> str:
    normalized = user_text.lower()
    if any(marker in normalized for marker in WEAK_PLAN_REFUSAL_MARKERS):
        return (
            "IMPORTANT: soft correction required. The user is refusing a better action and pushing a weak plan. "
            "Start your reply by saying clearly but kindly that flowers alone will not fix this and the plan is weak. "
            "Recommend the better human action first, then help with the best shopping option."
        )
    return "Default"


def apply_behavior_hint_to_system_prompt(system_prompt: str, user_text: str) -> str:
    hint = detect_behavior_hint(user_text)
    if hint == "Default":
        return system_prompt
    return f"{system_prompt}\n\n## Runtime Behavior Override\n- {hint}"


def enforce_behavior_hint_on_response(response_text: str, user_text: str, language: str) -> str:
    hint = detect_behavior_hint(user_text)
    if hint == "Default":
        return response_text

    normalized = response_text.lower()
    if "flowers alone will not fix this" in normalized or "say sorry" in normalized:
        return response_text

    prefix = "No machan, flowers alone will not fix this. Talk properly and say sorry first."
    return f"{prefix} {response_text}".strip()


def build_user_message(user_text: str, cart_state: dict, context: dict) -> str:
    cart_lines = []
    for item in cart_state.get("items", []):
        cart_lines.append(
            f"  - {item['product_id']}: {item['name']} x{item['quantity']} (Rs. {item['price'] * item['quantity']})"
        )

    cart_summary = "\n".join(cart_lines) if cart_lines else "  (empty)"

    ctx_parts = []
    if context.get("occasion"):
        ctx_parts.append(f"Occasion: {context['occasion']}")
    if context.get("preferences"):
        ctx_parts.append(f"Preferences: {', '.join(context['preferences'])}")
    if context.get("budget_max"):
        budget_total = sum(i["price"] * i["quantity"] for i in cart_state.get("items", []))
        budget_value = context["budget_max"]
        ctx_parts.append(f"Budget: Rs. {budget_value}")
        if budget_total > budget_value:
            ctx_parts.append(f"Budget warning: cart total exceeds budget by Rs. {budget_total - budget_value}")
    if context.get("excluded_items"):
        ctx_parts.append(f"Excluded: {', '.join(context['excluded_items'])}")
    if context.get("delivery_city"):
        ctx_parts.append(f"Delivery city: {context['delivery_city']}")
    if context.get("delivery_date"):
        ctx_parts.append(f"Delivery date: {context['delivery_date']}")

    ctx_summary = "\n".join(ctx_parts) if ctx_parts else "  (none)"

    return f"""<input_style>
{detect_input_style(user_text)}
</input_style>

<behavior_hint>
{detect_behavior_hint(user_text)}
</behavior_hint>

<current_cart>
{cart_summary}
Total: Rs. {sum(i['price'] * i['quantity'] for i in cart_state.get('items', []))}
</current_cart>

<conversation_context>
{ctx_summary}
</conversation_context>

<user_message>
{user_text}
</user_message>"""
