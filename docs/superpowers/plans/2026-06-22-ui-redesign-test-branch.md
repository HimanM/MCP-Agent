# UI Redesign Test Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Kapruka AI frontend on top of `test_branch` with a consistent premium shopping theme, responsive desktop/mobile layout, and a hidden `/status` dev surface.

**Architecture:** Keep the existing app behavior and APIs, but replace the current shell and card styling with a cleaner storefront layout. Move command parsing into a tiny utility, keep debug metadata hidden unless explicitly requested, and preserve language and voice features in the new layout.

**Tech Stack:** Next.js app router, React 19, Tailwind CSS v4, `next/font`, `lucide-react`, existing frontend hooks and API helpers.

---

### Task 1: Command Surface

**Files:**
- Create: `frontend/src/lib/chat-command.ts`
- Create: `frontend/src/lib/chat-command.spec.ts`
- Modify: `frontend/src/app/page.tsx`

- [ ] Add a failing test for `/status` parsing.
- [ ] Implement the minimal parser that returns a `status` command only for trimmed `/status`.
- [ ] Wire the page to intercept that command and open a hidden status modal instead of sending chat.

### Task 2: Theme Foundations

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`

- [ ] Add a proper icon library.
- [ ] Add display/body fonts with `next/font`.
- [ ] Replace the old generic tokens and helper classes with the new premium storefront design tokens, motion, and shared utility classes.

### Task 3: App Shell Redesign

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/StatusModal.tsx`

- [ ] Rebuild the desktop shell with left rail, central conversation area, and right utility column.
- [ ] Rebuild the mobile shell with a compact header, bottom nav feel, and stacked utility surfaces.
- [ ] Keep language switching, mic, and voice reply controls visible but integrated cleanly into the new theme.

### Task 4: Rich Surface Restyle

**Files:**
- Modify: `frontend/src/components/ChatMessage.tsx`
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/components/Cart.tsx`
- Modify: `frontend/src/components/CheckoutDrawer.tsx`
- Modify: `frontend/src/components/GiftAdvisor.tsx`
- Modify: `frontend/src/components/TrackingCard.tsx`
- Modify: `frontend/src/components/PayLinkCard.tsx`

- [ ] Restyle all rich cards to match the accepted storefront direction.
- [ ] Improve spacing, hierarchy, controls, and icon use.
- [ ] Preserve existing behaviors and responsive states.

### Task 5: Verification

**Files:**
- No code changes required unless fixes are needed.

- [ ] Run targeted frontend tests for command parsing.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Open the app in the browser, compare against the approved concept, and fix obvious drift.
