# Kapruka Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Kapruka AI frontend into a premium mobile-first shopping workspace with distinct mobile, tablet, and desktop layouts plus full light and dark theme coverage.

**Architecture:** Keep the existing Next.js frontend and functional hooks, but replace the current page shell and high-traffic UI components with a tighter token-based layout system. The redesign should concentrate state orchestration in `page.tsx`, move repeated visual rules into CSS tokens and reusable class families, and recompose feature views so mobile and desktop render different structures where needed instead of sharing the same bulky wrappers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, lucide-react

---

## File Structure

- Modify: `frontend/src/app/globals.css`
  - Replace warm-only surface tokens with a dual light/dark token system and shared layout utility classes.
- Modify: `frontend/src/app/page.tsx`
  - Rebuild the app shell, top bars, mobile drawer, home/chat states, and device-specific layout composition.
- Modify: `frontend/src/components/ChatMessage.tsx`
  - Tighten bubble alignment, simplify assistant chrome, refine product rail styling, and keep TTS toggle behavior compact.
- Modify: `frontend/src/components/ProductCard.tsx`
  - Create a denser card anatomy with smaller controls and separate mobile/desktop density rules.
- Modify: `frontend/src/components/Cart.tsx`
  - Rework the cart pane/footer structure and collapsed budget section styling.
- Modify: `frontend/src/components/CheckoutDrawer.tsx`
  - Bring checkout into the new panel system with consistent footer CTA treatment.
- Modify: `frontend/src/components/GiftAdvisor.tsx`
  - Convert the current flow into a cleaner desktop panel and focused mobile selector experience.
- Modify: `frontend/src/components/TrackingCard.tsx`
  - Restyle tracking output into the new utility-panel system.
- Modify: `frontend/src/components/StatusModal.tsx`
  - Align the hidden `/status` UI with the new theme system.
- Test: `frontend/src/lib/ui-copy.spec.ts`
- Test: `frontend/src/lib/chat-command.spec.ts`

### Task 1: Lock Theme Tokens And Shared Surface Utilities

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Write the failing token checklist as comments in the stylesheet draft**

```css
/* redesign checklist
1. light + dark tokens
2. shared shell surfaces
3. compact control sizes
4. mobile-first spacing scale
*/
```

- [ ] **Step 2: Replace the current token block with light/dark variables**

```css
@theme {
  --color-bg: #fafaf9;
  --color-bg-elevated: #f4f2ee;
  --color-surface: #ffffff;
  --color-surface-muted: #f7f5f2;
  --color-surface-soft: #f1eeea;
  --color-ink: #171717;
  --color-ink-soft: #525252;
  --color-muted: #8a8a8a;
  --color-border: #e7e2db;
  --color-border-strong: #d7d0c6;
  --color-accent: #c8693a;
  --color-accent-strong: #b85b2f;
  --color-accent-soft: #f4dfd0;
  --color-success: #2f7a4b;
  --color-danger: #b42318;
}

:root[data-theme="dark"] {
  --color-bg: #111111;
  --color-bg-elevated: #171717;
  --color-surface: #1b1b1b;
  --color-surface-muted: #202020;
  --color-surface-soft: #262626;
  --color-ink: #f5f5f5;
  --color-ink-soft: #c7c7c7;
  --color-muted: #8f8f8f;
  --color-border: #2f2f2f;
  --color-border-strong: #3c3c3c;
  --color-accent: #d98957;
  --color-accent-strong: #e39a66;
  --color-accent-soft: rgba(217, 137, 87, 0.14);
  --color-success: #67c587;
  --color-danger: #ff7a7a;
}
```

- [ ] **Step 3: Add reusable shell classes instead of per-component ad hoc framing**

```css
.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top center, rgba(216, 206, 193, 0.18), transparent 28%),
    linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-elevated) 100%);
  color: var(--color-ink);
}

.surface-panel {
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  border: 1px solid var(--color-border);
  box-shadow: 0 14px 40px rgba(15, 15, 15, 0.04);
}

.surface-panel-dark-safe {
  box-shadow: none;
}

.hairline-divider {
  border-color: var(--color-border);
}
```

