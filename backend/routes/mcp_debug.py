from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from mcp.client import mcp_client

router = APIRouter(prefix="/api/mcp", tags=["mcp-debug"])


class MCPDebugRequest(BaseModel):
    tool: str = Field(min_length=1)
    params: dict = Field(default_factory=dict)


def _validate_debug_tool_name(name: str) -> str:
    clean = name.strip()
    if not clean.startswith("kapruka_"):
        raise HTTPException(status_code=400, detail="Only kapruka_* tools are allowed")
    return clean


def _validate_debug_params(params: dict) -> dict:
    try:
        payload = json.dumps(params)
    except TypeError as exc:
        raise HTTPException(status_code=400, detail=f"Params must be JSON-serializable: {exc}") from exc
    if len(payload) > 5000:
        raise HTTPException(status_code=400, detail="Params payload is too large")
    return params


@router.get("/debug")
async def mcp_debug_meta():
    try:
        tools = await mcp_client.list_tools()
        return {
            "connected": True,
            "tool_count": len(tools),
            "tools": [tool.get("name", "") for tool in tools],
        }
    except Exception as exc:
        return {
            "connected": False,
            "tool_count": 0,
            "tools": [],
            "error": str(exc),
        }


@router.post("/debug")
async def mcp_debug_call(req: MCPDebugRequest):
    tool = _validate_debug_tool_name(req.tool)
    params = _validate_debug_params(req.params)
    result = await mcp_client.call_tool(tool, params)
    return {
        "tool": tool,
        "result": result,
    }
