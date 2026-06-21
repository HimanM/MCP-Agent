"use client";

import ProductCard from "@/components/ProductCard";
import { Message } from "@/hooks/useChat";
import type { ProductSummary } from "@/lib/api";

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
  };

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-ink-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-xiaomi animate-pulse" />
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
      <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

function normalizeLine(line: string, hasProducts: boolean): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (
    hasProducts &&
    (
      /^!\[[^\]]*\]\([^\)]+\)$/.test(trimmed) ||
      /^\[[^\]]+\]\([^\)]+\)$/.test(trimmed) ||
      /^\d+\./.test(trimmed) ||
      /^[-•*]\s+/.test(trimmed) ||
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
    text = text.replace(/^[-•*]\s+/, "");
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

  return Boolean(
    (productId && normalizedContent.includes(productId)) ||
      (name && normalizedContent.includes(name))
  );
}

export default function ChatMessage({
  message,
  sessionId,
  onAdded,
}: {
  message: Message;
  sessionId: string;
  onAdded?: () => void | Promise<void>;
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

  return (
    <div className={`animate-fade-in flex ${isUser ? "justify-end" : "justify-start"} ${hasProducts ? "w-full" : ""}`}>
      <div
        className={`${hasProducts ? "w-full max-w-none" : "max-w-[92%]"} rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_rgba(37,36,31,0.04)] ${
          isUser
            ? "rounded-br-md bg-accent text-white"
            : "rounded-bl-md border border-border bg-surface text-ink"
        }`}
      >
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ToolBadge
              tool={message.toolCalls[message.toolCalls.length - 1].tool}
              args={message.toolCalls[message.toolCalls.length - 1].args}
            />
            {message.toolCalls.length > 1 && (
              <span className="text-xs text-ink-soft">{message.toolCalls.length} steps</span>
            )}
          </div>
        )}

        {message.content ? <MessageBody content={message.content} hasProducts={hasProducts} /> : null}

        {hasProducts && (
          <ToolProducts products={productResults} sessionId={sessionId} onAdded={onAdded} />
        )}

        {!message.content && message.toolCalls && message.toolCalls.length > 0 && !productResults.length ? (
          <div className="flex items-center gap-1.5 py-1">
            <div className={`typing-dot h-2 w-2 rounded-full ${isUser ? "bg-white" : "bg-muted"}`} />
            <div className={`typing-dot h-2 w-2 rounded-full ${isUser ? "bg-white" : "bg-muted"}`} />
            <div className={`typing-dot h-2 w-2 rounded-full ${isUser ? "bg-white" : "bg-muted"}`} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
