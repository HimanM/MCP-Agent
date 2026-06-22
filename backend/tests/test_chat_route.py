import unittest

from routes.chat import _needs_order_number_prompt


class ChatRouteTest(unittest.TestCase):
    def test_prompts_for_order_number_when_tracking_without_one(self):
        self.assertTrue(_needs_order_number_prompt("I want to track my order"))
        self.assertTrue(_needs_order_number_prompt("Can you check my order status?"))

    def test_skips_prompt_when_order_number_is_present(self):
        self.assertFalse(_needs_order_number_prompt("Track order 12345678"))
        self.assertFalse(_needs_order_number_prompt("Track order VCOME12DC0B1"))


if __name__ == "__main__":
    unittest.main()