- [ ] **Step 4: Add compact control utility classes**

```css
.control-pill {
  min-height: 2.25rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  line-height: 1;
}

.icon-button-compact {
  display: grid;
  height: 2.25rem;
  width: 2.25rem;
  place-items: center;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}
```

- [ ] **Step 5: Run lint to catch CSS/import regressions**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add redesign theme tokens"
```

### Task 2: Rebuild The Main App Shell For Mobile, Tablet, And Desktop

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Write the failing shell assertions in the page test notes**

```ts
// redesign shell assertions
// mobile: fullscreen nav + fullscreen cart
// tablet: overlay cart
// desktop: left rail + center chat + right commerce pane
```

- [ ] **Step 2: Add a local theme state and `data-theme` sync**

```ts
const THEME_STORAGE_KEY = "kapruka.theme";

const [theme, setTheme] = useState<"light" | "dark">(() => {
  if (typeof window === "undefined") return "light";
  return (window.localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark") || "light";
});

useEffect(() => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}, [theme]);
```

- [ ] **Step 3: Replace the current outer layout with a responsive shell grid**

```tsx
<div className="app-shell">
  <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-3 py-3 md:px-4 md:py-4 xl:px-5">
    <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
      {/* left rail */}
      {/* main view */}
      {/* right commerce pane on xl+ */}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Replace the current top controls with one compact header system**

```tsx
<header className="mb-3 flex items-center justify-between gap-3 xl:hidden">
  <button type="button" className="icon-button-compact" onClick={() => setShowNav(true)}>
    <Menu size={16} />
  </button>
  <div className="flex min-w-0 items-center gap-2">
    <BrandMark compact />
    <div className="min-w-0">
      <p className="truncate mimo-serif text-[1.6rem] leading-none text-ink">
        Kapruka <span className="text-accent">AI</span>
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <UtilityIconButton
      icon={theme === "dark" ? <SunMedium size={15} /> : <MoonStar size={15} />}
      label="Toggle theme"
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
    />
    <UtilityIconButton icon={<ShoppingBag size={15} />} label="Open cart" onClick={() => openRightPanel("cart")} />
  </div>
</header>
```

- [ ] **Step 5: Turn mobile cart into the same fullscreen overlay family as nav**

```ts
const cartOverlayOpen = rightPanel !== null;
const desktopCartVisible = rightPanel !== null;
```

```tsx
{cartOverlayOpen ? (
  <div className="fixed inset-0 z-50 xl:hidden">
    <button type="button" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRightPanel(null)} />
    <div className="absolute inset-0 flex flex-col bg-[color:var(--color-bg)]">
      {/* cart or checkout body */}
    </div>
  </div>
) : null}
```

- [ ] **Step 6: Make returning sessions default to chat view**

```ts
useEffect(() => {
  if (messages.length > 0 && activeView === "home") {
    setActiveView("chat");
  }
}, [messages.length, activeView]);
```

- [ ] **Step 7: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: rebuild frontend app shell"
```

### Task 3: Redesign Empty Home And Active Chat States

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/ChatMessage.tsx`

- [ ] **Step 1: Replace the home hero with a compact session-aware launcher**

```tsx
const showHero = activeView === "home" && messages.length === 0;
```

```tsx
{showHero ? (
  <section className="surface-panel rounded-[1.5rem] p-5 md:p-6 xl:p-8">
    <p className="text-xs text-ink-soft">Shopping assistant</p>
    <h1 className="mimo-serif mt-2 max-w-[12ch] text-[2.5rem] leading-[0.95] md:text-[4.5rem]">
      Shop Sri Lanka, thoughtfully.
    </h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
      Ask for gifts, groceries, categories, deals, or order help without leaving the conversation.
    </p>
  </section>
) : null}
```

- [ ] **Step 2: Reduce launcher chips to a compact row system**

```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <ActionChip icon={<Gift size={14} />} label="Gift advisor" onClick={() => activateView("gift")} />
  <ActionChip icon={<Truck size={14} />} label="Track order" onClick={() => activateView("track")} />
  <ActionChip icon={<Grid2x2 size={14} />} label="Browse categories" onClick={() => activateView("categories")} />
  <ActionChip icon={<Tag size={14} />} label="Deals" onClick={() => activateView("offers")} />
</div>
```

