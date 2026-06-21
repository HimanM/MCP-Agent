import unittest

from agent.prompts import SYSTEM_PROMPT_EN


class PromptTest(unittest.TestCase):
    def test_search_strategy_keeps_query_judgment_in_llm(self):
        self.assertIn("The backend will not rewrite weak queries for you", SYSTEM_PROMPT_EN)
        self.assertIn("cakes for my anniversary", SYSTEM_PROMPT_EN)
        self.assertIn("try 1-3 smarter follow-up searches", SYSTEM_PROMPT_EN)
        self.assertIn("groceries can become staples", SYSTEM_PROMPT_EN)
        self.assertIn("Do not hallucinate product IDs", SYSTEM_PROMPT_EN)
        self.assertIn("actually satisfies the user's intent", SYSTEM_PROMPT_EN)
        self.assertIn("recipient, age, occasion, relationship, category, constraints, and common sense", SYSTEM_PROMPT_EN)
        self.assertIn("run a better search instead of showing bad options", SYSTEM_PROMPT_EN)
        self.assertIn("Search results are candidates, not recommendations", SYSTEM_PROMPT_EN)
        self.assertIn("If fewer than two products clearly fit", SYSTEM_PROMPT_EN)


if __name__ == "__main__":
    unittest.main()
