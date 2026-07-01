"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Play, Sparkles, Square, Truck } from "lucide-react";
import PayLinkCard from "@/components/PayLinkCard";
import ProductCard from "@/components/ProductCard";
import TrackingCard from "@/components/TrackingCard";
import { Message } from "@/hooks/useChat";
import type { OrderSummary, ProductSummary, TrackingSummary } from "@/lib/api";
import { playAssistantSpeech, stopSpeaking, subscribeSpeechState } from "@/lib/speech";

function ToolBadge({ tool, args }: { tool: string; args: Record<string, unknown> }) {
  const labels: Record<string, string> = {
    search_products: `Searching: ${args.q || "products"}`,
    get_product: "Loading product",
    add_to_cart: "Added to cart",
    remove_from_cart: "Removed from cart",
    get_cart: "Viewing cart",
    update_checkout_info: `Saving ${args.field || "details"}`,
    checkout: "Placing order",
    list_categories: "Browsing categories",
    check_delivery: "Checking delivery",
    track_order: `Tracking #${args.order_number || "order"}`,
  };

  const icon = tool === "track_order" ? <Truck size={13} /> : <Sparkles size={13} />;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-accent">
      {icon}
      {labels[tool] || tool}
    </span>
  );
}

function ToolProducts({
  products,
  sessionId,
  onAdded,
}: {
  products: ProductSummary[];
  sessionId: string;
  onAdded?: () => void | Promise<void>;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  if (!products.length) return null;

  const scrollRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction === "right" ? rail.clientWidth * 0.85 : -rail.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">Products found</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted md:text-[11px]">Swipe or use arrows</span>
          {products.length > 4 ? (
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => scrollRail("left")}
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-bg text-ink-soft hover:text-ink"
                aria-label="Scroll products left"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => scrollRail("right")}
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-bg text-ink-soft hover:text-ink"
                aria-label="Scroll products right"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3"
      >
        {products.map((product) => (
          <div
            key={product.product_id || product.product_url || product.name}
            className="w-[10.5rem] shrink-0 snap-start sm:w-[10rem] md:w-[11.5rem] xl:w-auto xl:basis-[calc((100%-2.25rem)/4)]"
          >
            <ProductCard product={product} sessionId={sessionId} onAdded={onAdded} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolTracking({ tracking }: { tracking: TrackingSummary | null }) {
  if (!tracking) return null;
  return <TrackingCard tracking={tracking} />;
}

function ToolOrder({ order }: { order: OrderSummary | null }) {
  if (!order) return null;
  return <PayLinkCard order={order} />;
}

function normalizeLine(line: string, hasProducts: boolean): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (
    hasProducts &&
    (
      /^!\[[^\]]*\]\([^\)]+\)$/.test(trimmed) ||
      /^\[[^\]]+\]\([^\)]+\)$/.test(trimmed) ||
      /^\d+\./.test(trimmed) ||
      /^[-*]\s+/.test(trimmed) ||
      /(?:\b(?:price|buy here|view product)\b|LKR|Rs\.?)/i.test(trimmed)
    )
  ) {
    return null;
  }

  let text = trimmed
    .replace(/^#{1,6}\s+/, "")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");

  const orderMatch = trimmed.match(/^(\d+\.)\s+/);
  if (orderMatch) {
    text = `${orderMatch[1]} ${text.replace(/^\d+\.\s+/, "")}`;
  } else {
    text = text.replace(/^[-*]\s+/, "");
  }

  text = text.replace(/\s+/g, " ").trim();
  return text || null;
}

function MessageBody({ content, hasProducts }: { content: string; hasProducts: boolean }) {
  const blocks: string[] = [];
  for (const rawLine of content.split(/\n+/)) {
    const normalized = normalizeLine(rawLine, hasProducts);
    if (normalized) blocks.push(normalized);
  }

  if (!blocks.length) return null;

  return (
    <div className="space-y-2">
      {blocks.map((line, index) => (
        <p key={`${index}-${line}`} className="whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
}

function normalizedText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isProductReferenced(product: ProductSummary, content: string) {
  const normalizedContent = normalizedText(content);
  const productId = normalizedText(product.product_id || "");
  const name = normalizedText(product.name || "");

  return Boolean((productId && normalizedContent.includes(productId)) || (name && normalizedContent.includes(name)));
}

export default function ChatMessage({
  message,
  sessionId,
  onAdded,
  language = "en",
  ttsApiEnabled = false,
  isStreaming = false,
}: {
  message: Message;
  sessionId: string;
  onAdded?: () => void | Promise<void>;
  language?: string;
  ttsApiEnabled?: boolean;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const rawProducts: ProductSummary[] =
    message.toolResults?.flatMap((entry) => entry.products || (entry.product ? [entry.product] : [])) || [];
  const uniqueProducts = rawProducts.filter((product, index, array) => {
    const key = product.product_id || product.product_url || product.name;
    return array.findIndex((item) => (item.product_id || item.product_url || item.name) === key) === index;
  });
  const referencedProducts = message.content
    ? uniqueProducts.filter((product) => isProductReferenced(product, message.content))
    : [];
  const productResults = (referencedProducts.length ? referencedProducts : uniqueProducts).slice(0, 10);
  const hasProducts = !isUser && productResults.length > 0;
  const trackingResult =
    message.toolResults?.map((entry) => entry.tracking).find((entry): entry is TrackingSummary => Boolean(entry)) || null;
  const orderResult =
    message.toolResults?.map((entry) => entry.order).find((entry): entry is OrderSummary => Boolean(entry)) || null;
  const canPlayVoice = !isUser && Boolean(message.content?.trim());
  const showLoadingDots = !isUser && isStreaming && !message.content;
  const userClass = "ml-auto max-w-[min(78%,38rem)]";
  const assistantClass = hasProducts ? "w-full max-w-none" : "max-w-[min(100%,70rem)]";
  const speechKey = useMemo(() => `${message.id}:${message.content}`, [message.id, message.content]);
  const speechSummary = useMemo(() => buildSpeechSummary(message.content || "", productResults), [message.content, productResults]);
  const [activeSpeechKey, setActiveSpeechKey] = useState<string | null>(null);
  const isSpeaking = activeSpeechKey === speechKey;

  useEffect(() => subscribeSpeechState(setActiveSpeechKey), []);

  return (
    <div className="animate-fade-in w-full">
      {isUser ? (
        <div className="flex w-full justify-end">
          <div
            className={`${userClass} rounded-[1.25rem] rounded-br-md border border-border bg-accent-soft px-4 py-2.5 text-sm leading-relaxed text-ink`}
          >
            {message.content ? <MessageBody content={message.content} hasProducts={false} /> : null}
          </div>
        </div>
      ) : (
        <div className="flex w-full items-start gap-3">
          <div className="hidden pt-1 sm:block">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-accent">
              <Bot size={16} />
            </div>
          </div>

          <div className={`${assistantClass} min-w-0 text-sm leading-relaxed text-ink`}>
            {message.toolCalls && message.toolCalls.length > 0 ? (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ToolBadge tool={message.toolCalls[message.toolCalls.length - 1].tool} args={message.toolCalls[message.toolCalls.length - 1].args} />
                {message.toolCalls.length > 1 ? <span className="text-xs text-ink-soft">{message.toolCalls.length} steps</span> : null}
              </div>
            ) : null}

            {message.content ? <MessageBody content={message.content} hasProducts={hasProducts} /> : null}
            {showLoadingDots ? (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted">
                <span className="thinking-text">Thinking</span>
                <span className="flex items-center gap-1.5">
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
                </span>
              </div>
            ) : null}
            {canPlayVoice ? (
              <div className="mt-3 flex justify-end">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeaking) {
                        stopSpeaking();
                        return;
                      }
                      void playAssistantSpeech(speechSummary || message.content, language, ttsApiEnabled, speechKey);
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium ${
                      isSpeaking
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface-2 text-ink-soft hover:border-border-hover hover:text-ink"
                    }`}
                  >
                    {isSpeaking ? <Square size={13} /> : <Play size={13} />}
                    {isSpeaking ? "Stop" : "Play"}
                  </button>
                </div>
              </div>
            ) : null}
            {hasProducts ? <ToolProducts products={productResults} sessionId={sessionId} onAdded={onAdded} /> : null}
            {!hasProducts && trackingResult ? <ToolTracking tracking={trackingResult} /> : null}
            {!hasProducts && !trackingResult && orderResult ? <ToolOrder order={orderResult} /> : null}

            {!message.content && message.toolCalls && message.toolCalls.length > 0 && !productResults.length && !showLoadingDots ? (
              <div className="flex items-center gap-1.5 py-1">
                <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function buildSpeechSummary(content: string, products: ProductSummary[]) {
  const summary = content
    .split(/Products found/i)[0]
    .split(/\n+/)
    .map((line) => normalizeLine(line, false))
    .filter(Boolean)
    .filter((line) => !/filenotfound|view product|sku-|product_id|added_by|image_url|https?:\/\//i.test(line!))
    .join(" ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  const topProducts = products.slice(0, 3).map((product) => product.name).filter(Boolean);
  return [summary, topProducts.length ? `Top picks include ${topProducts.join(", ")}.` : ""]
    .filter(Boolean)
    .join(" ")
    .slice(0, 420)
    .trim();
}
