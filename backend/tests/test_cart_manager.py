import unittest
from unittest.mock import AsyncMock, Mock, patch

from cart.manager import CartManager


class CartManagerFallbackTest(unittest.IsolatedAsyncioTestCase):
    async def test_falls_back_to_memory_when_redis_unavailable(self):
        manager = CartManager()
        fake_client = Mock()
        fake_client.ping = AsyncMock(side_effect=ConnectionError("down"))

        with patch("cart.manager.aioredis", Mock(from_url=Mock(return_value=fake_client))):
            cart = await manager.get_cart("session-1")
            self.assertEqual(cart["session_id"], "session-1")
            self.assertEqual(cart["items"], [])
            self.assertTrue(manager._redis_unavailable)

            updated = await manager.add_item(
                "session-1",
                {"product_id": "p1", "name": "Cake", "price": 100},
                quantity=2,
            )
            self.assertEqual(updated["items"][0]["quantity"], 2)
            self.assertEqual(manager._memory_store["session-1"]["items"][0]["product_id"], "p1")

            budgeted = await manager.update_budget("session-1", 5000)
            self.assertEqual(budgeted["budget_max"], 5000)
            self.assertEqual(manager._memory_store["session-1"]["budget_max"], 5000)


if __name__ == "__main__":
    unittest.main()
