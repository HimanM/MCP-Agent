# Kapruka Shopping Agent — Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| LLM | Google Gemini 2.5 Flash / Pro |
| Backend | Python 3.12 + FastAPI |
| MCP Client | `mcp` Python SDK (Streamable HTTP) |
| Frontend | Next.js 15 + React + Tailwind CSS |
| State | Redis (session/cart) |
| Deployment | Docker Compose |

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Chat UI  │  │ Products │  │ Cart / Orders │  │
│  │ (messages)│  │ (cards)  │  │ (checkout)    │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       └──────────────┼────────────────┘          │
│                      ▼                           │
│              WebSocket / REST API                │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              Backend (FastAPI)                    │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Chat       │  │ Agent      │  │ Cart       │ │
│  │ Handler    │  │ (Gemini)   │  │ Manager    │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │
│        │               │               │         │
│        ▼               ▼               ▼         │
│  ┌─────────────────────────────────────────────┐ │
│  │           MCP Tool Router                   │ │
│  │  (calls Kapruka MCP tools via mcp SDK)      │ │
│  └─────────────────────┬───────────────────────┘ │
└────────────────────────┼─────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│          Kapruka MCP Server                     │
│  https://mcp.kapruka.com/mcp                    │
│                                                 │
│  search | get_product | categories |            │
│  delivery | cities | create_order | track       │
└─────────────────────────────────────────────────┘
```

---

## Agent Flow — Full Shopping Session

### Example: Shopping for Wife's Birthday

```
┌─ Turn 1 ─────────────────────────────────────────────────────────────┐
│ User: "I need something for my wife's birthday"                       │
│                                                                       │
│ Agent: (sets context.occasion = "wife's birthday")                    │
│        "Happy to help! What does she like? I can suggest cakes,       │
│         flowers, gift hampers, or something else."                    │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 2 ─────────────────────────────────────────────────────────────┐
│ User: "She loves chocolate and flowers"                               │
│                                                                       │
│ Agent: (sets context.preferences = ["chocolate", "flowers"])          │
│        (searches "chocolate" + "flowers" combos)                      │
│        "Here are some options:"                                       │
│        [Product Card: Chocolate Truffle Cake - Rs. 3,500] 🖼️         │
│        [Product Card: Rose & Lily Bouquet - Rs. 2,800] 🖼️            │
│        [Product Card: Chocolate & Flower Combo - Rs. 5,500] 🖼️       │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 3 ─────────────────────────────────────────────────────────────┐
│ User: "Add the combo and the cake too"                                │
│                                                                       │
│ Agent: (calls add_to_cart for combo + cake)                          │
│        (updates context.preferences += ["combo selected"])           │
│        "Added to your cart! 🛒"                                       │
│                                                                       │
│  ┌─ Cart Sidebar (auto-updates via WebSocket) ─────────────────┐    │
│  │ 1. Chocolate Truffle Cake    x1    Rs. 3,500         [×]   │    │
│  │ 2. Chocolate & Flower Combo  x1    Rs. 5,500         [×]   │    │
│  │                                              Total: Rs. 9,000│   │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 4 ─────────────────────────────────────────────────────────────┐
│ User: "Actually remove the cake, I think the combo is enough"         │
│                                                                       │
│ Agent: (calls remove_from_cart for cake)                             │
│        "Done! Cart updated."                                          │
│                                                                       │
│  ┌─ Cart Sidebar (auto-updates) ───────────────────────────────┐    │
│  │ 1. Chocolate & Flower Combo  x1    Rs. 5,500         [×]   │    │
│  │                                              Total: Rs. 5,500│   │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 5 ─────────────────────────────────────────────────────────────┐
│ User: "Can you add 2 more of the combo? One for my mom too"           │
│                                                                       │
│ Agent: (calls update_cart_quantity for combo → 2)                     │
│        "Updated! Now you have 2 combos. Want me to find something     │
│         for your mom separately or is this enough?"                   │
│                                                                       │
│  ┌─ Cart Sidebar ──────────────────────────────────────────────┐    │
│  │ 1. Chocolate & Flower Combo  x2    Rs. 11,000        [×]   │    │
│  │                                              Total: Rs. 11,000│   │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 6 (manual UI action) ─────────────────────────────────────────┐
│ User clicks [+] on "Rose Bouquet" product card                       │
│                                                                       │
│ → POST /api/cart/add (product_id: "rose-bouquet")                    │
│ → Redis updated                                                       │
│ → WebSocket broadcasts cart_updated                                   │
│ → Chat shows: "Rose Bouquet added to cart"                           │
│                                                                       │
│ Agent sees new cart state on next turn and acknowledges:              │
│ "I see you added a Rose Bouquet too — nice choice!"                  │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 7 ─────────────────────────────────────────────────────────────┐
│ User: "What's my total?"                                              │
│                                                                       │
│ Agent: (calls get_cart)                                               │
│        "Your cart:                                                    │
│         - Chocolate & Flower Combo x2  Rs. 11,000                    │
│         - Rose Bouquet x1              Rs.  2,500                    │
│         Total: Rs. 13,500                                            │
│         Where should I deliver these?"                                │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 8 ─────────────────────────────────────────────────────────────┐
│ User: "Colombo, June 20th. Recipient is Nimal Perera, 0771234567"    │
│                                                                       │
│ Agent: (sets context + cart recipient/delivery)                       │
│        (calls kapruka_check_delivery for each item)                  │
│        "All items available for Colombo on June 20th!                 │
│         Delivery fee: Rs. 500.                                        │
│         Grand total: Rs. 14,000. Ready to checkout?"                 │
└───────────────────────────────────────────────────────────────────────┘

