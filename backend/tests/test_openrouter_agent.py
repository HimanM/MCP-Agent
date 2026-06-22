import unittest

from agent.openrouter_agent import _format_openrouter_error


class OpenRouterAgentTest(unittest.TestCase):
    def test_formats_rate_limit_error_for_users(self):
        message = _format_openrouter_error(Exception("Client error '429 Too Many Requests' for url"))
        self.assertEqual(message, "The AI model is busy right now. Please wait a little and try again.")


if __name__ == "__main__":
    unittest.main()
