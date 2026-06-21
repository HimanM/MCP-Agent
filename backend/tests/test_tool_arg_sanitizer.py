import unittest
from unittest.mock import AsyncMock, patch

from agent.tools import _search_products, build_tool_result_event, coerce_tool_args, format_tool_result_for_model, parse_failed_tool_generation, parse_product_markdown, parse_search_products_markdown


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

    def test_parses_product_and_search_result_markdown(self):
        product_md = (
            "## Birthday Cake Deluxe\n"
            "**ID**: `SKU-123`\n"
            "**Price**: Rs. 4,500\n"
            "**Image**: https://cdn.example.com/cake.jpg\n"
            "[View Product](https://example.com/products/SKU-123)"
        )

        parsed = parse_product_markdown(product_md)
        self.assertEqual(parsed["name"], "Birthday Cake Deluxe")
        self.assertEqual(parsed["product_id"], "SKU-123")
        self.assertEqual(parsed["price"], 4500)
        self.assertEqual(parsed["image_url"], "https://cdn.example.com/cake.jpg")
        self.assertEqual(parsed["product_url"], "https://example.com/products/SKU-123")

        search_md = (
            "## Birthday Cake Deluxe\n"
            "**ID**: `SKU-123`\n"
            "**Price**: Rs. 4,500\n"
            "[View Product](https://example.com/products/SKU-123)\n\n"
            "## Anniversary Bouquet\n"
            "**ID**: `SKU-456`\n"
            "**Price**: Rs. 2,250\n"
            "[View Product](https://example.com/products/SKU-456)\n\n"
            "## Extra Product\n"
            "**ID**: `SKU-789`\n"
            "**Price**: Rs. 1,250\n"
            "[View Product](https://example.com/products/SKU-789)"
        )

        results = parse_search_products_markdown(search_md)
        self.assertEqual([item["product_id"] for item in results], ["SKU-123", "SKU-456", "SKU-789"])
        self.assertEqual(results[0]["product_url"], "https://example.com/products/SKU-123")

        event = build_tool_result_event("search_products", search_md)
        self.assertIn("products", event)
        self.assertEqual(len(event["products"]), 3)

    def test_search_passes_llm_query_to_mcp_unchanged(self):
        with patch("agent.tools.mcp_client.call_tool", new=AsyncMock(return_value="[]")) as call_tool:
            import asyncio

            asyncio.run(_search_products(q="  birthday   cakes  ", limit=50, max_price=5000))

        call_tool.assert_awaited_once_with("kapruka_search_products", {
            "q": "birthday cakes",
            "limit": 10,
            "sort": "relevance",
            "in_stock_only": True,
            "max_price": 5000,
        })

    def test_search_tool_result_tells_model_to_validate_candidates(self):
        content = format_tool_result_for_model("search_products", "[]", "gift for a 1 year old", {"q": "gifts"})

        self.assertIn("These are candidates, not recommendations", content)
        self.assertIn("gift for a 1 year old", content)
        self.assertIn("call search_products again with a better query", content)

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
