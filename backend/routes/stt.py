from __future__ import annotations

import base64
import io

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api", tags=["stt"])

MAX_AUDIO_BYTES = 5 * 1024 * 1024
SUPPORTED_AUDIO_FORMATS = {"wav", "mp3", "flac", "m4a", "ogg", "webm", "aac", "mp4"}


class STTRequest(BaseModel):
    audio_base64: str
    format: str = "webm"


def _validate_stt_request(payload: STTRequest) -> tuple[str, str]:
    audio_base64 = payload.audio_base64.strip()
    audio_format = payload.format.strip().lower()
    if not audio_base64:
        raise HTTPException(status_code=400, detail="Audio is required")
    if audio_format not in SUPPORTED_AUDIO_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported audio format")
    try:
        audio_bytes = base64.b64decode(audio_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid audio encoding") from exc
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio is required")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio must be 5MB or smaller")
    return audio_base64, audio_format


@router.post("/stt")
async def stt(payload: STTRequest):
    if not settings.groq_stt_enabled and not settings.openrouter_stt_enabled:
        raise HTTPException(status_code=503, detail="STT is not configured")

    audio_base64, audio_format = _validate_stt_request(payload)
    audio_bytes = base64.b64decode(audio_base64)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if settings.groq_stt_enabled:
                response = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                    data={"model": settings.groq_stt_model, "response_format": "json"},
                    files={"file": (f"recording.{audio_format}", io.BytesIO(audio_bytes), f"audio/{audio_format}")},
                )
            else:
                response = await client.post(
                    f"{settings.openrouter_base_url.rstrip('/')}/audio/transcriptions",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": settings.openrouter_site_url,
                        "X-Title": settings.openrouter_app_name,
                    },
                    json={
                        "model": settings.openrouter_stt_model,
                        "input_audio": {
                            "data": audio_base64,
                            "format": audio_format,
                        },
                    },
                )
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"STT unavailable: {exc}") from exc

    text = (data.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="STT returned an empty transcription")

    return {"text": text, "usage": data.get("usage")}