┌─ Turn 9 ─────────────────────────────────────────────────────────────┐
│ User: "Yes, checkout"                                                 │
│                                                                       │
│ Agent: (calls checkout → kapruka_create_order)                       │
│        "Order placed! 🎉"                                             │
│        Pay here: https://pay.kapruka.com/...                         │
│        (link valid 60 minutes)"                                      │
└───────────────────────────────────────────────────────────────────────┘
```

### How the Agent Stays in Sync

```
Every turn, the agent receives:
├── User's message
├── Current cart state (from Redis)
├── Conversation context (occasion, preferences, budget, etc.)
└── Recent message history (last 10 turns)

The agent can:
├── Search/get products (MCP tools)
├── Add/remove/update cart (internal tools)
├── Check delivery (MCP tools)
├── Create order (MCP tools)
└── Ask user for missing info

The cart is always the source of truth.
If user adds via UI → agent sees it next turn.
If agent adds via chat → UI updates instantly via WebSocket.
```

---

## Multilingual Support

### Strategy: Gemini-native multilingual
Gemini 2.5 supports Sinhala and Tamil directly. No separate translation API needed.

```
User input (any language)
        │
        ▼
┌─────────────────┐
│  System Prompt   │ ← Includes multilingual instructions
│  + Gemini Call   │
└────────┬────────┘
         │
         ▼
  Response in user's language
```

### System Prompt Language Rules
```
You are a shopping assistant for Kapruka.com (Sri Lanka).
- ALWAYS respond in the same language the user writes in.
- If user writes in Sinhala, respond in Sinhala.
- If user writes in Tamil, respond in Tamil.
- If user writes in English, respond in English.
- Product names can stay in English if no common translation exists.
- Prices are in Sri Lankan Rupees (LKR/Rs.).
```

### Example Sinhala Interaction
```
User: මට මගේ අම්මට පාර්සල් එකක් යවන්න ඕනේ කොළඹ
Agent: ඔබේ අම්මාට පාර්සල් එකක් යැවීමට කොළඹ ප්‍රදේශය අපගේ සේවාවේ ඇත.
       මෙන්න ඔබට තෝරාගත හැකි පාර්සල් වර්ග...
       [Product cards with images]
```

---

## Image Handling

### Problem
MCP returns image URLs from Kapruka's CDN. Need to:
1. Extract image URLs from product data
2. Proxy/serve them to frontend (avoid CORS)
3. Display in product cards

### Solution
```
MCP Response → Backend extracts image URLs → Proxies via /api/image-proxy?url=...
                                            → Frontend displays in <img> tags
```

### Product Card Component
```tsx
<ProductCard
  image={product.images[0]}        // proxied URL
  name={product.name}
  price={`Rs. ${product.price}`}
  inStock={product.in_stock}
  onAddToCart={() => addToCart(product)}
/>
```

---

## Cart Management — Bidirectional Sync

### The Core Problem
Both the **agent** (via chat) and the **user** (via UI buttons) can modify the cart.
Both sides must always see the same cart state.

```
┌─────────────────────────────────────────────────────┐
│                    Cart State (Redis)                │
│                                                     │
│   session_id → { items, recipient, delivery, ... }  │
│                                                     │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
     ┌─────▼─────┐          ┌─────▼─────┐
     │   Agent   │          │  Manual UI │
     │ (chat)    │          │ (buttons)  │
     └─────┬─────┘          └─────┬─────┘
           │                      │
           ▼                      ▼
    "Add 2 roses"          [+] button on card
    "Remove the cake"      [-] button on item
    "Change qty to 3"      quantity input
