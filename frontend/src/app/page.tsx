"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useChat } from "@/hooks/useChat";
import { useCart } from "@/hooks/useCart";
import ChatMessage from "@/components/ChatMessage";
import Cart from "@/components/Cart";

function generateSessionId() {
  return "sess-" + Math.random().toString(36).slice(2, 10);
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
  const [sessionId] = useState(generateSessionId);
  const { messages, isStreaming, error, sendMessage } = useChat(sessionId);
  const { cart, total, updateQuantity, removeItem } = useCart(sessionId);
  const [input, setInput] = useState("");
  const [showCart, setShowCart] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inkPosition, setInkPosition] = useState({ x: "50%", y: "42%" });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowCart(true);
      sendMessage("checkout");
    };
    window.addEventListener("start-checkout", handler);
    return () => window.removeEventListener("start-checkout", handler);
  }, [sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
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
            onClick={() => setShowCart(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-ink-soft transition hover:border-border-hover hover:bg-surface-2"
            aria-label="Close cart"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Cart items={cart.items} total={total} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
        </div>
      </aside>

      {showCart && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setShowCart(false)}
          aria-label="Close cart overlay"
        />
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-bg/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold tracking-tight text-ink">
              Kapruka<span className="text-xiaomi">AI</span>
            </div>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden text-sm text-ink-soft sm:block">Shopping assistant</span>
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

        <main className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div data-ui="main-wrap" className="flex min-h-full w-full flex-col px-5 py-10 md:px-8 md:py-14">
              {messages.length === 0 && (
                <section
                  data-ui="hero"
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
                    <p className="mb-4 text-sm font-medium text-ink-soft">Kapruka AI</p>
                    <h1 className="mimo-serif max-w-full text-4xl font-normal tracking-normal text-ink sm:text-5xl md:text-6xl">
                      Shop through chat
                    </h1>
                    <p className="command-cursor mt-6 max-w-2xl text-base leading-relaxed text-ink sm:text-xl">
                      Ask for gifts, cakes, flowers, and party essentials.
                    </p>

                    <div
                      data-ui="command-pill"
                      className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-surface-2/90 px-4 py-3 text-left text-sm text-ink-soft shadow-[0_18px_45px_rgba(37,36,31,0.04)] backdrop-blur-sm"
                    >
                      <span className="text-muted">&gt;_</span>
                      <span className="min-w-0 truncate">Find a birthday gift under Rs. 10,000</span>
                    </div>

                    <div
                      data-ui="suggestion-wrap"
                      className="mt-10 flex w-full max-w-4xl flex-wrap justify-center gap-3 px-2"
                    >
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
                <div className="mx-auto w-full max-w-3xl space-y-5 pb-8">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
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
                placeholder="Search products, ask for recommendations..."
                disabled={isStreaming}
                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(37,36,31,0.08)] disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
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
