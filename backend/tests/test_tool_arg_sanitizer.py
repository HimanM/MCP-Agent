import unittest
from unittest.mock import AsyncMock, patch

from agent.tools import _search_products, build_tool_result_event, coerce_tool_args, format_tool_result_for_model, parse_checkout_result, parse_failed_tool_generation, parse_product_markdown, parse_search_products_markdown, parse_tracking_result


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
        content = format_tool_result_for_model("search_products", '[{"name":"Cake","product_id":"SKU-1","price":4500,"raw":"ignore-me"}]', "gift for a 1 year old", {"q": "gifts"})

        self.assertIn("These are candidates, not recommendations", content)
        self.assertIn("gift for a 1 year old", content)
        self.assertIn("call search_products again with a better query", content)
        self.assertIn("keep the answer compact", content)
        self.assertIn("best 3-5 items", content)
        self.assertIn("one clear next step", content)
        self.assertIn("closest useful substitute", content)
        self.assertIn("explain the tradeoff briefly", content)
        self.assertIn('"name": "Cake"', content)
        self.assertNotIn("ignore-me", content)

    def test_ignores_tool_error_when_parsing_products(self):
        error_text = "Error executing search_products: Client error '400 Bad Request' for url 'https://mcp.kapruka.com/mcp'"

        self.assertEqual(parse_search_products_markdown(error_text), [])
        event = build_tool_result_event("search_products", error_text)
        self.assertNotIn("products", event)

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

    def test_parses_tracking_result_and_emits_tracking_event(self):
        tracking_json = """{
            "order_number": "12345678",
            "status": "Out for delivery",
            "recipient_name": "Alex",
            "estimated_delivery": "2026-06-30",
            "current_location": "Colombo",
            "items": [{"name": "Chocolate Box", "quantity": 1}],
            "timeline": [
                {"status": "Out for delivery", "timestamp": "2026-06-29 10:30", "location": "Colombo"},
                {"status": "Processed", "timestamp": "2026-06-28 18:00"}
            ]
        }"""

        parsed = parse_tracking_result(tracking_json)
        self.assertEqual(parsed["order_number"], "12345678")
        self.assertEqual(parsed["status"], "Out for delivery")
        self.assertEqual(parsed["recipient"], "Alex")
        self.assertEqual(parsed["items"][0]["name"], "Chocolate Box")
        self.assertEqual(parsed["events"][0]["label"], "Out for delivery")

        event = build_tool_result_event("track_order", tracking_json)
        self.assertIn("tracking", event)
        self.assertEqual(event["tracking"]["location"], "Colombo")

    def test_parses_markdown_tracking_result(self):
        tracking_markdown = """## Order `VCOME12DC0B1` — Delivered

| | |
|---|---|
| Total | {'value': '720', 'currency': 'LKR'} |
| Delivery date | 1 / MAY / 2019 |

**Delivering to**
- KALPANA NAYANAMADHU
- CHAMUDI GUNASINGHE 671/C1 BATALANDA ROAD RAGAMA

**Progress**
- APR 30, 2019 3:14 PM — Order Confirmed and Awaiting preparation
- MAY 1, 2019 1:32 PM — Order has been delivered
"""

        parsed = parse_tracking_result(tracking_markdown)
        self.assertEqual(parsed["order_number"], "VCOME12DC0B1")
        self.assertEqual(parsed["status"], "Delivered")
        self.assertEqual(parsed["recipient"], "KALPANA NAYANAMADHU")
        self.assertEqual(parsed["estimated_delivery"], "1 / MAY / 2019")
        self.assertEqual(len(parsed["events"]), 2)

    def test_parses_checkout_result_and_emits_order_event(self):
        checkout_json = """{
            "order_number": "ORD-12345",
            "payment_url": "https://pay.kapruka.com/checkout/ORD-12345",
            "total": {"amount": 12500, "currency": "LKR"},
            "expires_at": "2026-06-21T20:00:00+05:30"
        }"""

        parsed = parse_checkout_result(checkout_json)
        self.assertEqual(parsed["order_number"], "ORD-12345")
        self.assertEqual(parsed["payment_url"], "https://pay.kapruka.com/checkout/ORD-12345")
        self.assertEqual(parsed["total"], 12500)
        self.assertEqual(parsed["currency"], "LKR")

        event = build_tool_result_event("checkout", checkout_json)
        self.assertIn("order", event)
        self.assertEqual(event["order"]["expires_at"], "2026-06-21T20:00:00+05:30")

    def test_checkout_missing_info_stays_plain_text(self):
        event = build_tool_result_event("checkout", "MISSING_INFO: recipient phone, delivery date")
        self.assertNotIn("order", event)

    def test_checkout_ignores_word_fragment_as_order_number(self):
        parsed = parse_checkout_result("Order created successfully. Complete payment at https://pay.example.com/x")
        self.assertEqual(parsed["payment_url"], "https://pay.example.com/x")
        self.assertEqual(parsed["order_number"], "")


if __name__ == "__main__":
    unittest.main()