```

### Session Cart Schema (Redis)
```json
{
  "session_id": "abc123",
  "items": [
    {
      "product_id": "kw-12345",
      "name": "Rose Bouquet",
      "price": 2500,
      "quantity": 2,
      "image_url": "https://cdn.kapruka.com/...",
      "added_by": "agent | manual",
      "added_at": "2026-06-13T10:00:00Z"
    }
  ],
  "recipient": { "name": "", "phone": "", "address": "" },
  "delivery": { "city": "", "date": "" },
  "sender": { "name": "", "phone": "" },
  "gift_message": "",
  "conversation_context": {
    "occasion": "wife's birthday",
    "preferences": ["chocolate", "flowers"],
    "budget_max": 10000,
    "excluded_items": ["lilies"],
    "delivery_city": "Colombo"
  }
}
```

### Conversation Context — The Agent's Memory
The agent doesn't just track cart items. It tracks **intent**:

```
User: "I need something for my wife's birthday"
  → context.occasion = "wife's birthday"

User: "She likes chocolate and flowers"
  → context.preferences += ["chocolate", "flowers"]

User: "My budget is around 10,000"
  → context.budget_max = 10000

User: "Add the chocolate cake" → adds to cart

User: "Actually keep the cake but find me something else too"
  → context stays, agent searches again with same preferences

User: "Remove the roses, I don't want them"
  → removes roses from cart, context unchanged

User: "Checkout"
  → agent builds order from cart + context
```

### Cart Operations — Dual Input

| Operation | Agent (via chat) | Manual UI |
|-----------|-----------------|-----------|
| Add item | "Add 2 of these to cart" | [+] button on product card |
| Remove item | "I don't want the cake anymore" | [×] on cart item |
| Change qty | "Change roses to 3" | quantity +/- buttons |
| View cart | "Show me my cart" | Cart sidebar always visible |
| Clear cart | "Start over" | [Clear All] button |
| Checkout | "Checkout" / "Pay now" | [Checkout] button |

### API Endpoints

```
# Chat (agent-driven cart changes happen here)
POST /api/chat                    → Send message, get agent response (SSE stream)
                                    Agent can call internal cart tools:
                                    - add_to_cart(product_id, qty)
                                    - remove_from_cart(product_id)
                                    - update_cart_quantity(product_id, qty)
                                    - get_cart()
                                    - checkout(cart_id)

# Manual cart operations (UI-driven)
GET  /api/cart/{session_id}       → Get current cart state
POST /api/cart/{session_id}/add   → Add item { product_id, quantity }
PATCH /api/cart/{session_id}/item → Update item { product_id, quantity }
DELETE /api/cart/{session_id}/item/{product_id} → Remove item
DELETE /api/cart/{session_id}     → Clear entire cart

# Real-time sync
WS   /ws/cart/{session_id}        → WebSocket for live cart updates
                                    Broadcasts cart changes to all connected clients
                                    (so if agent adds, UI updates instantly)

# Other
GET  /api/image-proxy             → Proxy Kapruka images (CORS)
GET  /api/categories              → List categories (cached)
```

### WebSocket Cart Sync Flow
```
1. User clicks [+] on product card
   → POST /api/cart/{session_id}/add
   → Redis updated
   → WebSocket broadcasts: { type: "cart_updated", cart: {...} }
   → Chat UI shows: "Added Rose Bouquet to cart"

2. User tells agent: "Remove the cake"
   → Agent calls remove_from_cart tool
   → Redis updated
   → WebSocket broadcasts: { type: "cart_updated", cart: {...} }
   → Cart sidebar updates instantly

3. Both happen simultaneously? No conflict.
   → Redis is single-writer per key (atomic ops)
   → Last write wins on quantity, explicit add/remove for items
```

### Agent Tools for Cart (Internal)

These are **not MCP tools** — they're internal tools the Gemini agent can call:

```python
# Agent's internal cart tools (defined in tools.py)

add_to_cart(product_id: str, quantity: int = 1)
    → Fetches product from MCP, adds to Redis cart
    → Returns confirmation with item details

remove_from_cart(product_id: str)
    → Removes item from Redis cart
    → Returns confirmation

update_cart_quantity(product_id: str, quantity: int)
    → Updates quantity (0 = remove)
    → Returns confirmation

get_cart()
    → Returns full cart state with totals
    → Used by agent to "show cart" or before checkout

checkout()
    → Validates cart has items + recipient + delivery
    → If missing info → asks user for it
     → If complete → calls kapruka_create_order
    → Returns pay link
```

### Conversational Checkout Flow
```
User: "Checkout"
Agent: (reads cart) "You have 3 items totaling Rs. 8,200.
        I need a few details:
        1. Recipient name?
