import unittest

from config import Settings


class ConfigTest(unittest.TestCase):
    def test_cors_origin_list_strips_whitespace(self):
        settings = Settings(_env_file=None, cors_origins=" http://localhost:3000 , http://127.0.0.1:3000 ")
        self.assertEqual(settings.cors_origin_list, ["http://localhost:3000", "http://127.0.0.1:3000"])

    def test_cors_origin_regex_covers_local_and_vercel(self):
        settings = Settings(_env_file=None)
        self.assertRegex("http://localhost:3000", settings.cors_origin_regex)
        self.assertRegex("http://127.0.0.1:3000", settings.cors_origin_regex)
        self.assertRegex("https://kapruka-mcp-agent-git-main-himanm.vercel.app", settings.cors_origin_regex)


if __name__ == "__main__":
    unittest.main()
