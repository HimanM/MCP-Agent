from __future__ import annotations

import httpx

from config import settings

MAX_TTS_CHARS = 1200

LANGUAGE_CODE_MAP = {
    "en": "en",
    "ta": "ta",
}


def normalize_tts_language(language: str) -> str:
    return language if language in LANGUAGE_CODE_MAP else "en"


def voice_id_for_language(language: str) -> str:
    normalized = normalize_tts_language(language)
    if normalized == "ta" and settings.elevenlabs_tamil_voice_id:
        return settings.elevenlabs_tamil_voice_id
    return settings.elevenlabs_voice_id


def build_tts_payload(text: str, language: str) -> dict:
    normalized = normalize_tts_language(language)
    return {
        "text": text,
        "model_id": settings.elevenlabs_model,
        "language_code": LANGUAGE_CODE_MAP[normalized],
    }


async def synthesize_tts(text: str, language: str) -> bytes:
    if not settings.elevenlabs_enabled:
        raise RuntimeError("ElevenLabs is not configured")

    voice_id = voice_id_for_language(language)
    endpoint = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            endpoint,
            params={"output_format": "mp3_44100_128"},
            json=build_tts_payload(text, language),
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
        )
        response.raise_for_status()
        return response.content