User: "Nimal Perera"
Agent: "Phone number?"
User: "0771234567"
Agent: "Delivery address?"
Agent: (suggests) "Should I deliver to Colombo like you mentioned earlier?"
User: "Yes, 45 Lily Avenue, Colombo 07"
Agent: "Delivery date?"
User: "June 20th"
Agent: "Sender name for the gift message?"
User: "Kamal"
Agent: (calls kapruka_create_order)
Agent: "Order placed! Here's your payment link:
        🔗 https://pay.kapruka.com/...
        Link valid for 60 minutes."
```

### Agent Reads Cart on Every Turn
Before responding, the agent always sees:
```
Current cart:
- Rose Bouquet x2 (Rs. 5,000)
- Chocolate Cake x1 (Rs. 3,200)
Total: Rs. 8,200

Context:
- Occasion: wife's birthday
- Delivery: Colombo, June 20th
- Budget: ~Rs. 10,000
```

This lets the agent say things like:
- "You're at Rs. 8,200, still within your Rs. 10,000 budget"
- "You already have a cake in your cart, want to add flowers too?"
- "After removing the roses, you have Rs. 3,200 in cart"
session_id → {
  items: [
    { product_id, name, price, quantity, image_url }
  ],
  recipient: { name, phone, address },
  delivery: { city, date },
  sender: { name, phone },
  gift_message: ""
}
```

### Cart Flow
```
1. User: "Add roses to cart" → Agent calls get_product → adds to Redis cart
2. User: "Show my cart" → Agent reads Redis → displays items
3. User: "Change quantity of roses to 3" → Agent updates Redis
4. User: "Checkout" → Agent reads cart → calls create_order → returns pay link
```

---

## API Endpoints

```
POST /api/chat              → Send message, get agent response (streaming)
GET  /api/session/{id}      → Get session state (cart, history)
POST /api/cart/add           → Add item to cart
POST /api/cart/update        → Update cart item quantity
POST /api/cart/remove        → Remove item from cart
GET  /api/image-proxy        → Proxy Kapruka images (CORS)
GET  /api/categories         → List categories (cached)
```

---

## File Structure

```
kapruka-agent/
├── backend/
│   ├── main.py                    # FastAPI app + WebSocket
│   ├── config.py                  # Settings (Gemini key, Redis, MCP URL)
│   ├── agent/
│   │   ├── gemini_agent.py        # Gemini agent with tool-calling
│   │   ├── tools.py               # MCP tool wrappers + internal cart tools
│   │   ├── prompts.py             # System prompts (multilingual)
│   │   └── language.py            # Language detection helper
│   ├── mcp/
│   │   └── client.py              # MCP client (connects to Kapruka)
│   ├── cart/
│   │   ├── manager.py             # Redis cart operations
│   │   └── sync.py                # WebSocket cart broadcast
│   ├── routes/
│   │   ├── chat.py                # Chat endpoint (SSE streaming)
│   │   ├── cart.py                # Manual cart CRUD endpoints
│   │   ├── ws.py                  # WebSocket handler for live sync
│   │   └── image_proxy.py         # Image proxy endpoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Main chat + cart page
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx     # Message bubble (text + product cards)
│   │   │   ├── ProductCard.tsx     # Product display card with [Add] button
│   │   │   ├── Cart.tsx            # Cart sidebar with +/- and [×] buttons
│   │   │   ├── CartItem.tsx        # Single cart item row
│   │   │   ├── CheckoutForm.tsx    # Delivery/recipient form
│   │   │   └── LanguageToggle.tsx  # Sinhala/Tamil/English toggle
│   │   ├── hooks/
│   │   │   ├── useCart.ts          # Cart state + WebSocket listener
│   │   │   └── useChat.ts          # Chat state + SSE stream
│   │   └── lib/
│   │       ├── api.ts              # REST API client
│   │       └── ws.ts               # WebSocket client
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## Environment Variables

```env
# Backend
GEMINI_API_KEY=your-gemini-api-key
REDIS_URL=redis://localhost:6379
MCP_SERVER_URL=https://mcp.kapruka.com/mcp

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Key Design Decisions

1. **Gemini as orchestrator** — handles multilingual + tool calling natively
2. **MCP SDK for Python** — clean connection to Kapruka's MCP server
3. **Redis for cart** — fast session storage, TTL for abandoned carts
4. **Image proxy** — avoids CORS issues with Kapruka CDN images
5. **SSE streaming** — real-time agent responses to frontend
6. **No auth for users** — guest checkout aligns with Kapruka's guest-first approach
