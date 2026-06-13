# Kapruka MCP Server — Analysis Document

## Overview

**Kapruka MCP** is a free public MCP (Model Context Protocol) server that connects any MCP-aware LLM client (Claude, ChatGPT, Cursor, etc.) to **Kapruka.com** — Sri Lanka's largest local e-commerce platform.

- **Endpoint:** `https://mcp.kapruka.com/mcp`
- **Transport:** Streamable HTTP
- **Auth Required:** None
- **Rate Limits:** 60 requests/min per IP, 30 orders/hour per IP

---

## Available Tools (7 total)

### 1. `kapruka_search_products`
Search the product catalog by keyword with filtering and sorting.

| Parameter | Description |
|-----------|-------------|
| `q` | Search keyword |
| `category` | Filter by category |
| `min_price` / `max_price` | Price range filter |
| `in_stock_only` | Filter out-of-stock items |
| `sort` | Sort order |
| `limit` | Results per page |
| `cursor` | Pagination cursor |
| `currency` | Display currency |

**Limit:** 3 pages max.

---

### 2. `kapruka_get_product`
Fetch full details for a single product by ID.

| Parameter | Description |
|-----------|-------------|
| `product_id` | Unique product identifier |
| `currency` | Display currency |

**Returns:** Name, price, stock status, variants, images, shipping info, direct URL.

---

### 3. `kapruka_list_categories`
Browse top-level product categories.

| Parameter | Description |
|-----------|-------------|
| `depth` | Category tree depth |

**Returns:** Category names with browse URLs. Any category name can be used as a filter in search.

---

### 4. `kapruka_list_deliveryCities`
Search Kapruka's delivery network by city name.

| Parameter | Description |
|-----------|-------------|
| `query` | City name or vernacular alias |
| `limit` | Max results (up to 50) |

---

### 5. `kapruka_check_delivery`
Check delivery availability and cost for a product to a specific city/date.

| Parameter | Description |
|-----------|-------------|
| `city` | Destination city |
| `delivery_date` | Requested delivery date |
| `product_id` | Product to check |

**Returns:** Flat LKR rate, perishable warnings (cakes/flowers/combos).

---

### 6. `kapruka_create_order`
Create a guest-checkout order — no Kapruka account needed.

| Parameter | Description |
|-----------|-------------|
| `cart` | List of items (product_id, quantity) |
| `recipient` | Delivery recipient info |
| `delivery` | Delivery address & date |
| `sender` | Sender info |
| `gift_message` | Optional gift message |
| `currency` | Payment currency |

**Returns:** Click-to-pay URL (valid for 60 minutes, prices locked).

---

### 7. `kapruka_track_order`
Track an existing Kapruka order.

| Parameter | Description |
|-----------|-------------|
| `order_number` | Order number from confirmation |

**Returns:** Order status, recipient, items, timestamped delivery progress.

---

## Key Features for AI Agent Building

| Feature | Details |
|---------|---------|
| **No Auth** | Anyone can use it — no API keys or OAuth |
| **Guest Checkout** | Orders can be placed without user accounts |
| **Multi-Currency** | Prices can be displayed in multiple currencies |
| **Structured Output** | All tools return structured markdown or JSON |
| **Delivery Validation** | Real-time delivery check with perishable warnings |
| **Order Tracking** | Full lifecycle visibility post-purchase |

---

## Limitations

- **60 requests/min** — needs throttling logic for agentic use
- **30 orders/hour** — hard cap on checkout calls
- **3-page search limit** — can't paginate beyond 3 pages
- **30-min cache** on product/category reads — data may be slightly stale
- **Guest checkout only** — no account management or order history

---

## Ideal Shopping Agent Capabilities

Based on this MCP, an AI shopping agent could:

1. **Product Discovery** — Search, filter, and compare products by keyword, price, category, stock
2. **Delivery Intelligence** — Check delivery availability, costs, and perishable warnings per city/date
3. **Order Placement** — Build a cart, validate delivery, create order, return payment link
4. **Order Tracking** — Monitor order status and delivery progress
5. **Gift Assistant** — Help users send gifts with personalized messages to Sri Lanka

---

## Agent Challenge

Kapruka is running a **challenge** to build AI shopping agents on this MCP with a prize of an **Apple M4 Mac Mini**.

Challenge details: https://www.kapruka.com/contactUs/agentChallenge.html
