import unittest

from agent.prompts import SYSTEM_PROMPT_EN, apply_behavior_hint_to_system_prompt, build_user_message, detect_behavior_hint, detect_input_style, enforce_behavior_hint_on_response, get_system_prompt


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
        self.assertIn("Do not assume every shopping problem is a gift problem", SYSTEM_PROMPT_EN)
        self.assertIn("I need to restock groceries for this week under 10000", SYSTEM_PROMPT_EN)
        self.assertIn("need a phone charger today, not too expensive", SYSTEM_PROMPT_EN)
        self.assertIn("I need something decent to wear for an office function", SYSTEM_PROMPT_EN)
        self.assertIn("send flowers to my aunt, she is not well", SYSTEM_PROMPT_EN)
        self.assertIn("best 3-5 items", SYSTEM_PROMPT_EN)
        self.assertIn("ask at most one useful follow-up before searching", SYSTEM_PROMPT_EN)
        self.assertIn("Do not waste the first paragraph repeating the user's request", SYSTEM_PROMPT_EN)

    def test_english_prompt_includes_buddy_style_judgment_examples(self):
        prompt = get_system_prompt("en")
        self.assertIn("If someone says they came home drunk and their wife is mad", prompt)
        self.assertIn("No machan", prompt)
        self.assertIn("Use warm Sri Lankan phrasing when it fits naturally", prompt)
        self.assertIn("If the user has a tight budget", prompt)
        self.assertIn("stay inside it first", prompt)
        self.assertIn("one small add-on", prompt)
        self.assertIn("Do not upsell for the sake of upselling", prompt)
        self.assertIn("hello machan mage wifet aahu una mama iiye raa beela enakota", prompt)
        self.assertIn("Singlish", prompt)
        self.assertIn("Tanglish", prompt)
        self.assertIn("identify the emotional problem first", prompt)
        self.assertIn("reply in the same mixed style", prompt)
        self.assertIn("Do not flatten obvious Singlish or Tanglish into clean corporate English", prompt)
        self.assertIn("Completion Add-Ons", prompt)
        self.assertIn("apology flowers -> maybe one small chocolate add-on", prompt)
        self.assertIn("birthday cake -> maybe candles", prompt)
        self.assertIn("gift item -> maybe one greeting card", prompt)
        self.assertIn("grocery basket -> maybe one obvious missing staple", prompt)
        self.assertIn("close substitutes", prompt)
        self.assertIn("explain the tradeoff briefly", prompt)
        self.assertIn("Soft Correction", prompt)
        self.assertIn("say so kindly and early", prompt)
        self.assertIn("better action", prompt)
        self.assertIn("If the user explicitly refuses the better action", prompt)
        self.assertIn("still say the plan is weak", prompt)

    def test_non_english_prompts_are_loaded_from_markdown_files(self):
        si_prompt = get_system_prompt("si")
        ta_prompt = get_system_prompt("ta")
        self.assertIn("delivery_city", si_prompt)
        self.assertIn("delivery_city", ta_prompt)
        self.assertIn("budget_max", si_prompt)
        self.assertIn("budget_max", ta_prompt)
        self.assertIn("Singlish", si_prompt)
        self.assertIn("Tanglish", ta_prompt)
        self.assertIn("Completion Add-Ons", si_prompt)
        self.assertIn("apology flowers", si_prompt)
        self.assertIn("Completion Add-Ons", ta_prompt)
        self.assertIn("apology flowers", ta_prompt)
        self.assertIn("Soft Correction", si_prompt)
        self.assertIn("Soft Correction", ta_prompt)

    def test_detects_romanized_mixed_language_input_style(self):
        self.assertIn("Singlish", detect_input_style("hello machan mage wifet aahu una mama iiye raa beela enakota"))
        self.assertIn("Do not reply in plain English", detect_input_style("hello machan mage wifet aahu una mama iiye raa beela enakota"))
        self.assertIn("Tanglish", detect_input_style("anna wife kitta konjam kovam irukku da, na yesterday late ah vandhen"))
        self.assertIn("Do not reply in plain English", detect_input_style("anna wife kitta konjam kovam irukku da, na yesterday late ah vandhen"))
        self.assertEqual(detect_input_style("show me a birthday gift under 5000"), "Default")

    def test_build_user_message_includes_input_style_hint(self):
        rendered = build_user_message(
            "anna wife kitta konjam kovam irukku da, na yesterday late ah vandhen",
            {"items": []},
            {},
        )
        self.assertIn("<input_style>", rendered)
        self.assertIn("Tanglish", rendered)

    def test_detects_weak_plan_refusal_hint(self):
        hint = detect_behavior_hint("just send flowers machan, talking is not needed")
        self.assertIn("soft correction required", hint.lower())
        self.assertIn("plan is weak", hint.lower())
        self.assertIn("start your reply", hint.lower())
        self.assertIn("flowers alone will not fix this", hint.lower())

    def test_build_user_message_includes_behavior_hint(self):
        rendered = build_user_message(
            "just send flowers machan, talking is not needed",
            {"items": []},
            {},
        )
        self.assertIn("<behavior_hint>", rendered)
        self.assertIn("soft correction required", rendered.lower())

    def test_applies_behavior_hint_to_system_prompt(self):
        rendered = apply_behavior_hint_to_system_prompt(
            "base prompt",
            "just send flowers machan, talking is not needed",
        )
        self.assertIn("base prompt", rendered)
        self.assertIn("Runtime Behavior Override", rendered)
        self.assertIn("flowers alone will not fix this", rendered.lower())

    def test_enforces_soft_correction_prefix_when_reply_misses_it(self):
        rendered = enforce_behavior_hint_on_response(
            "Here are the best bouquets for your budget.",
            "just send flowers machan, talking is not needed",
            "en",
        )
        self.assertIn("flowers alone will not fix this", rendered.lower())
        self.assertIn("say sorry", rendered.lower())

    def test_keeps_reply_when_soft_correction_already_present(self):
        original = "No machan, flowers alone will not fix this. Talk properly and say sorry first."
        rendered = enforce_behavior_hint_on_response(
            original,
            "just send flowers machan, talking is not needed",
            "en",
        )
        self.assertEqual(rendered, original)


if __name__ == "__main__":
    unittest.main()
