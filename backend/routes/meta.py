from __future__ import annotations

from fastapi import APIRouter

from agent.provider_selector import resolve_provider_config
from config import settings
from mcp.client import mcp_client

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta")
async def meta():
    provider_config = resolve_provider_config()
    try:
        tools = await mcp_client.list_tools()
        connected = True
    except Exception:
        tools = []
        connected = False

    return {
        "provider": provider_config.provider,
        "model": provider_config.model,
        "high_density_default": provider_config.is_high_density,
        "openrouter": {
            "default_model": settings.openrouter_fast_model,
            "backup_model": settings.openrouter_backup_model,
        },
        "tts": {
            "configured": settings.elevenlabs_enabled,
            "provider": "elevenlabs" if settings.elevenlabs_enabled else "none",
        },
        "stt": {
            "configured": settings.groq_stt_enabled or settings.openrouter_stt_enabled,
            "provider": "groq" if settings.groq_stt_enabled else ("openrouter" if settings.openrouter_stt_enabled else "none"),
            "model": settings.groq_stt_model if settings.groq_stt_enabled else (settings.openrouter_stt_model if settings.openrouter_stt_enabled else ""),
        },
        "mcp": {
            "server_url": settings.mcp_server_url,
            "connected": connected,
            "tool_count": len(tools),
            "tools": [tool.get("name", "") for tool in tools],
        },
    }
