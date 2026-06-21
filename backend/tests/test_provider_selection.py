import importlib
import os
import unittest


class ProviderSelectionTest(unittest.TestCase):
    def _reload_modules(self):
        import config
        import agent.provider_selector as provider_selector
        importlib.reload(config)
        importlib.reload(provider_selector)
        return config, provider_selector

    def test_auto_prefers_openrouter_when_key_present(self):
        env = {
            'LLM_PROVIDER': 'auto',
            'OPENROUTER_API_KEY': 'test-key',
            'GROQ_API_KEY': '',
            'GEMINI_API_KEY': '',
        }
        old = {key: os.environ.get(key) for key in env}
        try:
            os.environ.update(env)
            _, provider_selector = self._reload_modules()
            self.assertEqual(provider_selector.select_provider('hello'), 'openrouter')
            self.assertEqual(provider_selector.select_model('openrouter', 'simple question'), 'openai/gpt-4o-mini')
            self.assertEqual(provider_selector.select_model('openrouter', 'design a complex multi-step MCP workflow'), 'openai/gpt-4.1')
        finally:
            for key, value in old.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
            self._reload_modules()

    def test_explicit_groq_is_respected_when_key_present(self):
        env = {
            'LLM_PROVIDER': 'groq',
            'GROQ_API_KEY': 'test-key',
            'OPENROUTER_API_KEY': '',
            'GEMINI_API_KEY': '',
        }
        old = {key: os.environ.get(key) for key in env}
        try:
            os.environ.update(env)
            _, provider_selector = self._reload_modules()
            self.assertEqual(provider_selector.select_provider('debug this code'), 'groq')
            self.assertEqual(provider_selector.select_model('groq', 'simple question'), 'llama-3.1-8b-instant')
            self.assertEqual(provider_selector.select_model('groq', 'design a complex architecture plan'), 'llama-3.3-70b-versatile')
        finally:
            for key, value in old.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
            self._reload_modules()


if __name__ == '__main__':
    unittest.main()
