import importlib
import os
import unittest


class ChatRoutingTest(unittest.TestCase):
    def _reload_modules(self):
        import config
        import agent.provider_selector as provider_selector
        import routes.chat as chat_route

        importlib.reload(config)
        importlib.reload(provider_selector)
        importlib.reload(chat_route)
        return chat_route

    def test_auto_provider_stays_on_openrouter_when_available(self):
        env = {
            "LLM_PROVIDER": "auto",
            "OPENROUTER_API_KEY": "test-key",
            "GROQ_API_KEY": "groq-key",
            "GEMINI_API_KEY": "",
        }
        old = {key: os.environ.get(key) for key in env}
        try:
            os.environ.update(env)
            chat_route = self._reload_modules()
            self.assertEqual(chat_route._provider_fallback_order("need office wear suggestions"), ["openrouter"])
        finally:
            for key, value in old.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
            self._reload_modules()

    def test_explicit_openrouter_falls_back_only_when_configured_provider_is_unavailable(self):
        env = {
            "LLM_PROVIDER": "openrouter",
            "OPENROUTER_API_KEY": "",
            "GROQ_API_KEY": "groq-key",
            "GEMINI_API_KEY": "",
        }
        old = {key: os.environ.get(key) for key in env}
        try:
            os.environ.update(env)
            chat_route = self._reload_modules()
            self.assertEqual(chat_route._provider_fallback_order("hello machan"), ["groq"])
        finally:
            for key, value in old.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
            self._reload_modules()


if __name__ == "__main__":
    unittest.main()
