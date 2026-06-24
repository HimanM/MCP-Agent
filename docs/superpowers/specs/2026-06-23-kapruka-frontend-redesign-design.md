# Kapruka Frontend Redesign Spec

**Date:** 2026-06-23  
**Branch:** `codex/frontend-redesign-premium`  
**Scope:** Full frontend redesign for the shopping assistant surface, mobile-first, with light and dark theme support.

## Goal

Redesign the Kapruka AI frontend into a premium shopping workspace that feels closer to a modern conversational product than a landing page. The redesign must be mobile-first in behavior, not just responsive in width. Each device class needs layout changes, density changes, and different interaction patterns so the UI stays clean while still supporting chat, shopping, tracking, categories, deals, cart, and checkout.

## Design Inputs

### User Requirements

- Use the supplied artboards as the main visual reference.
- Blend that premium workspace feel with the Refero editorial style reference.
- Keep the design minimal, elegant, and authentic.
- Support both light and dark theme.
- Use smaller buttons and tighter controls than the current UI.
- Avoid clutter on mobile by changing layouts and sizing instead of simply shrinking the desktop UI.

### Reference Artboards

- `/C:/Users/mandu/.codex/generated_images/019eea2b-0691-7531-b0a2-4962df61391a/ig_040607ffe9799308016a3870e8674c8191ac935c021b1aebb1.png`
- `/D:/Downloads/2853e849d51efd49e334bf399b3b115c.webp`
- `/D:/Downloads/a40003c6218dff98aa6ced56b9ea88b9.webp`
- `/D:/Downloads/db9512ff532d018832bb3dd88edfc344.webp`

## Chosen Product Direction

### Positioning

The app should feel like:

- ChatGPT-level conversational clarity
- A premium commerce workspace on desktop
- A native-feeling shopping chat app on mobile

It should not feel like:

- A generic chatbot landing page
- A marketing site wrapped around a chat widget
- A desktop dashboard crudely squeezed into a phone

### Core UX Model

1. Returning users enter the active conversation directly.
2. First-time or empty-session users see a minimal home launcher.
3. Chat is the primary surface.
4. Categories, deals, tracking, cart, and checkout are adjacent workflows, not separate visual products.

## Visual System

### Color

#### Light Theme

- Base background: paper white
- Secondary surfaces: pale stone and soft ash
- Borders: fine warm-gray hairlines
- Accent: restrained Kapruka warm orange only for active states, CTA emphasis, badges, and small signals

#### Dark Theme

- Base background: ink-black / charcoal
- Secondary surfaces: dark graphite with low-contrast separation
- Borders: faint graphite hairlines
- Accent: same warm orange, slightly brighter than in light mode

### Typography

- Display typography: elegant editorial serif for primary headings only
- UI typography: precise sans for controls, lists, body text, chips, drawers, and product metadata
- Heading usage should be rare and intentional
- In active session views, the interface should be mostly UI typography with sparse serif moments

### Shape and Framing

- Reduce the number of outlined containers
- Use fewer large rounded cards than the current UI
- Favor straight section rhythm with subtle radius, thin borders, and open spacing
- Use pills for chips and small controls only, not for every section wrapper

### Motion

- Keep motion subtle and fast
- Use fade, slide, and soft scale for drawers, composer focus, and message entry
- No theatrical animation
- Mobile overlays must feel smoother than the current implementation

## Information Architecture

### Primary Views

- `home`
- `chat`
- `gift advisor`
- `track order`
- `categories`
- `deals`
- `cart`
- `checkout`

### Structural Rule

Desktop may show multiple contexts at once. Mobile must show one primary context at a time.

## Layout Specification By Device Class

### Mobile: 320px to 767px

#### App Shell

- Compact top bar only
- Left icon opens fullscreen navigation drawer
- Right icon opens cart as fullscreen modal surface
- No permanent sidebars
- Bottom composer remains visible whenever the user is in chat

#### Chat Layout

- Chat content owns the screen
- Welcome state is short, not hero-like
- Action suggestions appear as compact pills in one or two rows max
- Product results render in a compact horizontal rail
- Product cards must be visibly smaller than current mobile cards
- Cards should show image, short title, price, rating, and the minimum viable quantity/add control
- Avoid long vertical stacks of large cards

#### Mobile Navigation

- Fullscreen overlay with blur backdrop
- Edge-to-edge sheet, no floating rounded mini-panel
- Brand row at top
- Main destinations in one clean vertical list
- Language switching removed from visible nav controls

#### Mobile Cart and Checkout

- Fullscreen overlay pattern, same family as nav
- Cart and checkout share one consistent visual shell
- Footer CTA pinned to bottom safe area
- Budget section collapsed by default
- Quantity controls remain usable without consuming too much height

#### Mobile Track Order

- Separate focused utility page
- Taller input than desktop
- Clear submit CTA
- Result summary visible above detailed breakdown

