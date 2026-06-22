import unittest

from rate_limit import RateLimiter


class RateLimiterTest(unittest.IsolatedAsyncioTestCase):
    async def test_blocks_after_limit_in_memory_mode(self):
        limiter = RateLimiter()
        limiter._redis_unavailable = True

        allowed, retry_after = await limiter.check("chat:127.0.0.1", limit=2, window_seconds=60)
        self.assertTrue(allowed)
        self.assertGreater(retry_after, 0)

        allowed, _ = await limiter.check("chat:127.0.0.1", limit=2, window_seconds=60)
        self.assertTrue(allowed)

        allowed, retry_after = await limiter.check("chat:127.0.0.1", limit=2, window_seconds=60)
        self.assertFalse(allowed)
        self.assertGreater(retry_after, 0)


if __name__ == "__main__":
    unittest.main()