- [ ] **Step 3: Tighten user and assistant bubble alignment**

```tsx
const bubbleClass = hasProducts
  ? "w-full max-w-none"
  : isUser
    ? "ml-auto max-w-[min(92%,42rem)]"
    : "mr-auto max-w-[min(96%,58rem)]";
```

```tsx
<div className="flex w-full justify-end">
  <div className="rounded-[1.4rem] rounded-br-sm bg-[linear-gradient(180deg,#f3e0d0,#eed0bb)] px-4 py-3">
    ...
  </div>
</div>
```

```tsx
<div className="flex w-full items-start gap-3">
  <div className="hidden pt-1 sm:block">{/* bot avatar */}</div>
  <div className="rounded-[1.4rem] rounded-tl-sm border border-border bg-surface px-4 py-3">
    ...
  </div>
</div>
```

- [ ] **Step 4: Make assistant controls visually quieter**

```tsx
<button
  type="button"
  className={`control-pill inline-flex items-center gap-1.5 text-xs ${isSpeaking ? "border-accent text-accent" : "text-ink-soft"}`}
>
  {isSpeaking ? <Square size={12} /> : <Play size={12} />}
  {isSpeaking ? "Stop" : "Play"}
</button>
```

- [ ] **Step 5: Keep the streaming state as a clean low-noise indicator**

```tsx
{showLoadingDots ? (
  <div className="mt-3 flex items-center gap-1.5 text-muted">
    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
  </div>
) : null}
```

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/components/ChatMessage.tsx
git commit -m "feat: redesign home and chat states"
```

### Task 4: Rebuild Product Rail And Product Card Density

**Files:**
- Modify: `frontend/src/components/ChatMessage.tsx`
- Modify: `frontend/src/components/ProductCard.tsx`

- [ ] **Step 1: Keep product browsing horizontal everywhere**

```tsx
<div
  ref={railRef}
  className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3"
>
```

- [ ] **Step 2: Shrink the mobile card width**

```tsx
<div
  key={product.product_id || product.product_url || product.name}
  className="w-[9.75rem] shrink-0 snap-start sm:w-[11rem] md:w-[12.5rem] xl:w-[13.5rem]"
>
```

- [ ] **Step 3: Replace the heavy control tray in product cards**

```tsx
<div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2">
  <div className="flex items-center gap-1">
    <button type="button" className="icon-button-compact h-7 w-7 md:h-8 md:w-8">
      <Minus size={12} />
    </button>
    <span className="min-w-4 text-center text-xs">{quantity}</span>
    <button type="button" className="icon-button-compact h-7 w-7 md:h-8 md:w-8">
      <Plus size={12} />
    </button>
  </div>
  <button type="button" className="inline-flex h-8 items-center justify-center rounded-full bg-accent px-3 text-xs font-medium text-white md:h-9">
    Add
  </button>
</div>
```

- [ ] **Step 4: Hide non-essential metadata earlier on mobile**

```tsx
<span className="hidden text-muted md:inline">(124)</span>
```

- [ ] **Step 5: Keep desktop arrows and mobile swipe**

```tsx
{products.length > 2 ? (
  <div className="hidden items-center gap-1 md:flex">
    ...
  </div>
) : null}
```

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ChatMessage.tsx frontend/src/components/ProductCard.tsx
git commit -m "feat: compact product rail and cards"
```

### Task 5: Normalize Cart, Checkout, And Budget Surfaces

**Files:**
- Modify: `frontend/src/components/Cart.tsx`
- Modify: `frontend/src/components/CheckoutDrawer.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Collapse budget by default and preserve manual expand**

```ts
const [showBudget, setShowBudget] = useState(false);
```

- [ ] **Step 2: Reduce framing noise in the cart summary**

```tsx
<div className="mt-auto border-t border-border px-4 py-4">
  <div className="rounded-[1.25rem] border border-border bg-surface p-4">
    ...
  </div>
  <button type="button" className="mt-3 h-11 w-full rounded-full bg-accent text-sm font-medium text-white">
    View Cart & Checkout
  </button>
