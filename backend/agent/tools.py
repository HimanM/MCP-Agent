from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable
from urllib.parse import urljoin, urlparse

import httpx

from cart.manager import cart_manager
from mcp.client import mcp_client

logger = logging.getLogger(__name__)
http_client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)

_IMAGE_FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.kapruka.com/",
}

_NULL_STRINGS = {"", "null", "none", "undefined", "n/a"}


def _is_nullish(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip().lower() in _NULL_STRINGS)


def _looks_like_tool_error(raw: str) -> bool:
    lowered = (raw or "").strip().lower()
    return lowered.startswith("error executing ") or "client error '" in lowered or "missing session id" in lowered


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


def _first_url(text: str, label: str | None = None) -> str:
    if label:
        label_match = re.search(rf"\[{re.escape(label)}\]\((https?://[^)]+)\)", text, re.IGNORECASE)
        if label_match:
            return label_match.group(1).strip()
    url_match = re.search(r"https?://[^\s)\]]+", text)
    return url_match.group(0).strip() if url_match else ""


def _absolute_url(base_url: str, maybe_relative: str) -> str:
    if not maybe_relative:
        return ""
    if maybe_relative.startswith("http://") or maybe_relative.startswith("https://"):
        return maybe_relative
    if not base_url:
        return maybe_relative
    return urljoin(base_url, maybe_relative)


def _extract_meta_content(html: str, names: list[str]) -> str:
    for name in names:
        patterns = [
            rf'<meta[^>]+property=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)["\']',
            rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']{re.escape(name)}["\']',
            rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)["\']',
        ]
        for pattern in patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1).strip()
    return ""


