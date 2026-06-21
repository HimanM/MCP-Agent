import unittest
from fastapi import HTTPException

from routes.mcp_debug import _validate_debug_params, _validate_debug_tool_name


class MCPDebugRouteTest(unittest.TestCase):
    def test_allows_only_kapruka_tools(self):
        self.assertEqual(_validate_debug_tool_name("kapruka_search_products"), "kapruka_search_products")
        with self.assertRaises(HTTPException):
            _validate_debug_tool_name("search_products")

    def test_rejects_oversized_payloads(self):
        self.assertEqual(_validate_debug_params({"q": "cake"}), {"q": "cake"})
        with self.assertRaises(HTTPException):
            _validate_debug_params({"blob": "x" * 6000})


if __name__ == "__main__":
    unittest.main()