#### Mobile Categories and Deals

- Compact chips and narrow product rails
- Category chips should fit 4 to 5 per row where space allows
- Avoid giant blocks or deeply padded cards

### Tablet: 768px to 1199px

- Left nav becomes collapsible rail or slim sidebar
- Right cart context becomes overlay drawer instead of permanent panel
- Chat remains dominant
- Product rails show more cards per viewport than mobile but keep compact density
- Welcome and workflow panels compress significantly compared to desktop

### Desktop: 1200px and above

#### App Shell

- Slim workspace sidebar on the left
- Main conversation canvas in the center
- Contextual commerce panel on the right for cart and checkout
- Use the available width instead of centering the app into a narrow column

#### Sidebar

- Brand at top
- Primary destinations
- Recent conversations beneath or as a secondary section
- Profile and rewards condensed at bottom
- Smaller nav pills than current implementation

#### Main Canvas

- Empty home state can have a stronger editorial treatment
- Once chat exists, the screen becomes more utilitarian
- Message column should feel aligned, generous, and calm
- Horizontal product rails sit within the assistant flow

#### Right Panel

- Cart stays visible on desktop as a contextual workspace panel
- Checkout can replace or slide over the cart within the same region
- Budget section collapsed by default
- Footer actions should be consistent between cart and checkout

## Feature-Specific Rules

### Home

- Only shown for new or cleared sessions
- Minimal headline, short helper text, compact suggestions
- No bulky marketing section stacks
- No giant decorative blocks below the fold

### Chat

- User bubbles right-aligned
- Assistant bubbles left-aligned
- Bubble shape asymmetry should be subtle, not cartoonish
- TTS controls are a single toggle, not two separate actions
- TTS controls should be visually quieter

### Gift Advisor

- Keep as a guided flow
- On mobile, each step should feel like a focused selector view, not a desktop modal squeezed vertically
- Answer tiles need smaller footprint and better grouping

### Categories

- The view should explain the workflow through UI, not paragraphs
- Pick category, browse products in context, continue in chat if needed
- This should feel like shopping navigation rather than markdown output

### Deals

- Same visual language as categories
- Show products directly, not chat-first explanation blocks
- Allow easy continuation into cart

### Track Order

- Dedicated utility surface
- Minimal friction
- Better input affordance than current implementation

### Product Cards

- Desktop cards can retain more metadata
- Mobile cards must be materially smaller
- Controls should be compact and aligned
- Remove visual bulk from lower control trays
- Support horizontal browsing with arrows on larger screens and swipe on touch devices

### Cart and Checkout

- Consistent panel structure
- Consistent footer CTA treatment
- Budget control hidden behind collapse by default
- Summary rows and totals should be cleaner and denser

## Theme Behavior

### Light Mode

- Default mode
- Airy, premium, bright, low-noise

### Dark Mode

- Full parity, not partial inversion
- Each major surface must have explicit dark styling
- Chat, product cards, drawers, chips, composer, tracking, and checkout all need coherent dark tokens

## Copy and Controls

- Remove unnecessary visible language toggles from the primary UI
- Keep developer-only operational detail behind `/status`
- Buttons should be smaller and more disciplined than the current implementation
- Top bar utilities should not compete with the conversation

## Technical Constraints For Implementation

- Follow the current Next.js app structure
- Reuse existing functionality where possible
- Replace layout and styling aggressively where the current structure causes clutter
- Keep icon usage high-quality and consistent
- Prefer tokenized theme values over one-off inline styling

## Files Most Likely To Change

- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/components/ChatMessage.tsx`
- `frontend/src/components/ProductCard.tsx`
- `frontend/src/components/Cart.tsx`
- `frontend/src/components/CheckoutDrawer.tsx`
- `frontend/src/components/GiftAdvisor.tsx`
- `frontend/src/components/TrackingCard.tsx`
- `frontend/src/components/StatusModal.tsx`
- `frontend/src/lib/ui-copy.ts`

## Acceptance Criteria

1. The app supports both light and dark theme across all primary surfaces.
2. Mobile is a distinct layout system, not a scaled desktop.
3. Desktop uses a slim workspace shell with a central chat and right-side commerce context.
4. Product browsing is compact and usable on mobile.
5. The current visual clutter from too many outlines, bulky sections, and oversized controls is reduced.
6. Home, chat, categories, deals, tracking, cart, and checkout feel like one cohesive product family.
7. The new UI remains compatible with existing chat, cart, tracking, and TTS behavior.

## Out of Scope For This Redesign Pass

- Backend behavior changes unrelated to UI needs
- New business workflows not already present in the product
- Large feature additions beyond what is needed to make existing flows coherent

## Spec Self-Review

- Placeholder scan: clear
- Internal consistency: layout, theming, and device behavior align
- Scope check: focused on one subsystem, the frontend product surface
- Ambiguity check: mobile, tablet, desktop behavior is explicit enough to implement
