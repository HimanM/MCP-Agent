import unittest
from unittest.mock import AsyncMock

from mcp.client import KaprukaMCPClient


class MCPClientTest(unittest.TestCase):
    def test_resolves_known_aliases(self):
        client = KaprukaMCPClient()
        client._tools = [
            {'name': 'kapruka_list_deliveryCities'},
            {'name': 'kapruka_get_product'},
            {'name': 'kapruka_create_order'},
        ]
        client._rebuild_tool_lookup()

        self.assertEqual(client.resolve_tool_name('list_delivery_cities'), 'kapruka_list_deliveryCities')
        self.assertEqual(client.resolve_tool_name('kapruka_get_product'), 'kapruka_get_product')
        self.assertEqual(client.resolve_tool_name('checkout'), 'checkout')

    def test_wraps_arguments_in_params_for_mcp_calls(self):
        client = KaprukaMCPClient()
        client.list_tools = AsyncMock(return_value=[])
        client.resolve_tool_name = lambda name: f'kapruka_{name}'
        client._send = AsyncMock(return_value={'result': {'content': []}})

        import asyncio
        asyncio.run(client.call_tool('search_products', {'q': 'cake', 'limit': 5}))

        client._send.assert_awaited_once()
        call = client._send.await_args
        assert call is not None
        args = call.args
        self.assertEqual(args[0], 'tools/call')
        self.assertEqual(args[1]['arguments'], {'params': {'q': 'cake', 'limit': 5}})


if __name__ == '__main__':
    unittest.main()
