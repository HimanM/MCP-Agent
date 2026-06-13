"use client";

import { Message } from "@/hooks/useChat";

function ToolBadge({ tool, args }: { tool: string; args: Record<string, unknown> }) {
  const labels: Record<string, string> = {
    search_products: `Searching: ${args.q || ""}`,
    add_to_cart: "Added to cart",
    remove_from_cart: "Removed from cart",
    get_cart: "Viewing cart",
    update_checkout_info: `Saving ${args.field || ""}`,
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

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`animate-fade-in flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_rgba(37,36,31,0.04)] ${
          isUser
            ? "rounded-br-md bg-accent text-white"
            : "rounded-bl-md border border-border bg-surface text-ink"
        }`}
      >
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <ToolBadge key={i} tool={tc.tool} args={tc.args} />
            ))}
          </div>
        )}

        {message.content ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : message.toolCalls && message.toolCalls.length > 0 ? (
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
