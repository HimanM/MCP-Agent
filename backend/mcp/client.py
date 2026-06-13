import json
import logging
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)


class KaprukaMCPClient:
    def __init__(self):
        self.url = settings.mcp_server_url
        self.http = httpx.AsyncClient(timeout=30.0)
        self._session_id: str | None = None
        self._tools: list[dict] | None = None

    async def _send(self, method: str, params: dict | None = None) -> dict:
        payload: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
        }
        if params:
            payload["params"] = params

        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self._session_id:
            headers["Mcp-Session-Id"] = self._session_id

        resp = await self.http.post(self.url, json=payload, headers=headers)

        if "mcp-session-id" in resp.headers:
            self._session_id = resp.headers["mcp-session-id"]

        content_type = resp.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            return self._parse_sse(resp.text)
        return resp.json()

    def _parse_sse(self, text: str) -> dict:
        for line in reversed(text.strip().split("\n")):
            if line.startswith("data: "):
                return json.loads(line[6:])
        return {}

    async def initialize(self):
        result = await self._send("initialize", {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {"name": "kapruka-agent", "version": "1.0.0"},
        })
        await self._send("notifications/initialized")
        logger.info("MCP session established: %s", self._session_id)
        return result

    async def list_tools(self) -> list[dict]:
        if self._tools is None:
            result = await self._send("tools/list")
            self._tools = result.get("result", {}).get("tools", [])
        return self._tools

    async def call_tool(self, name: str, arguments: dict) -> Any:
        result = await self._send("tools/call", {"name": name, "arguments": {"params": arguments}})
        content = result.get("result", {}).get("content", [])
        texts = [c.get("text", "") for c in content if c.get("type") == "text"]
        combined = "\n".join(texts)
        return combined

    async def close(self):
        await self.http.aclose()


mcp_client = KaprukaMCPClient()
