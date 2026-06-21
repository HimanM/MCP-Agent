"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties, type FormEvent } from "react";
import ChatMessage from "@/components/ChatMessage";
import Cart from "@/components/Cart";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import { useCart } from "@/hooks/useCart";
import { useChat } from "@/hooks/useChat";
import { getBackendMeta, type BackendMeta, updateCheckoutInfo, updateBudget, type CheckoutInfoPayload } from "@/lib/api";

function generateSessionId() {
  return `sess-${Math.random().toString(36).slice(2, 10)}`;
}

const SESSION_STORAGE_KEY = "kapruka.chat.session";
const SESSION_TTL_MS = 5 * 60 * 1000;

function loadSessionId() {
  if (typeof window === "undefined") return generateSessionId();

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as { id?: string; expiresAt?: number };
      if (stored.id && stored.expiresAt && stored.expiresAt > Date.now()) {
        return stored.id;
      }
    }
  } catch {
    // ignore
  }

  return generateSessionId();
}

function saveSessionId(sessionId: string) {
  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ id: sessionId, expiresAt: Date.now() + SESSION_TTL_MS })
    );
  } catch {
    // ignore
  }
}

const suggestions = [
  "Find birthday cakes",
  "Flowers for anniversary",
  "Gift ideas for wife",
  "Party supplies for 10",
];

function CartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.64 16h9.72a2 2 0 0 0 1.96-1.61L23 6H6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function Home() {
  const [sessionId] = useState(loadSessionId);
  const { messages, isStreaming, error, sendMessage } = useChat(sessionId);
  const { cart, total, updateQuantity, removeItem, refresh } = useCart(sessionId);
  const [backendMeta, setBackendMeta] = useState<BackendMeta | null>(null);
  const [input, setInput] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSaved, setCheckoutSaved] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [inkPosition, setInkPosition] = useState({ x: "50%", y: "42%" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const submitCurrentMessage = useCallback(() => {
    const rawMessage = inputRef.current?.value ?? input;
    const nextMessage = rawMessage.trim();
    if (!nextMessage) return;
    saveSessionId(sessionId);
    sendMessage(nextMessage);
    setInput("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [input, sendMessage]);

  useEffect(() => {
    saveSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const syncFromDom = () => setInput(el.value);
    syncFromDom();
    el.addEventListener("input", syncFromDom);
    el.addEventListener("change", syncFromDom);
    el.addEventListener("keyup", syncFromDom);
    const interval = window.setInterval(() => {
      setInput((current) => (current === el.value ? current : el.value));
    }, 150);

    return () => {
      window.clearInterval(interval);
      el.removeEventListener("input", syncFromDom);
      el.removeEventListener("change", syncFromDom);
      el.removeEventListener("keyup", syncFromDom);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const chatValue = inputRef.current?.value ?? "";
      setInput((current) => (current === chatValue ? current : chatValue));

      const budgetValue = budgetInputRef.current?.value ?? "";
      setBudgetDraft((current) => (current === budgetValue ? current : budgetValue));
    }, 120);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    getBackendMeta()
      .then((meta) => {
        if (active) setBackendMeta(meta);
      })
      .catch(() => {
        if (active) setBackendMeta(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setBudgetDraft(cart.budget_max != null ? String(cart.budget_max) : "");
  }, [cart.budget_max]);

  const openCheckout = () => {
    setCheckoutSaved(false);
    setCheckoutError(null);
    setShowCart(true);
    setShowCheckout(true);
  };

  const handleCheckoutSubmit = async (payload: CheckoutInfoPayload) => {
    setCheckoutSaving(true);
    setCheckoutError(null);
    try {
      await updateCheckoutInfo(sessionId, payload);
      await refresh();
      setCheckoutSaved(true);
      setShowCheckout(false);
      window.setTimeout(() => setCheckoutSaved(false), 3000);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to save checkout details");
    } finally {
      setCheckoutSaving(false);
    }
  };

  const handleBudgetSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBudgetSaving(true);
    try {
      const rawBudget = budgetInputRef.current?.value ?? budgetDraft;
      const parsed = rawBudget.trim() ? Number(rawBudget.replace(/,/g, "")) : null;
      await updateBudget(sessionId, Number.isFinite(parsed as number) ? (parsed as number) : null);
      await refresh();
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleBudgetClear = async () => {
    setBudgetSaving(true);
    try {
      await updateBudget(sessionId, null);
      await refresh();
    } finally {
      setBudgetSaving(false);
    }
  };

  const budgetTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasBudget = cart.budget_max != null && Number.isFinite(cart.budget_max);
  const budgetLabel = hasBudget ? `Budget: Rs. ${(cart.budget_max as number).toLocaleString()}` : "No budget set";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitCurrentMessage();
  };

  useEffect(() => {
    const inputEl = inputRef.current;
    const buttonEl = sendButtonRef.current;
    if (!inputEl || !buttonEl) return;

    const handleClick = () => submitCurrentMessage();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitCurrentMessage();
      }
    };

    buttonEl.addEventListener("click", handleClick);
    inputEl.addEventListener("keydown", handleKeyDown);
    return () => {
      buttonEl.removeEventListener("click", handleClick);
      inputEl.removeEventListener("keydown", handleKeyDown);
    };
  }, [submitCurrentMessage]);

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const inkStyle = {
    "--ink-x": inkPosition.x,
    "--ink-y": inkPosition.y,
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[22rem] max-w-[88vw] flex-col border-r border-border bg-surface shadow-[18px_0_60px_rgba(37,36,31,0.08)] transition-transform duration-300 ease-out ${
          showCart ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">Cart</h2>
            <p className="mt-0.5 text-xs text-muted">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCheckout(false);
              setShowCart(false);
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-ink-soft transition hover:border-border-hover hover:bg-surface-2"
            aria-label="Close cart"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Cart
            cart={cart}
            total={total}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onCheckout={openCheckout}
            budgetDraft={budgetDraft}
            budgetSaving={budgetSaving}
            onBudgetDraftChange={setBudgetDraft}
            onBudgetSubmit={handleBudgetSubmit}
            onBudgetClear={handleBudgetClear}
            budgetInputRef={budgetInputRef}
          />
        </div>
      </aside>

      {showCart && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => {
            setShowCart(false);
            setShowCheckout(false);
          }}
          aria-label="Close cart overlay"
        />
      )}

      {showCheckout && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setShowCheckout(false)}
          aria-label="Close checkout overlay"
        />
      )}

      <CheckoutDrawer
        open={showCheckout}
        cart={cart}
        total={total}
        onClose={() => setShowCheckout(false)}
        onSubmit={handleCheckoutSubmit}
        isSaving={checkoutSaving}
        error={checkoutError}
      />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-bg/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold tracking-tight text-ink">
              Kapruka<span className="text-xiaomi">AI</span>
            </div>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden text-sm text-ink-soft sm:block">Shopping assistant</span>
            {backendMeta && (
              <div className="hidden items-center gap-2 text-xs text-ink-soft md:flex">
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 capitalize">
                  {backendMeta.provider}
                </span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">
                  {backendMeta.model}
                </span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">
                  {backendMeta.mcp.tool_count} MCP tools
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative inline-flex h-10 items-center gap-2 rounded-full border border-border bg-bg px-4 text-sm text-ink transition hover:border-border-hover hover:bg-surface"
          >
            <CartIcon />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-xiaomi px-1.5 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        {checkoutSaved && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900 md:px-8">
            Checkout details saved. Your cart is ready for order review.
          </div>
        )}

        <main className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="flex min-h-full w-full flex-col px-5 py-10 md:px-8 md:py-14">
              {messages.length === 0 && (
                <section
                  className="ink-host animate-fade-in relative mx-auto flex min-h-[58vh] w-full max-w-5xl flex-col items-center justify-center overflow-hidden text-center"
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setInkPosition({
                      x: `${((event.clientX - rect.left) / rect.width) * 100}%`,
                      y: `${((event.clientY - rect.top) / rect.height) * 100}%`,
                    });
                  }}
                >
                  <div className="ink-reveal" style={inkStyle} aria-hidden="true" />
                  <div className="relative z-10 flex w-full flex-col items-center">
                    <p className="mb-4 text-sm font-medium text-ink-soft">
                      {backendMeta ? `${backendMeta.provider} • ${backendMeta.mcp.tool_count} MCP tools` : "Live shopping agent"}
                    </p>
                    <h1 className="mimo-serif max-w-full text-4xl font-normal tracking-normal text-ink sm:text-5xl md:text-6xl">
                      Shop with an AI assistant
                    </h1>
                    <p className="command-cursor mt-6 max-w-2xl text-base leading-relaxed text-ink sm:text-xl">
                      Discover products in chat, add to cart instantly, and save checkout details in a real side panel.
                    </p>

                    <div className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-surface-2/90 px-4 py-3 text-left text-sm text-ink-soft shadow-[0_18px_45px_rgba(37,36,31,0.04)] backdrop-blur-sm">
                      <span className="text-muted">&gt;_</span>
                      <span className="min-w-0 truncate">Find a birthday gift under Rs. 10,000</span>
                    </div>

                    <div className="mt-10 flex w-full max-w-4xl flex-wrap justify-center gap-3 px-2">
                      {suggestions.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => sendMessage(text)}
                          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-border bg-bg/85 px-5 py-2.5 text-sm leading-tight text-ink backdrop-blur-sm transition hover:border-ink hover:bg-surface"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-xiaomi" />
                          <span>{text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {messages.length > 0 && (
                <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} sessionId={sessionId} onAdded={refresh} />
                  ))}

                  {isStreaming && messages[messages.length - 1].role === "user" && (
                    <div className="animate-fade-in flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                          <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                          <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="animate-fade-in flex justify-center">
                  <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs text-danger">
                    {error}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-bg/95 px-5 py-4 backdrop-blur md:px-8 md:py-5">
            <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl gap-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyUp={(e) => setInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCurrentMessage();
                  }
                }}
                placeholder="Search products, ask for recommendations..."
                disabled={isStreaming}
                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(37,36,31,0.08)] disabled:opacity-40"
              />
              <button
                ref={sendButtonRef}
                type="button"
                onClick={submitCurrentMessage}
                disabled={isStreaming}
                className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-30 active:scale-[0.98]"
                aria-label="Send message"
              >
                {isStreaming ? (
                  <div className="flex items-center gap-1">
                    <div className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
                    <div className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
                    <div className="typing-dot h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                ) : (
                  <ArrowIcon />
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