</div>
```

- [ ] **Step 3: Match checkout footer CTA behavior to cart**

```tsx
<div className="mt-auto border-t border-border px-4 py-4">
  <button type="button" className="h-11 w-full rounded-full bg-accent text-sm font-medium text-white">
    Place order
  </button>
</div>
```

- [ ] **Step 4: Keep desktop right panel and mobile fullscreen modal consistent**

```tsx
<div className="flex h-full flex-col">
  {/* shared header */}
  {/* body */}
  {/* pinned footer */}
</div>
```

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Cart.tsx frontend/src/components/CheckoutDrawer.tsx frontend/src/app/page.tsx
git commit -m "feat: normalize cart and checkout panels"
```

### Task 6: Rework Gift Advisor, Categories, Deals, And Tracking Views

**Files:**
- Modify: `frontend/src/components/GiftAdvisor.tsx`
- Modify: `frontend/src/components/TrackingCard.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Turn workflow views into focused utility surfaces**

```tsx
function WorkflowPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="surface-panel rounded-[1.5rem] p-5 md:p-6">
        <h1 className="mimo-serif text-[2rem] leading-[0.98] md:text-[3.75rem]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">{description}</p>
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Make mobile gift advisor step cards smaller and more grid-like**

```tsx
<div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:gap-3">
  {step.choices.map((choice) => (
    <button key={choice.label} type="button" className="rounded-[0.9rem] border border-border bg-surface px-3 py-3 text-left md:rounded-[1.15rem]">
      ...
    </button>
  ))}
</div>
```

- [ ] **Step 3: Shrink tracking layout on mobile and keep desktop detail on larger screens**

```tsx
<section className="mt-4 overflow-hidden md:rounded-[1.4rem] md:border md:border-border md:bg-surface">
  ...
</section>
```

- [ ] **Step 4: Make categories and deals use chips + rails, not large explanatory blocks**

```tsx
<div className="flex flex-wrap gap-2">
  {categoryOptions.map((category) => (
    <button key={category.label} type="button" className="control-pill text-left">
      {category.label}
    </button>
  ))}
</div>
```

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/GiftAdvisor.tsx frontend/src/components/TrackingCard.tsx frontend/src/app/page.tsx
git commit -m "feat: redesign workflow views"
```

### Task 7: Verify Light Theme, Dark Theme, Desktop, Tablet, And Mobile

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`
- Test: browser-rendered app at `http://localhost:3000`

- [ ] **Step 1: Start the frontend**

Run: `npm run dev`
Expected: Next.js dev server starts on `http://localhost:3000`

- [ ] **Step 2: Verify desktop light theme**

Run: open `http://localhost:3000` in browser
Expected: slim left rail, central chat canvas, right commerce pane, compact controls

- [ ] **Step 3: Verify desktop dark theme**

Run: toggle theme in the app
Expected: the same shell and density with charcoal surfaces and warm accent

- [ ] **Step 4: Verify mobile light theme**

Run: browser responsive mode around `390x844`
Expected: fullscreen nav overlay, fullscreen cart overlay, compact product rail, bottom composer

- [ ] **Step 5: Verify mobile dark theme**

Run: responsive mode + theme toggle
Expected: consistent dark surfaces and readable controls

- [ ] **Step 6: Verify tablet layout**

Run: responsive mode around `820x1180`
Expected: compressed shell, overlay commerce, no clutter or overflow

- [ ] **Step 7: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/globals.css frontend/src/components frontend/src/lib
git commit -m "feat: finish frontend redesign verification pass"
```

## Plan Self-Review

- Spec coverage: home, chat, gift advisor, tracking, categories, deals, cart, checkout, product rails, dark mode, and mobile-specific behavior are all covered.
- Placeholder scan: clear
- Type consistency: state, view names, and file targets match the current codebase.

## Execution Handoff

This plan is written for inline execution next. The next implementation pass should follow these tasks in order and verify each breakpoint family in the browser instead of treating mobile as a resized desktop.
