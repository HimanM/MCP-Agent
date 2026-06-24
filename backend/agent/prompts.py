from pathlib import Path


PROMPT_ROOT = Path(__file__).resolve().parents[2] / "docs" / "prompts"
if not PROMPT_ROOT.exists():
    PROMPT_ROOT = Path(__file__).resolve().parents[1] / "docs" / "prompts"
SYSTEM_DIR = PROMPT_ROOT / "system"
EXAMPLES_DIR = PROMPT_ROOT / "examples"
SINGLISH_MARKERS = ("mage", "ahuwa", "kiye", "kiyapan", "ekak", "hari", "ane", "aiyo", "beela")
TANGLISH_MARKERS = ("kitta", "konjam", "irukku", "vandhen", "sollu", "paakalam", "venum", "kulla", "amma", "enna")
WEAK_PLAN_REFUSAL_MARKERS = (
    "talking is not needed",
    "no need to talk",
    "don't want to talk",
    "dont want to talk",
    "just send flowers",
    "send flowers only",
)
EXAMPLE_KEYWORDS = {
    "clothing": ("office function", "office wear", "wear", "dress", "shirt", "mens wear", "women's wear", "womens wear"),
    "groceries": ("grocery", "groceries", "restock", "weekly", "milk", "rice", "sugar", "tea"),
}


def _read_prompt_file(directory: Path, filename: str) -> str:
    return (directory / filename).read_text(encoding="utf-8").strip()


SYSTEM_PROMPT_EN = "\n\n".join(
    (
        _read_prompt_file(SYSTEM_DIR, "core.md"),
        _read_prompt_file(SYSTEM_DIR, "tool-policy.md"),
    )
)
SYSTEM_PROMPT_SINHALA = _read_prompt_file(SYSTEM_DIR, "si.md")
SYSTEM_PROMPT_TAMIL = _read_prompt_file(SYSTEM_DIR, "ta.md")
PROMPT_EXAMPLES = {
    "singlish": _read_prompt_file(EXAMPLES_DIR, "singlish.md"),
    "tanglish": _read_prompt_file(EXAMPLES_DIR, "tanglish.md"),
    "soft-correction": _read_prompt_file(EXAMPLES_DIR, "soft-correction.md"),
    "clothing": _read_prompt_file(EXAMPLES_DIR, "clothing.md"),
    "groceries": _read_prompt_file(EXAMPLES_DIR, "groceries.md"),
}


def get_system_prompt(language: str) -> str:
    prompts = {"si": SYSTEM_PROMPT_SINHALA, "ta": SYSTEM_PROMPT_TAMIL}
    return prompts.get(language, SYSTEM_PROMPT_EN)


def detect_input_style(user_text: str) -> str:
    normalized = user_text.lower()
    singlish_hits = sum(marker in normalized for marker in SINGLISH_MARKERS)
    tanglish_hits = sum(marker in normalized for marker in TANGLISH_MARKERS)
    if tanglish_hits >= 2 and tanglish_hits > singlish_hits:
        return "tanglish"
    if singlish_hits >= 2:
        return "singlish"
    return "default"


def detect_behavior_hint(user_text: str) -> str:
    normalized = user_text.lower()
    if any(marker in normalized for marker in WEAK_PLAN_REFUSAL_MARKERS):
        return (
            "Soft correction required. Say clearly but kindly that the weak move will not solve the problem. "
            "Recommend the better human action first, then help with the best shopping option."
        )
    return ""


def _select_example_keys(user_text: str, style: str, behavior_hint: str) -> list[str]:
    normalized = user_text.lower()
    keys: list[str] = []
    if behavior_hint:
        keys.append("soft-correction")
    if style in ("singlish", "tanglish"):
        keys.append(style)
    for key, keywords in EXAMPLE_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            keys.append(key)
            break
    deduped: list[str] = []
    for key in keys:
        if key not in deduped:
            deduped.append(key)
    return deduped[:2]


def build_system_prompt(language: str, user_text: str) -> str:
    base_prompt = get_system_prompt(language)
    if language in {"si", "ta"}:
        return base_prompt

    style = detect_input_style(user_text)
    behavior_hint = detect_behavior_hint(user_text)
    sections = [base_prompt]

    runtime_notes: list[str] = []
    if style == "singlish":
        runtime_notes.append("Reply in mixed Sinhala plus English Romanized style, not plain English.")
    elif style == "tanglish":
        runtime_notes.append("Reply in mixed Tamil plus English Romanized style, not plain English.")
    if behavior_hint:
        runtime_notes.append(behavior_hint)
    if runtime_notes:
        sections.append("## Runtime notes\n- " + "\n- ".join(runtime_notes))

    example_keys = _select_example_keys(user_text, style, behavior_hint)
    if example_keys:
        sections.append(
            "## Relevant examples\n" + "\n\n".join(PROMPT_EXAMPLES[key] for key in example_keys)
        )

    return "\n\n".join(section for section in sections if section.strip())


def enforce_behavior_hint_on_response(response_text: str, user_text: str, language: str) -> str:
    hint = detect_behavior_hint(user_text)
    if not hint:
        return response_text

    normalized = response_text.lower()
    if "flowers alone will not fix this" in normalized or "say sorry" in normalized:
        return response_text

    prefix = "No machan, flowers alone will not fix this. Talk properly and say sorry first."
    return f"{prefix} {response_text}".strip()


def build_user_message(user_text: str, cart_state: dict, context: dict, history_summary: str = "") -> str:
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
    history_block = history_summary.strip() or "  (none)"

    return f"""<conversation_summary>
{history_block}
</conversation_summary>

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
