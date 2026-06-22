# Kapruka AI UI Functionality Brief

## Purpose

This UI is for a Kapruka shopping assistant that lets a user discover products, manage a cart, save checkout details, place an order, and track an existing order from one chat-driven interface.

This document is intentionally about functionality, not styling. It is meant to brief a frontend designer on what the interface must support.

## Product Goal

The frontend should feel like a shopping assistant first, not a developer demo.

The UI should help users:

1. Start quickly from common shopping intents
2. Discover products through chat
3. Add products to a cart without leaving the conversation
4. Save delivery and sender details
5. Continue to payment when checkout is ready
6. Track an existing order
7. Use the app in English, Sinhala, or Tamil

## Primary User Flows

### 1. Product Discovery

The user can:

1. Type a free-form message into chat
2. Use quick actions like groceries, cake, flowers, categories, or tracking
3. Open a guided Gift Advisor flow
4. Receive product recommendations in chat
5. Open product pages
6. Add products to cart from recommendation cards

### 2. Gift Advisor

The user can:

1. Open a guided gift finder from the home screen or chat actions
2. Answer a short multi-step flow
3. Generate a chat prompt automatically from those answers
4. Continue product discovery in the main chat after the flow completes

### 3. Cart Management

The user can:

1. Open the cart from the header
2. See all selected items
3. Increase quantity
4. Decrease quantity
5. Remove items
6. See running total
7. Set an optional budget
8. Clear the budget
9. See a warning if the cart exceeds budget

### 4. Checkout Preparation

The user can:

1. Open checkout details from the cart or other obvious CTA points
2. Save recipient information
3. Save delivery address, city, and preferred date
4. Save sender name
5. Save an optional gift message
6. Return to chat after saving

### 5. Order Placement / Payment

The user can:

1. Trigger checkout through chat once cart and details exist
2. Receive a payment/order card in chat
3. See order number
4. See payment link
5. See currency / total / expiry if available

### 6. Order Tracking

The user can:

1. Start tracking from a clear CTA
2. Ask for tracking naturally in chat
3. Be prompted for an order number if missing
4. View a tracking card with status, recipient, items, ETA, location, and timeline events

### 7. Voice Interaction

The user can:

1. Dictate a message with voice input if supported by the browser
2. Toggle spoken assistant replies if supported

Voice is optional enhancement, not a required primary entry path.

### 8. Multilingual UI

The user can:

1. Switch the interface between English, Sinhala, and Tamil
2. Use localized labels, prompts, helper text, and CTA copy

The core shopping behavior stays the same across languages.

## Required Screens / Regions

### A. Header

Must support:

1. Brand / product identity
2. Language switcher
3. Cart entry point with item count

Should not permanently show developer-facing metadata like provider/model/tool count.

### B. Empty-State Home / Landing

Must support:

1. Clear explanation of what the assistant can do
2. Main CTA to start shopping
3. Shortcut actions for common intents
4. Shortcut entry to gift advisor
5. Shortcut entry to order tracking
6. Shortcut entry to categories
7. Optional shortcut to checkout if cart already has items

### C. Chat Conversation Area

Must support:

1. User messages
2. Assistant messages
3. Loading / streaming state
4. Tool progress indicators in a user-friendly way
5. Rich assistant outputs:
   - product grid/cards
   - tracking card
   - payment/order card

### D. Input Composer

Must support:

1. Text input
2. Send action
3. Optional voice input
4. Optional voice reply toggle
5. Disabled/loading states while sending

### E. Cart Panel

Must support:

1. Cart item list
2. Quantity editing
3. Remove action
4. Budget form
5. Total summary
6. Checkout CTA
7. Empty cart state

### F. Checkout Details Panel / Drawer

Must support:

1. Recipient section
2. Delivery section
3. Sender section
4. Gift message section
5. Save action
6. Cancel / close action
7. Error feedback
8. Order summary context

### G. Gift Advisor Modal / Sheet

Must support:

1. Multi-step guided choice flow
2. Progress indication
3. Back action
4. Close action
5. Auto-submit into chat at the end

### H. Hidden Status / Debug Surface

Must support:

1. A slash command such as `/status`
2. A hidden popup / modal / command palette style surface
3. Read-only operational info for debugging:
   - active model/provider
   - MCP tool count
   - connected/disconnected state
   - maybe session id

This information should be hidden from the normal UI by default.

## Functional Components The Designer Should Account For

1. Chat bubbles
2. Product card
3. Tracking card
4. Payment / order card
5. Quick action chip/button
6. Cart item row
7. Budget widget
8. Checkout form fields
9. Language toggle
10. Voice controls
11. Toast / inline success state
12. Error state
13. Empty states
14. Loading indicators
15. Hidden `/status` popup

## Important States

The design should handle:

1. First visit with no messages
2. Active chat with messages
3. Product result message
4. Tracking result message
5. Payment result message
6. Empty cart
7. Filled cart
8. Checkout drawer open
9. Gift advisor open
10. Voice supported
11. Voice unsupported
12. Saving state
13. Error state
14. Language switched
15. Hidden `/status` popup open

## Information To De-Emphasize or Hide

These should not be visible in the default everyday UI:

1. LLM provider name
2. Model name
3. MCP tool count
4. Backend/system metadata

Expose them only through the `/status` interaction.

## Design Priorities

The redesign should optimize for:

1. Fast understanding of what the app does
2. Smooth transition from landing to chat to cart to checkout
3. Strong shopping feel over "AI playground" feel
4. Clear CTAs for gift advisor and order tracking
5. Calm, consistent theme across all surfaces
6. Mobile-first usability with desktop polish

## Non-Goals

The new UI does not need to add brand-new product functionality right now.

This phase is about:

1. Better structure
2. Better hierarchy
3. Better consistency
4. Better hiding of technical/debug details

## Recommended Design Direction

Recommended approach: design this like a premium conversational storefront.

That means:

1. Shopping-first layout
2. Chat as the main workflow engine
3. Rich cards for outputs
4. Utility surfaces as drawers/modals
5. Debug info hidden behind `/status`

Avoid making it look like:

1. A raw chatbot demo
2. A developer dashboard
3. A generic SaaS admin panel
