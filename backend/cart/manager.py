from __future__ import annotations

import json
import logging
import time
from typing import Any

try:
    import redis.asyncio as aioredis
except ImportError:  # pragma: no cover - fallback for environments without redis installed
    aioredis = None

from config import settings

logger = logging.getLogger(__name__)
CART_PREFIX = "cart:"
CTX_PREFIX = "ctx:"


def _now() -> float:
    return time.time()


class CartManager:
    def __init__(self):
        self.redis: Any = None
        self._redis_unavailable = False
        self._memory_store: dict[str, dict] = {}
        self._memory_ctx: dict[str, dict] = {}

    async def _get_redis(self):
        if aioredis is None or self._redis_unavailable:
            return None
        if self.redis is None:
            try:
                self.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
                await self.redis.ping()
            except Exception as exc:
                logger.warning("Redis unavailable, using in-memory cart state: %s", exc)
                self._redis_unavailable = True
                self.redis = None
                return None
        return self.redis

    async def _refresh_ttl(self, session_id: str):
        r = await self._get_redis()
        if r is None:
            return
        try:
            await r.expire(f"{CART_PREFIX}{session_id}", settings.session_ttl_seconds)
            await r.expire(f"{CTX_PREFIX}{session_id}", settings.session_ttl_seconds)
        except Exception as exc:
            logger.warning("Redis TTL refresh failed, falling back to memory: %s", exc)
            self._redis_unavailable = True
            self.redis = None

    async def get_cart(self, session_id: str) -> dict:
        default_cart = {"session_id": session_id, "items": [], "recipient": {}, "delivery": {}, "sender": {}, "gift_message": "", "budget_max": None}
        r = await self._get_redis()
        if r is None:
            cart = self._memory_store.get(session_id, default_cart)
            cart.setdefault("budget_max", None)
            return cart

        try:
            raw = await r.get(f"{CART_PREFIX}{session_id}")
            if raw:
                await self._refresh_ttl(session_id)
                cart = json.loads(raw)
                cart.setdefault("budget_max", None)
                return cart
            return default_cart
        except Exception as exc:
            logger.warning("Redis cart read failed, falling back to memory: %s", exc)
            self._redis_unavailable = True
            self.redis = None
            return self._memory_store.get(session_id, default_cart)

    async def save_cart(self, session_id: str, cart: dict):
        r = await self._get_redis()
        if r is None:
            self._memory_store[session_id] = cart
            return
        try:
            await r.set(f"{CART_PREFIX}{session_id}", json.dumps(cart))
            await self._refresh_ttl(session_id)
        except Exception as exc:
            logger.warning("Redis cart write failed, falling back to memory: %s", exc)
            self._redis_unavailable = True
            self.redis = None
            self._memory_store[session_id] = cart

    async def add_item(self, session_id: str, product: dict, quantity: int = 1, added_by: str = "manual") -> dict:
        cart = await self.get_cart(session_id)
        pid = product.get("product_id", product.get("id", ""))

        for item in cart["items"]:
            if item["product_id"] == pid:
                item["quantity"] += quantity
                await self.save_cart(session_id, cart)
                return cart

        cart["items"].append({
            "product_id": pid,
            "name": product.get("name", ""),
            "price": product.get("price", 0),
            "quantity": quantity,
            "image_url": product.get("image_url", product.get("images", [""])[0] if product.get("images") else ""),
            "added_by": added_by,
            "added_at": _now(),
        })
        await self.save_cart(session_id, cart)
        return cart

    async def remove_item(self, session_id: str, product_id: str) -> dict:
        cart = await self.get_cart(session_id)
        cart["items"] = [i for i in cart["items"] if i["product_id"] != product_id]
        await self.save_cart(session_id, cart)
        return cart

    async def update_quantity(self, session_id: str, product_id: str, quantity: int) -> dict:
        cart = await self.get_cart(session_id)
        if quantity <= 0:
            cart["items"] = [i for i in cart["items"] if i["product_id"] != product_id]
        else:
            for item in cart["items"]:
                if item["product_id"] == product_id:
                    item["quantity"] = quantity
                    break
        await self.save_cart(session_id, cart)
        return cart

    async def clear_cart(self, session_id: str) -> dict:
        cart = await self.get_cart(session_id)
        cart["items"] = []
        await self.save_cart(session_id, cart)
        return cart

    async def update_checkout_info(self, session_id: str, **fields) -> dict:
        cart = await self.get_cart(session_id)
        for key, val in fields.items():
            if key in ("recipient", "delivery", "sender", "gift_message"):
                cart[key] = val
        await self.save_cart(session_id, cart)
        return cart

    async def update_budget(self, session_id: str, budget_max: int | None) -> dict:
        cart = await self.get_cart(session_id)
        cart["budget_max"] = budget_max
        await self.save_cart(session_id, cart)

        ctx = await self.get_context(session_id)
        ctx["budget_max"] = budget_max
        await self.save_context(session_id, ctx)
        return cart

    async def get_total(self, session_id: str) -> int:
        cart = await self.get_cart(session_id)
        return sum(i["price"] * i["quantity"] for i in cart["items"])

    async def get_context(self, session_id: str) -> dict:
        default_ctx = {
            "occasion": "",
            "preferences": [],
            "budget_max": None,
            "excluded_items": [],
            "delivery_city": "",
            "delivery_date": "",
            "recipient_name": "",
            "llm_usage": {},
        }
        r = await self._get_redis()
        if r is None:
            return self._memory_ctx.get(session_id, default_ctx)

        try:
            raw = await r.get(f"{CTX_PREFIX}{session_id}")
            if raw:
                return json.loads(raw)
            return default_ctx
        except Exception as exc:
            logger.warning("Redis context read failed, falling back to memory: %s", exc)
            self._redis_unavailable = True
            self.redis = None
            return self._memory_ctx.get(session_id, default_ctx)

    async def save_context(self, session_id: str, ctx: dict):
        r = await self._get_redis()
        if r is None:
            self._memory_ctx[session_id] = ctx
            return
        try:
            await r.set(f"{CTX_PREFIX}{session_id}", json.dumps(ctx))
            await self._refresh_ttl(session_id)
        except Exception as exc:
            logger.warning("Redis context write failed, falling back to memory: %s", exc)
            self._redis_unavailable = True
            self.redis = None
            self._memory_ctx[session_id] = ctx

    async def save_llm_usage(self, session_id: str, usage: dict):
        ctx = await self.get_context(session_id)
        ctx["llm_usage"] = usage
        await self.save_context(session_id, ctx)

    async def get_full_state(self, session_id: str) -> dict:
        cart = await self.get_cart(session_id)
        ctx = await self.get_context(session_id)
        return {"cart": cart, "context": ctx}


cart_manager = CartManager()
