from __future__ import annotations

import logging
import time
from typing import Any

try:
    import redis.asyncio as aioredis
except ImportError:  # pragma: no cover - fallback for environments without redis installed
    aioredis = None

from config import settings

logger = logging.getLogger(__name__)
RATE_LIMIT_PREFIX = "ratelimit:"


class RateLimiter:
    def __init__(self):
        self.redis: Any = None
        self._redis_unavailable = False
        self._memory_store: dict[str, tuple[int, int]] = {}

    async def _get_redis(self):
        if aioredis is None or self._redis_unavailable:
            return None
        if self.redis is None:
            try:
                self.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
                await self.redis.ping()
            except Exception as exc:
                logger.warning("Redis unavailable, using in-memory rate limiting: %s", exc)
                self._redis_unavailable = True
                self.redis = None
                return None
        return self.redis

    async def check(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        if limit <= 0 or window_seconds <= 0:
            return True, 0

        now = int(time.time())
        bucket = now // window_seconds
        retry_after = window_seconds - (now % window_seconds) or window_seconds
        namespaced_key = f"{RATE_LIMIT_PREFIX}{key}:{bucket}"
        redis_client = await self._get_redis()

        if redis_client is not None:
            try:
                current = await redis_client.incr(namespaced_key)
                if current == 1:
                    await redis_client.expire(namespaced_key, window_seconds)
                return current <= limit, retry_after
            except Exception as exc:
                logger.warning("Redis rate limit failed, falling back to memory: %s", exc)
                self._redis_unavailable = True
                self.redis = None

        entry = self._memory_store.get(namespaced_key)
        count = 1 if entry is None else entry[0] + 1
        self._memory_store[namespaced_key] = (count, now + retry_after)
        return count <= limit, retry_after


rate_limiter = RateLimiter()
