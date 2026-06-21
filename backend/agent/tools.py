from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable

from cart.manager import cart_manager
from mcp.client import mcp_client

logger = logging.getLogger(__name__)


_NULL_STRINGS = {"", "null", "none", "undefined", "n/a"}


def _is_nullish(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip().lower() in _NULL_STRINGS)


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


def _coerce_int(value: Any) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        return int(value.strip().replace(",", ""))
    return int(value)


def _tool_properties(name: str) -> dict[str, dict]:
    tool = next((tool_def for tool_def in TOOLS_DEFINITION if tool_def["name"] == name), None)
    if not tool:
        return {}
    return tool.get("parameters", {}).get("properties", {})


def coerce_tool_args(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Clean model-generated tool args before executing local/MCP tools."""
    properties = _tool_properties(name)
    coerced: dict[str, Any] = {}

    for key, value in args.items():
        if _is_nullish(value):
            continue

        expected_type = properties.get(key, {}).get("type")
        try:
            if expected_type == "integer":
                int_value = _coerce_int(value)
                if int_value == 0 and key in {"min_price", "max_price"}:
                    continue
                coerced[key] = int_value
            elif expected_type == "boolean":
                coerced[key] = _coerce_bool(value)
            elif expected_type == "string":
                coerced[key] = str(value).strip()
            else:
                coerced[key] = value
        except (TypeError, ValueError):
            logger.warning("Dropping invalid tool arg %s.%s=%r", name, key, value)

    return coerced


def parse_failed_tool_generation(failed_generation: str) -> tuple[str, dict[str, Any]] | None:
    """Parse Groq failed_generation snippets like <function=name{...}</function>."""
    match = re.search(
        r"<function=([a-zA-Z_][\w]*)(?:\[\])?\s*(\{.*?\})(?:</function>|<function>)",
        failed_generation,
        re.DOTALL,
    )
    if not match:
        return None
    try:
        return match.group(1), json.loads(match.group(2))
    except json.JSONDecodeError:
        logger.warning("Could not parse failed tool generation: %s", failed_generation)
        return None


def parse_product_markdown(text: str) -> dict:
    """Parse Kapruka markdown product response into structured dict."""
    result = {"name": "", "product_id": "", "price": 0, "image_url": "", "raw": text}

    name_match = re.search(r"^## (.+)$", text, re.MULTILINE)
    if name_match:
        result["name"] = name_match.group(1).strip()

    id_match = re.search(r"\*\*ID\*\*:\s*`?([^`\n]+)`?", text)
    if id_match:
        result["product_id"] = id_match.group(1).strip()

    price_match = re.search(r"\*\*Price\*\*:\s*(?:LKR|Rs\.?)\s*([\d,]+)", text)
    if price_match:
        result["price"] = int(price_match.group(1).replace(",", ""))

    img_match = re.search(r"\*\*Image\*\*:\s*(https?://\S+)", text)
    if img_match:
        result["image_url"] = img_match.group(1)

    return result


async def _search_products(q: str = "", category: str = "", min_price: int = 0,
                           max_price: int = 0, in_stock_only: bool = True,
                           sort: str = "relevance", limit: int = 10, **_) -> Any:
    args: dict[str, Any] = {"q": q, "limit": limit, "sort": sort, "in_stock_only": in_stock_only}
    if category:
        args["category"] = category
    if min_price > 0:
        args["min_price"] = min_price
    if max_price > 0:
        args["max_price"] = max_price
    return await mcp_client.call_tool("kapruka_search_products", args)


async def _get_product(product_id: str, **_) -> Any:
    return await mcp_client.call_tool("kapruka_get_product", {"product_id": product_id})


async def _list_categories(depth: int = 1, **_) -> Any:
    return await mcp_client.call_tool("kapruka_list_categories", {"depth": depth})


async def _list_delivery_cities(query: str = "", limit: int = 10, **_) -> Any:
    return await mcp_client.call_tool("kapruka_list_delivery_cities", {"query": query, "limit": limit})


async def _check_delivery(city: str, delivery_date: str, product_id: str, **_) -> Any:
    return await mcp_client.call_tool("kapruka_check_delivery", {
        "city": city, "delivery_date": delivery_date, "product_id": product_id
    })


async def _add_to_cart(session_id: str, product_id: str, quantity: int = 1, **_) -> str:
    raw = await mcp_client.call_tool("kapruka_get_product", {"product_id": product_id})

    product_data = parse_product_markdown(raw) if isinstance(raw, str) else {
        "name": product_id, "product_id": product_id, "price": 0, "image_url": ""
    }

    if not product_data["name"]:
        product_data["name"] = product_id
    if not product_data["product_id"]:
        product_data["product_id"] = product_id

    cart_product = {
        "product_id": product_data["product_id"],
        "name": product_data["name"],
        "price": product_data["price"],
        "image_url": product_data["image_url"],
    }

    await cart_manager.add_item(session_id, cart_product, quantity=quantity, added_by="agent")
    return f"Added {quantity}x {cart_product['name']} (Rs. {cart_product['price']}) to cart"


async def _remove_from_cart(session_id: str, product_id: str, **_) -> str:
    cart = await cart_manager.get_cart(session_id)
    item_name = next((i["name"] for i in cart["items"] if i["product_id"] == product_id), product_id)
    await cart_manager.remove_item(session_id, product_id)
    return f"Removed {item_name} from cart"


async def _update_cart_quantity(session_id: str, product_id: str, quantity: int, **_) -> str:
    await cart_manager.update_quantity(session_id, product_id, quantity)
    if quantity <= 0:
        return f"Removed {product_id} from cart"
    return f"Updated {product_id} quantity to {quantity}"


async def _get_cart(session_id: str, **_) -> str:
    cart = await cart_manager.get_cart(session_id)
    if not cart.get("items"):
        return "Cart is empty"
    lines = []
    for item in cart["items"]:
        lines.append(f"- {item['product_id']}: {item['name']} x{item['quantity']} = Rs. {item['price'] * item['quantity']}")
    total = sum(i["price"] * i["quantity"] for i in cart["items"])
    lines.append(f"Total: Rs. {total}")

    checkout = []
    if cart.get("recipient", {}).get("name"):
        checkout.append(f"Recipient: {cart['recipient']['name']}, {cart['recipient'].get('phone', '')}, {cart['recipient'].get('address', '')}")
    if cart.get("delivery", {}).get("city"):
        checkout.append(f"Delivery: {cart['delivery']['city']} on {cart['delivery'].get('date', 'TBD')}")
    if cart.get("sender", {}).get("name"):
        checkout.append(f"Sender: {cart['sender']['name']}")
    if checkout:
        lines.append("Checkout info: " + " | ".join(checkout))
    return "\n".join(lines)


async def _update_checkout_info(session_id: str, field: str, value: str, **_) -> str:
    cart = await cart_manager.get_cart(session_id)
    if field == "recipient_name":
        cart.setdefault("recipient", {})["name"] = value
    elif field == "recipient_phone":
        cart.setdefault("recipient", {})["phone"] = value
    elif field == "delivery_address":
        cart.setdefault("delivery", {})["address"] = value
    elif field == "delivery_city":
        cart.setdefault("delivery", {})["city"] = value
    elif field == "delivery_date":
        cart.setdefault("delivery", {})["date"] = value
    elif field == "sender_name":
        cart.setdefault("sender", {})["name"] = value
    elif field == "gift_message":
        cart["gift_message"] = value
    else:
        return f"Unknown field: {field}"
    await cart_manager.save_cart(session_id, cart)
    return f"Updated {field} to: {value}"


async def _checkout(session_id: str, **_) -> str:
    cart = await cart_manager.get_cart(session_id)
    if not cart.get("items"):
        return "Cart is empty. Add items before checking out."

    recipient = cart.get("recipient", {})
    delivery = cart.get("delivery", {})
    sender = cart.get("sender", {})

    missing = []
    if not recipient.get("name"):
        missing.append("recipient name")
    if not recipient.get("phone"):
        missing.append("recipient phone")
    if not delivery.get("address"):
        missing.append("delivery address")
    if not delivery.get("city"):
        missing.append("delivery city")
    if not delivery.get("date"):
        missing.append("delivery date")
    if not sender.get("name"):
        missing.append("sender name")

    if missing:
        return f"MISSING_INFO: {', '.join(missing)}"

    cart_items = [{"product_id": i["product_id"], "quantity": i["quantity"]} for i in cart["items"]]

    order_data = {
        "cart": cart_items,
        "recipient": {
            "name": recipient["name"],
            "phone": recipient["phone"],
        },
        "delivery": {
            "address": delivery["address"],
            "city": delivery["city"],
            "date": delivery["date"],
        },
        "sender": {
            "name": sender["name"],
        },
    }
    if cart.get("gift_message"):
        order_data["gift_message"] = cart["gift_message"]

    result = await mcp_client.call_tool("kapruka_create_order", order_data)
    return str(result)


TOOLS_DEFINITION = [
    {
        "name": "search_products",
        "description": "Search Kapruka product catalog by keyword with optional category, price range, and stock filters.",
        "parameters": {
            "type": "object",
            "properties": {
                "q": {"type": "string", "description": "Search keyword"},
                "category": {"type": "string", "description": "Category filter"},
                "min_price": {"type": "integer", "description": "Minimum price in LKR"},
                "max_price": {"type": "integer", "description": "Maximum price in LKR"},
                "in_stock_only": {"type": "boolean", "description": "Only show in-stock items", "default": True},
                "sort": {"type": "string", "description": "Sort order", "default": "relevance"},
                "limit": {"type": "integer", "description": "Number of results", "default": 10},
            },
            "required": ["q"],
        },
    },
    {
        "name": "get_product",
        "description": "Get full details for a specific product by its ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string", "description": "Product ID"},
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "list_categories",
        "description": "List top-level product categories on Kapruka.",
        "parameters": {
            "type": "object",
            "properties": {
                "depth": {"type": "integer", "description": "Category tree depth", "default": 1},
            },
        },
    },
    {
        "name": "list_delivery_cities",
        "description": "Search Kapruka delivery network for a city.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "City name to search"},
                "limit": {"type": "integer", "description": "Max results", "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "check_delivery",
        "description": "Check if a product can be delivered to a city on a given date.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "Delivery city"},
                "delivery_date": {"type": "string", "description": "Delivery date (YYYY-MM-DD)"},
                "product_id": {"type": "string", "description": "Product ID to check"},
            },
            "required": ["city", "delivery_date", "product_id"],
        },
    },
    {
        "name": "add_to_cart",
        "description": "Add a product to the user's shopping cart. Use this when user wants to add an item.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
                "product_id": {"type": "string", "description": "Product ID to add"},
                "quantity": {"type": "integer", "description": "Quantity to add", "default": 1},
            },
            "required": ["session_id", "product_id"],
        },
    },
    {
        "name": "remove_from_cart",
        "description": "Remove a product from the user's shopping cart.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
                "product_id": {"type": "string", "description": "Product ID to remove"},
            },
            "required": ["session_id", "product_id"],
        },
    },
    {
        "name": "update_cart_quantity",
        "description": "Update the quantity of a product in the cart. Set to 0 to remove.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
                "product_id": {"type": "string", "description": "Product ID"},
                "quantity": {"type": "integer", "description": "New quantity"},
            },
            "required": ["session_id", "product_id", "quantity"],
        },
    },
    {
        "name": "get_cart",
        "description": "Get the current state of the user's shopping cart with all items, totals, and checkout info.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
            },
            "required": ["session_id"],
        },
    },
    {
        "name": "update_checkout_info",
        "description": "Save checkout information (recipient, delivery, sender details) to the cart. Call this as the user provides each piece of info during checkout.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
                "field": {
                    "type": "string",
                    "description": "Which field to update",
                    "enum": ["recipient_name", "recipient_phone", "delivery_address", "delivery_city", "delivery_date", "sender_name", "gift_message"],
                },
                "value": {"type": "string", "description": "The value to save"},
            },
            "required": ["session_id", "field", "value"],
        },
    },
    {
        "name": "checkout",
        "description": "Place the order using the current cart contents. Call this AFTER all checkout info is saved. If info is missing, it returns what's needed.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
            },
            "required": ["session_id"],
        },
    },
]

TOOL_MAP: dict[str, Callable] = {
    "search_products": _search_products,
    "get_product": _get_product,
    "list_categories": _list_categories,
    "list_delivery_cities": _list_delivery_cities,
    "check_delivery": _check_delivery,
    "add_to_cart": _add_to_cart,
    "remove_from_cart": _remove_from_cart,
    "update_cart_quantity": _update_cart_quantity,
    "get_cart": _get_cart,
    "update_checkout_info": _update_checkout_info,
    "checkout": _checkout,
}


async def execute_tool(name: str, args: dict) -> str:
    fn = TOOL_MAP.get(name)
    if fn is None:
        return f"Unknown tool: {name}"
    try:
        result = await fn(**coerce_tool_args(name, args))
        return json.dumps(result) if isinstance(result, (dict, list)) else str(result)
    except Exception as e:
        logger.exception("Tool %s failed", name)
        return f"Error executing {name}: {e}"
