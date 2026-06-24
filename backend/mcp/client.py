from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)


_REMOTE_TOOL_ALIASES: dict[str, tuple[str, ...]] = {
    'search_products': ('kapruka_search_products',),
    'get_product': ('kapruka_get_product',),
    'list_categories': ('kapruka_list_categories',),
    'list_delivery_cities': ('kapruka_list_delivery_cities', 'kapruka_list_deliveryCities'),
    'check_delivery': ('kapruka_check_delivery',),
    'create_order': ('kapruka_create_order',),
    'track_order': ('kapruka_track_order',),
}


def _normalize(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', name.lower())


class KaprukaMCPClient:
    def __init__(self):
        self.url = settings.mcp_server_url
        self.http = httpx.AsyncClient(timeout=30.0)
        self._session_id: str | None = None
        self._tools: list[dict] | None = None
        self._tool_lookup: dict[str, str] = {}

    def _invalidate_session(self) -> None:
        self._session_id = None
        self._tools = None
        self._tool_lookup = {}

    def _is_session_error(self, exc: Exception) -> bool:
        if not isinstance(exc, httpx.HTTPStatusError):
            return False
        if exc.response.status_code not in {400, 404}:
            return False
        return 'session' in exc.response.text.lower()

    async def _send(self, method: str, params: dict | None = None) -> dict:
        payload: dict[str, Any] = {
            'jsonrpc': '2.0',
            'id': uuid.uuid4().hex,
            'method': method,
        }
        if params:
            payload['params'] = params

        headers = {'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}
        if self._session_id:
            headers['Mcp-Session-Id'] = self._session_id

        resp = await self.http.post(self.url, json=payload, headers=headers)
        resp.raise_for_status()

        if 'mcp-session-id' in resp.headers:
            self._session_id = resp.headers['mcp-session-id']

        content_type = resp.headers.get('content-type', '')
        if 'text/event-stream' in content_type:
            return self._parse_sse(resp.text)
        return resp.json()

    def _parse_sse(self, text: str) -> dict:
        for line in reversed(text.strip().splitlines()):
            if line.startswith('data: '):
                payload = line[6:]
                if payload:
                    return json.loads(payload)
        return {}

    def _rebuild_tool_lookup(self) -> None:
        lookup: dict[str, str] = {}
        for tool in self._tools or []:
            name = tool.get('name')
            if not name:
                continue
            lookup[_normalize(name)] = name
            if name.startswith('kapruka_'):
                lookup.setdefault(_normalize(name.removeprefix('kapruka_')), name)

        for local_name, aliases in _REMOTE_TOOL_ALIASES.items():
            for candidate in (local_name, *aliases):
                lookup.setdefault(_normalize(candidate), candidate)

        self._tool_lookup = lookup

    def resolve_tool_name(self, name: str) -> str:
        normalized = _normalize(name)
        if not self._tool_lookup and self._tools is not None:
            self._rebuild_tool_lookup()
        return self._tool_lookup.get(normalized, name)

    async def initialize(self):
        self._invalidate_session()
        result = await self._send('initialize', {
            'protocolVersion': '2025-03-26',
            'capabilities': {},
            'clientInfo': {'name': 'kapruka-agent', 'version': '1.0.0'},
        })
        logger.info('MCP session established: %s', self._session_id)
        return result

    async def list_tools(self) -> list[dict]:
        if self._tools is None:
            for _ in range(2):
                try:
                    if not self._session_id:
                        await self.initialize()
                    result = await self._send('tools/list')
                    self._tools = result.get('result', {}).get('tools', [])
                    self._rebuild_tool_lookup()
                    break
                except Exception as exc:
                    if not self._is_session_error(exc):
                        raise
                    logger.warning('MCP session missing or stale, reinitializing')
                    self._invalidate_session()
            else:
                raise RuntimeError('Unable to establish MCP session')
        return self._tools

    async def call_tool(self, name: str, arguments: dict) -> Any:
        for _ in range(2):
            try:
                await self.list_tools()
                actual_name = self.resolve_tool_name(name)
                result = await self._send('tools/call', {'name': actual_name, 'arguments': {'params': arguments}})
                content = result.get('result', {}).get('content', [])
                texts = [part.get('text', '') for part in content if part.get('type') == 'text']
                if texts:
                    return "\n".join(texts)
                return result.get('result', {})
            except Exception as exc:
                if not self._is_session_error(exc):
                    raise
                logger.warning('Retrying MCP tool call after session reset: %s', name)
                self._invalidate_session()
        raise RuntimeError(f'Unable to call MCP tool: {name}')

    async def close(self):
        await self.http.aclose()


mcp_client = KaprukaMCPClient()
