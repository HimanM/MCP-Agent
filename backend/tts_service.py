from __future__ import annotations

from html import escape

import httpx

from config import settings

VOICE_MAP = {
    "en": "en-IN-NeerjaNeural",
    "si": "si-LK-ThiliniNeural",
    "ta": "ta-LK-SaranyaNeural",
}

LOCALE_MAP = {
    "en": "en-IN",
    "si": "si-LK",
    "ta": "ta-LK",
}

MAX_TTS_CHARS = 320


def normalize_tts_language(language: str) -> str:
    return language if language in VOICE_MAP else "en"


def build_ssml(text: str, language: str) -> str:
    normalized_language = normalize_tts_language(language)
    voice = VOICE_MAP[normalized_language]
    locale = LOCALE_MAP[normalized_language]
    return (
        f"<speak version='1.0' xml:lang='{locale}'>"
        f"<voice name='{voice}'>{escape(text)}</voice>"
        "</speak>"
    )


async def synthesize_tts(text: str, language: str) -> bytes:
    if not settings.azure_speech_enabled:
        raise RuntimeError("Azure speech is not configured")

    endpoint = f"https://{settings.azure_speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            endpoint,
            content=build_ssml(text, language),
            headers={
                "Ocp-Apim-Subscription-Key": settings.azure_speech_key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
                "User-Agent": "Kapruka Shopper",
            },
        )
        response.raise_for_status()
        return response.content
