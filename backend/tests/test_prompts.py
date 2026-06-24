import unittest

from agent.prompts import build_system_prompt, build_user_message


class PromptBuilderTest(unittest.TestCase):
    def test_build_system_prompt_includes_tool_policy_and_relevant_examples(self):
        prompt = build_system_prompt("en", "hello machan just send flowers talking is not needed")
        self.assertIn("Tool policy", prompt)
        self.assertIn("Relevant examples", prompt)
        self.assertIn("flowers alone will not fix this", prompt.lower())

    def test_build_user_message_keeps_summary_compact(self):
        message = build_user_message(
            "Need groceries",
            {"items": [], "budget_max": None},
            {},
            history_summary="Earlier conversation summary: user wanted milk and rice.",
        )
        self.assertIn("<conversation_summary>", message)
        self.assertIn("milk and rice", message)


if __name__ == "__main__":
    unittest.main()
