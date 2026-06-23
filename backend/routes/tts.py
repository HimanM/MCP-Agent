from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from config import settings
from tts_service import MAX_TTS_CHARS, normalize_tts_language, synthesize_tts

router = APIRouter(prefix="/api", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


def _validate_tts_request(payload: TTSRequest) -> tuple[str, str]:
    text = payload.text.strip()
    if not text:
      raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > MAX_TTS_CHARS:
      raise HTTPException(status_code=400, detail=f"Text must be {MAX_TTS_CHARS} characters or fewer")
    return text, normalize_tts_language(payload.language.strip().lower())


@router.post("/tts")
async def tts(payload: TTSRequest):
    text, language = _validate_tts_request(payload)
    if not settings.elevenlabs_enabled:
        raise HTTPException(status_code=503, detail="ElevenLabs is not configured")

    try:
        audio = await synthesize_tts(text, language)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS unavailable: {exc}") from exc

    return Response(content=audio, media_type="audio/mpeg")
