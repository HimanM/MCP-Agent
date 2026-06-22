"use client";

import { Bot, Play, Sparkles, Square, Truck } from "lucide-react";
import PayLinkCard from "@/components/PayLinkCard";
import ProductCard from "@/components/ProductCard";
import TrackingCard from "@/components/TrackingCard";
import { Message } from "@/hooks/useChat";
import type { OrderSummary, ProductSummary, TrackingSummary } from "@/lib/api";
import { playAssistantSpeech, stopSpeaking } from "@/lib/speech";

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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[rgba(244,223,208,0.65)] px-3 py-1.5 text-xs font-medium text-accent">
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
  if (!products.length) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">Products found</p>
        <span className="text-xs text-muted">Tap a card to open the product page</span>
      </div>
      <div className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.product_id || product.product_url || product.name}
            product={product}
            sessionId={sessionId}
            onAdded={onAdded}
          />
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
  const productResults = message.content
    ? uniqueProducts.filter((product) => isProductReferenced(product, message.content)).slice(0, 6)
    : [];
  const hasProducts = !isUser && productResults.length > 0;
  const trackingResult =
    message.toolResults?.map((entry) => entry.tracking).find((entry): entry is TrackingSummary => Boolean(entry)) || null;
  const orderResult =
    message.toolResults?.map((entry) => entry.order).find((entry): entry is OrderSummary => Boolean(entry)) || null;
  const canPlayVoice = !isUser && Boolean(message.content?.trim());
  const showLoadingDots = !isUser && isStreaming;
  const bubbleClass = hasProducts ? "w-full max-w-none" : isUser ? "max-w-[min(92%,48rem)]" : "max-w-[min(96%,64rem)]";

  return (
    <div className="animate-fade-in w-full">
      {isUser ? (
        <div className="flex w-full justify-end">
          <div
            className={`${bubbleClass} rounded-[1.6rem] rounded-br-md bg-[linear-gradient(180deg,#f3dfcf,#efcfb5)] px-4 py-3 text-sm leading-relaxed text-ink shadow-[0_10px_30px_rgba(37,36,31,0.04)]`}
          >
            {message.content ? <MessageBody content={message.content} hasProducts={false} /> : null}
          </div>
        </div>
      ) : (
        <div className="flex w-full items-start gap-3">
          <div className="hidden pt-1 sm:block">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(180deg,#fff3ea,#f2dccb)] text-accent">
              <Bot size={16} />
            </div>
          </div>

          <div
            className={`${bubbleClass} rounded-[1.6rem] rounded-tl-md border border-border bg-white px-4 py-3 text-sm leading-relaxed text-ink shadow-[0_10px_30px_rgba(37,36,31,0.04)]`}
          >
            {message.toolCalls && message.toolCalls.length > 0 ? (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ToolBadge tool={message.toolCalls[message.toolCalls.length - 1].tool} args={message.toolCalls[message.toolCalls.length - 1].args} />
                {message.toolCalls.length > 1 ? <span className="text-xs text-ink-soft">{message.toolCalls.length} steps</span> : null}
              </div>
            ) : null}

            {message.content ? <MessageBody content={message.content} hasProducts={hasProducts} /> : null}
            {showLoadingDots ? (
              <div className="mt-3 flex items-center gap-1.5">
                <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
                <div className="typing-dot h-2 w-2 rounded-full bg-muted" />
              </div>
            ) : null}
            {canPlayVoice ? (
              <div className="mt-3 flex justify-end">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void playAssistantSpeech(message.content, language, ttsApiEnabled)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-bg px-3 text-xs font-medium text-ink-soft hover:border-border-hover hover:text-ink"
                  >
                    <Play size={13} />
                    Play
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-bg px-3 text-xs font-medium text-ink-soft hover:border-border-hover hover:text-ink"
                  >
                    <Square size={13} />
                    Stop
                  </button>
                </div>
              </div>
            ) : null}
            {hasProducts ? <ToolProducts products={productResults} sessionId={sessionId} onAdded={onAdded} /> : null}
            {!hasProducts && trackingResult ? <ToolTracking tracking={trackingResult} /> : null}
            {!hasProducts && !trackingResult && orderResult ? <ToolOrder order={orderResult} /> : null}

            {!message.content && message.toolCalls && message.toolCalls.length > 0 && !productResults.length ? (
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
