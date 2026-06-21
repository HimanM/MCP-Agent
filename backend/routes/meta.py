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
        "mcp": {
            "server_url": settings.mcp_server_url,
            "connected": connected,
            "tool_count": len(tools),
            "tools": [tool.get("name", "") for tool in tools],
        },
    }