async def _derive_image_url(product_url: str, raw: str = "") -> str:
    if not product_url:
        return ""

    html = raw if "<html" in raw.lower() else ""
    if not html:
        try:
            response = await http_client.get(product_url, headers=_IMAGE_FETCH_HEADERS)
            if response.status_code >= 400:
                return ""
            html = response.text
        except Exception:
            return ""

    meta_image = _extract_meta_content(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"])
    if meta_image:
        return _absolute_url(product_url, meta_image)

    src_match = re.search(r'<img[^>]+(?:data-src|src)=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if src_match:
        return _absolute_url(product_url, src_match.group(1).strip())
    return ""


async def _enrich_product(product: dict, raw: str, *, fetch_image: bool = True) -> dict:
    enriched = dict(product)
    if fetch_image and not enriched.get("image_url") and enriched.get("product_url"):
        enriched["image_url"] = await _derive_image_url(enriched["product_url"], raw)
    return enriched


def _normalize_product_record(record: dict, raw: str) -> dict:
    product = {
        "name": str(record.get("name") or record.get("title") or "").strip(),
        "product_id": str(record.get("product_id") or record.get("id") or "").strip(),
        "price": int(record.get("price") or 0),
        "image_url": str(record.get("image_url") or record.get("image") or "").strip(),
        "product_url": str(record.get("product_url") or record.get("url") or "").strip(),
        "raw": raw,
    }
    if not product["product_url"]:
        product["product_url"] = _first_url(raw, "View Product")
    return product


def parse_product_markdown(text: str) -> dict:
    """Parse Kapruka markdown product response into structured dict."""
    raw = text or ""
    result = {"name": "", "product_id": "", "price": 0, "image_url": "", "product_url": "", "raw": raw}

    if _looks_like_tool_error(raw):
        return result

    if raw.lstrip().startswith("{"):
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return _normalize_product_record(data, raw)
        except json.JSONDecodeError:
            pass

    name_match = re.search(r"^##\s+(.+)$", raw, re.MULTILINE)
    if name_match:
        result["name"] = name_match.group(1).strip()
    else:
        title_match = re.search(r"^#\s+(.+)$", raw, re.MULTILINE)
        if title_match:
            result["name"] = title_match.group(1).strip()

    id_match = re.search(r"(?:\*\*ID\*\*|ID)\s*:\s*`?([^`\n]+)`?", raw, re.IGNORECASE)
    if id_match:
        result["product_id"] = id_match.group(1).strip()

    price_match = re.search(r"\*\*Price\*\*:\s*(?:LKR|Rs\.?)\s*([\d,]+)", raw)
    if price_match:
        result["price"] = int(price_match.group(1).replace(",", ""))
    else:
        price_match = re.search(r"(?:LKR|Rs\.?)\s*([\d,]+)", raw)
        if price_match:
            result["price"] = int(price_match.group(1).replace(",", ""))

    img_match = re.search(r"\*\*Image\*\*:\s*(https?://\S+)", raw)
    if img_match:
        result["image_url"] = img_match.group(1)
    else:
        img_match = re.search(r"!\[[^\]]*\]\((https?://[^)]+)\)", raw)
        if img_match:
            result["image_url"] = img_match.group(1)

    result["product_url"] = _first_url(raw, "View Product")
    if not result["product_url"]:
        result["product_url"] = _first_url(raw)
    return result


def parse_search_products_markdown(text: str, limit: int = 6) -> list[dict]:
    """Parse Kapruka search results into a concise list of structured product dicts."""
    raw = text or ""

    if _looks_like_tool_error(raw):
        return []

    if raw.lstrip().startswith("["):
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                products = [parse_product_markdown(json.dumps(item) if isinstance(item, dict) else str(item)) for item in data]
                seen: set[str] = set()
                condensed: list[dict] = []
                for product in products:
                    signature = product.get("product_id") or product.get("product_url") or product.get("name")
                    if not signature or signature in seen:
                        continue
                    seen.add(signature)
                    condensed.append(product)
                    if len(condensed) >= limit:
                        break
                return condensed
        except json.JSONDecodeError:
            pass

    item_matches = list(re.finditer(r"(?ms)^\*\*\d+\.\s+(.+?)\*\*\s*\n(.*?)(?=^\*\*\d+\.\s+.+?\*\*\s*$|\Z)", raw))
    blocks = [match.group(0).strip() for match in item_matches]

    if not blocks:
        heading_matches = list(re.finditer(r"(?m)^##\s+.+$", raw))
        if heading_matches:
            for idx, match in enumerate(heading_matches):
                start = match.start()
                end = heading_matches[idx + 1].start() if idx + 1 < len(heading_matches) else len(raw)
                blocks.append(raw[start:end].strip())
        else:
            parts = [part.strip() for part in re.split(r"\n\s*\n", raw) if part.strip()]
            blocks = parts if parts else [raw]

    products: list[dict] = []
    seen: set[str] = set()
    for block in blocks:
        product = parse_product_markdown(block)
        if not product["name"]:
            title_match = re.search(r"^\*\*\d+\.\s+(.+?)\*\*$", block, re.MULTILINE)
            if title_match:
                product["name"] = title_match.group(1).strip()
        if not product["product_url"]:
            product["product_url"] = _first_url(block, "View product") or _first_url(block)
        signature = product.get("product_id") or product.get("product_url") or product.get("name")
        if signature and signature in seen:
            continue
        if signature:
            seen.add(signature)
        if product["name"] or product["product_id"] or product["product_url"]:
            products.append(product)
        if len(products) >= limit:
            break

    return products


def parse_tracking_result(text: str) -> dict:
    raw = text or ""
    result = {
        "order_number": "",
        "status": "",
        "recipient": "",
        "estimated_delivery": "",
        "location": "",
        "total": None,
        "currency": "LKR",
        "items": [],
        "events": [],
        "raw": raw,
    }

    if not raw:
        return result

    if not raw.lstrip().startswith("{"):
        heading_match = re.search(r"##\s+Order\s+`?([^`\s]+)`?\s+[—-]\s+([^\n]+)", raw)
        if heading_match:
            result["order_number"] = heading_match.group(1).strip()
            result["status"] = heading_match.group(2).strip()

        recipient_match = re.search(r"\*\*Delivering to\*\*\s*-?\s*\n?-\s*([^\n]+)", raw, re.IGNORECASE)
        if recipient_match:
            result["recipient"] = recipient_match.group(1).strip()

        location_match = re.search(r"\n-\s*[^\n]+\n-\s*([^\n]+)", raw)
        if location_match:
            result["location"] = location_match.group(1).replace("<BR", "").strip()

        delivery_match = re.search(r"\|\s*Delivery date\s*\|\s*([^|]+?)\s*\|", raw, re.IGNORECASE)
        if delivery_match:
            result["estimated_delivery"] = delivery_match.group(1).strip()

        total_match = re.search(r"\|\s*Total\s*\|\s*([^|]+?)\s*\|", raw, re.IGNORECASE)
        if total_match:
            total_text = total_match.group(1).strip()
            value_match = re.search(r"'value'\s*:\s*'?(?P<value>[\d,]+)'?", total_text)
            currency_match = re.search(r"'currency'\s*:\s*'?(?P<currency>[A-Z]{3})'?", total_text)
            if value_match:
                result["total"] = int(value_match.group("value").replace(",", ""))
            else:
                fallback_amount = re.search(r"(?:LKR|Rs\.?)\s*([\d,]+)", total_text, re.IGNORECASE)
                if fallback_amount:
                    result["total"] = int(fallback_amount.group(1).replace(",", ""))
            if currency_match:
                result["currency"] = currency_match.group("currency").strip()

        for progress in re.finditer(r"^\s*-\s*([A-Z][^\n—]+?)\s+—\s+([^\n]+)$", raw, re.MULTILINE):
            result["events"].append(
                {
                    "label": progress.group(2).strip(),
                    "time": progress.group(1).strip(),
                    "location": "",
                }
            )

        return result

    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        return result

    if not isinstance(data, dict):
        return result

    result["order_number"] = str(
        data.get("order_number")
        or data.get("orderNumber")
        or data.get("id")
        or ""
    ).strip()
    result["status"] = str(data.get("status") or data.get("order_status") or "").strip()
    result["recipient"] = str(data.get("recipient_name") or data.get("recipient") or "").strip()
    result["estimated_delivery"] = str(
        data.get("estimated_delivery") or data.get("delivery_date") or data.get("estimatedDelivery") or ""
    ).strip()
    result["location"] = str(data.get("current_location") or data.get("location") or "").strip()
    total_raw = data.get("total") or data.get("order_total") or data.get("amount")

    if isinstance(total_raw, dict):
        amount = total_raw.get("amount") or total_raw.get("value") or total_raw.get("price")
        if amount not in (None, ""):
            try:
                result["total"] = _coerce_int(amount)
            except (TypeError, ValueError):
                result["total"] = None
        result["currency"] = str(total_raw.get("currency") or data.get("currency") or "LKR").strip() or "LKR"
    elif total_raw not in (None, ""):
        try:
            result["total"] = _coerce_int(total_raw)
        except (TypeError, ValueError):
            result["total"] = None
        result["currency"] = str(data.get("currency") or "LKR").strip() or "LKR"

    items = data.get("items") or data.get("products") or data.get("cart") or []
    if isinstance(items, list):
        for item in items[:8]:
            if isinstance(item, dict):
                name = str(item.get("name") or item.get("title") or item.get("product_name") or "").strip()
                quantity_raw = item.get("quantity")
                quantity = None
                if quantity_raw not in (None, ""):
                    try:
                        quantity = _coerce_int(quantity_raw)
                    except (TypeError, ValueError):
                        quantity = None
                if name:
                    result["items"].append({"name": name, "quantity": quantity})
            elif isinstance(item, str) and item.strip():
                result["items"].append({"name": item.strip(), "quantity": None})

    events = data.get("timeline") or data.get("history") or data.get("events") or []
    if isinstance(events, list):
        for event in events[:8]:
            if not isinstance(event, dict):
                continue
            label = str(event.get("status") or event.get("event") or event.get("description") or "").strip()
            time = str(event.get("timestamp") or event.get("date") or event.get("time") or "").strip()
            location = str(event.get("location") or "").strip()
            if label:
                result["events"].append({"label": label, "time": time, "location": location})

    return result


def parse_checkout_result(text: str) -> dict:
    def normalize_order_number(value: Any) -> str:
        text_value = str(value or "").strip()
        if not text_value:
            return ""
        if " " in text_value:
            return ""
        if not re.search(r"\d", text_value):
            return ""
        if not re.fullmatch(r"[A-Za-z0-9-]+", text_value):
            return ""
        return text_value

    raw = text or ""
    result = {
        "payment_url": "",
        "order_number": "",
        "total": None,
        "currency": "LKR",
        "expires_at": "",
        "raw": raw,
    }

    if not raw or raw.startswith("MISSING_INFO:"):
        return result

    data: Any = raw
    if isinstance(raw, str):
        stripped = raw.strip()
        if stripped.startswith("{"):
            try:
                data = json.loads(stripped)
            except json.JSONDecodeError:
                data = raw

    if isinstance(data, dict):
        order = data.get("order") if isinstance(data.get("order"), dict) else data
        total_raw = (
            order.get("total")
            or order.get("amount")
            or order.get("grand_total")
            or order.get("total_amount")
        )
        result["payment_url"] = str(
            order.get("payment_url")
            or order.get("paymentUrl")
            or order.get("pay_url")
            or order.get("payUrl")
            or order.get("click_to_pay_url")
            or order.get("checkout_url")
            or order.get("pay_link")
            or order.get("url")
            or ""
        ).strip()
        result["order_number"] = normalize_order_number(
            order.get("order_number")
            or order.get("orderNumber")
            or order.get("order_id")
            or order.get("orderId")
            or order.get("id")
            or ""
        )
        result["expires_at"] = str(
            order.get("expires_at")
            or order.get("expiresAt")
            or order.get("expiry")
            or order.get("price_lock_expires_at")
            or ""
        ).strip()

        if isinstance(total_raw, dict):
            amount = total_raw.get("amount") or total_raw.get("value") or total_raw.get("price")
            if amount not in (None, ""):
                try:
                    result["total"] = _coerce_int(amount)
                except (TypeError, ValueError):
                    result["total"] = None
            result["currency"] = str(total_raw.get("currency") or order.get("currency") or "LKR").strip() or "LKR"
        elif total_raw not in (None, ""):
            try:
                result["total"] = _coerce_int(total_raw)
            except (TypeError, ValueError):
                result["total"] = None
            result["currency"] = str(order.get("currency") or "LKR").strip() or "LKR"
    else:
        result["payment_url"] = _first_url(raw)
        order_match = re.search(r"(?:order(?:\s+number)?|order_id|order id)\D{0,8}([A-Z0-9-]{4,})", raw, re.IGNORECASE)
        if order_match:
            result["order_number"] = normalize_order_number(order_match.group(1))

    return result


def build_tool_result_event(tool_name: str, result: Any) -> dict[str, Any]:
    event: dict[str, Any] = {"result": result}
    if tool_name == "search_products" and isinstance(result, str):
        products = parse_search_products_markdown(result)
        if products:
            event["products"] = products
            event["raw"] = result
    elif tool_name == "get_product" and isinstance(result, str):
        product = parse_product_markdown(result)
        if product.get("name") or product.get("product_id") or product.get("product_url"):
            event["product"] = product
            event["raw"] = result
    elif tool_name == "track_order" and isinstance(result, str):
        tracking = parse_tracking_result(result)
        if tracking.get("order_number") or tracking.get("status") or tracking.get("events"):
            event["tracking"] = tracking
            event["raw"] = result
    elif tool_name == "checkout" and isinstance(result, str):
        order = parse_checkout_result(result)
        if order.get("payment_url") or order.get("order_number"):
            event["order"] = order
            event["raw"] = result
    return event


def format_tool_result_for_model(tool_name: str, result: Any, user_text: str, args: dict[str, Any]) -> str:
    if tool_name != "search_products":
        return str(result)

    concise_results = result
    try:
        parsed = json.loads(result) if isinstance(result, str) else result
        if isinstance(parsed, list):
            concise_results = json.dumps(
                [
                    {
                        "name": item.get("name", ""),
                        "product_id": item.get("product_id", ""),
                        "price": item.get("price", 0),
                        "product_url": item.get("product_url", ""),
                    }
                    for item in parsed[:10]
                    if isinstance(item, dict)
                ]
            )
    except Exception:
        concise_results = result

    return (
        "<search_result_candidates>\n"
        f"user_request: {user_text}\n"
        f"search_query: {args.get('q', '')}\n"
        f"results: {concise_results}\n"
        "</search_result_candidates>\n\n"
        "These are candidates, not recommendations. Before answering, compare each candidate to the user's actual intent. "
        "Recommend only clear matches. If the candidates do not fit the request, call search_products again with a better query. "
        "Do not show irrelevant products just because they appeared in the search result. "
        "If an exact match is still unavailable after sensible retries, suggest the closest useful substitute and explain the tradeoff briefly. "
        "For product-heavy requests, keep the answer compact: lead with one short recommendation or plan, show only the best 3-5 items, "
        "and end with one clear next step."
    )


async def _search_products(q: str = "", category: str = "", min_price: int = 0,
                           max_price: int = 0, in_stock_only: bool = True,
                           sort: str = "relevance", limit: int = 10, session_id: str = "", **_) -> Any:
    args: dict[str, Any] = {
        "q": " ".join((q or "").split()).strip(),
        "limit": max(1, min(limit or 10, 10)),
        "sort": sort,
        "in_stock_only": in_stock_only,
    }
    if category:
        args["category"] = category
    if min_price > 0:
        args["min_price"] = min_price
    if max_price > 0:
        args["max_price"] = max_price

    raw = await mcp_client.call_tool("kapruka_search_products", args)
    if isinstance(raw, str):
        products = parse_search_products_markdown(raw, limit=args["limit"])
        enriched = []
        for product in products:
            enriched.append(await _enrich_product(product, product.get("raw", raw), fetch_image=True))
        return json.dumps(enriched)
    return raw


async def _get_product(product_id: str, **_) -> Any:
    raw = await mcp_client.call_tool("kapruka_get_product", {"product_id": product_id})
    if isinstance(raw, str):
        product = parse_product_markdown(raw)
        product = await _enrich_product(product, raw, fetch_image=True)
        return json.dumps(product)
    return raw


async def _list_categories(depth: int = 1, **_) -> Any:
    return await mcp_client.call_tool("kapruka_list_categories", {"depth": depth})


async def _list_delivery_cities(query: str = "", limit: int = 10, **_) -> Any:
    return await mcp_client.call_tool("kapruka_list_delivery_cities", {"query": query, "limit": limit})


async def _check_delivery(city: str, delivery_date: str, product_id: str, **_) -> Any:
    return await mcp_client.call_tool("kapruka_check_delivery", {
        "city": city, "delivery_date": delivery_date, "product_id": product_id
    })


async def _track_order(order_number: str, **_) -> Any:
    return await mcp_client.call_tool("kapruka_track_order", {"order_number": order_number})


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


async def _update_budget(session_id: str, budget_max: int | None = None, budget: int | None = None, **_) -> str:
    value = budget_max if budget_max is not None else budget
    await cart_manager.update_budget(session_id, value)
    if value is None:
        return "Cleared budget limit"
    return f"Updated budget limit to Rs. {value}"


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
                "session_id": {"type": "string", "description": "User session ID"},
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
        "name": "track_order",
        "description": "Track a Kapruka order by order number and return the latest status and timeline.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_number": {"type": "string", "description": "Kapruka order number"},
            },
            "required": ["order_number"],
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
        "name": "update_budget",
        "description": "Set or clear the optional budget limit for the current shopping session.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_id": {"type": "string", "description": "User session ID"},
                "budget_max": {"type": "integer", "description": "Budget cap in LKR"},
                "budget": {"type": "integer", "description": "Budget cap in LKR (alias)"},
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
    "track_order": _track_order,
    "add_to_cart": _add_to_cart,
    "remove_from_cart": _remove_from_cart,
    "update_cart_quantity": _update_cart_quantity,
    "get_cart": _get_cart,
    "update_budget": _update_budget,
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
