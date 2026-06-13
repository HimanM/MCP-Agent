from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any

import redis.asyncio as aioredis

from config import settings

logger = logging.getLogger(__name__)

CART_PREFIX = "cart:"
CTX_PREFIX = "ctx:"


def _now() -> float:
    return time.time()


class CartManager:
    def __init__(self):
        self.redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self.redis is None:
            self.redis = aioredis.from_url(
                settings.redis_url, decode_responses=True
            )
        return self.redis

    async def _refresh_ttl(self, session_id: str):
        r = await self._get_redis()
        await r.expire(f"{CART_PREFIX}{session_id}", settings.session_ttl_seconds)
        await r.expire(f"{CTX_PREFIX}{session_id}", settings.session_ttl_seconds)

    async def get_cart(self, session_id: str) -> dict:
        r = await self._get_redis()
        raw = await r.get(f"{CART_PREFIX}{session_id}")
        if raw:
            await self._refresh_ttl(session_id)
            return json.loads(raw)
        return {"session_id": session_id, "items": [], "recipient": {}, "delivery": {}, "sender": {}, "gift_message": ""}

    async def save_cart(self, session_id: str, cart: dict):
        r = await self._get_redis()
        await r.set(f"{CART_PREFIX}{session_id}", json.dumps(cart))
        await self._refresh_ttl(session_id)

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

    async def get_total(self, session_id: str) -> int:
        cart = await self.get_cart(session_id)
        return sum(i["price"] * i["quantity"] for i in cart["items"])

    async def get_context(self, session_id: str) -> dict:
        r = await self._get_redis()
        raw = await r.get(f"{CTX_PREFIX}{session_id}")
        if raw:
            return json.loads(raw)
        return {
            "occasion": "",
            "preferences": [],
            "budget_max": None,
            "excluded_items": [],
            "delivery_city": "",
            "delivery_date": "",
            "recipient_name": "",
        }

    async def save_context(self, session_id: str, ctx: dict):
        r = await self._get_redis()
        await r.set(f"{CTX_PREFIX}{session_id}", json.dumps(ctx))
        await self._refresh_ttl(session_id)

    async def get_full_state(self, session_id: str) -> dict:
        cart = await self.get_cart(session_id)
        ctx = await self.get_context(session_id)
        return {"cart": cart, "context": ctx}


cart_manager = CartManager()
