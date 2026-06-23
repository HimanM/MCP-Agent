from __future__ import annotations

import re
from dataclasses import dataclass

from config import settings

HIGH_DENSITY_KEYWORDS = {
    "build",
    "debug",
    "design",
    "engineer",
    "implement",
    "integration",
    "mcp",
    "multi-step",
    "plan",
    "refactor",
    "reason",
    "review",
    "test",
    "troubleshoot",
    "optimize",
    "architecture",
    "compare",
    "complex",
    "demanding",
}


def normalize_provider(name: str | None) -> str:
    return (name or "auto").strip().lower().replace("-", "_")


def is_high_density_request(text: str) -> bool:
    lowered = text.lower()
    if len(lowered) >= 220:
        return True
    if lowered.count("\n") >= 3:
        return True
    return any(keyword in lowered for keyword in HIGH_DENSITY_KEYWORDS)


def select_provider(message_text: str = "") -> str:
    requested = normalize_provider(settings.llm_provider)
    if requested == "auto":
        for candidate in ("openrouter", "groq", "gemini"):
            if candidate == "openrouter" and settings.openrouter_api_key:
                return candidate
            if candidate == "groq" and settings.groq_api_key:
                return candidate
            if candidate == "gemini" and settings.gemini_api_key:
                return candidate
        return "none"

    if requested == "openrouter" and settings.openrouter_api_key:
        return requested
    if requested == "groq" and settings.groq_api_key:
        return requested
    if requested == "gemini" and settings.gemini_api_key:
        return requested

    # Fallback order when the configured provider is unavailable.
    return "openrouter" if settings.openrouter_api_key else ("groq" if settings.groq_api_key else ("gemini" if settings.gemini_api_key else "none"))


def select_model(provider: str, message_text: str = "", model_override: str | None = None) -> str:
    high_density = is_high_density_request(message_text)
    provider = normalize_provider(provider)

    if provider == "groq":
        return settings.groq_reasoning_model if high_density else settings.groq_fast_model or settings.groq_model
    if provider == "gemini":
        return settings.gemini_reasoning_model if high_density else settings.gemini_fast_model or settings.gemini_model
    if provider == "openrouter":
        if model_override:
            return model_override
        if settings.openrouter_model:
            return settings.openrouter_model
        return settings.openrouter_reasoning_model if high_density else settings.openrouter_fast_model
    if provider == "none":
        return ""

    return settings.groq_model


@dataclass(frozen=True)
class ProviderConfig:
    provider: str
    model: str
    is_high_density: bool


def resolve_provider_config(message_text: str = "", model_override: str | None = None) -> ProviderConfig:
    provider = select_provider(message_text)
    return ProviderConfig(
        provider=provider,
        model=select_model(provider, message_text, model_override=model_override),
        is_high_density=is_high_density_request(message_text),
    )
