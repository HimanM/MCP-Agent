import unittest

from agent.tools import coerce_tool_args, parse_failed_tool_generation


class ToolArgSanitizerTest(unittest.TestCase):
    def test_parses_failed_generation_and_coerces_search_args(self):
        failed_generation = (
            '<function=search_products{"q": "gifts for mom", "category": "null", '
            '"in_stock_only": "true", "limit": "5", "min_price": "0", '
            '"max_price": "10000", "sort": "relevance"}</function>'
        )

        parsed = parse_failed_tool_generation(failed_generation)

        self.assertEqual(parsed, ("search_products", {
            "q": "gifts for mom",
            "category": "null",
            "in_stock_only": "true",
            "limit": "5",
            "min_price": "0",
            "max_price": "10000",
            "sort": "relevance",
        }))

        coerced = coerce_tool_args(parsed[0], parsed[1])

        self.assertEqual(coerced, {
            "q": "gifts for mom",
            "in_stock_only": True,
            "limit": 5,
            "max_price": 10000,
            "sort": "relevance",
        })

    def test_coerces_quantity_and_drops_empty_values(self):
        self.assertEqual(
            coerce_tool_args("add_to_cart", {"product_id": "ABC", "quantity": "2", "note": ""}),
            {"product_id": "ABC", "quantity": 2},
        )

    def test_parses_bracketed_failed_generation(self):
        failed_generation = (
            '<function=search_products[]{"q": "gifts for mom", '
            '"in_stock_only": true, "limit": 10, "sort": "relevance"}<function>'
        )

        parsed = parse_failed_tool_generation(failed_generation)

        self.assertEqual(parsed, ("search_products", {
            "q": "gifts for mom",
            "in_stock_only": True,
            "limit": 10,
            "sort": "relevance",
        }))


if __name__ == "__main__":
    unittest.main()
