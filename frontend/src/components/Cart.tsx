"use client";

import { CartItem } from "@/lib/api";

interface CartProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

function CartLineIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mb-3 text-muted"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.64 16h9.72a2 2 0 0 0 1.96-1.61L23 6H6" />
    </svg>
  );
}

export default function Cart({ items, total, onUpdateQuantity, onRemove }: CartProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-ink-soft">
        <CartLineIcon />
        <p className="text-sm font-medium text-ink">Your cart is empty</p>
        <p className="mt-1 text-xs text-muted">Add items from the chat</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {items.map((item) => (
          <div
            key={item.product_id}
            className="animate-fade-in group flex gap-3 rounded-xl border border-border bg-surface-2 p-3 transition hover:border-border-hover"
          >
            {item.image_url ? (
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(item.image_url)}`}
                alt={item.name}
                className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-surface-3 text-sm font-semibold text-muted">
                {item.name.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{item.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-xiaomi">Rs. {item.price.toLocaleString()}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    item.quantity <= 1
                      ? onRemove(item.product_id)
                      : onUpdateQuantity(item.product_id, item.quantity - 1)
                  }
                  className="grid h-7 w-7 place-items-center rounded-full border border-border bg-bg text-sm text-ink-soft transition hover:border-ink hover:text-ink"
                  aria-label={`Decrease ${item.name} quantity`}
                >
                  -
                </button>
                <span className="w-5 text-center text-xs font-medium text-ink">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  className="grid h-7 w-7 place-items-center rounded-full border border-border bg-bg text-sm text-ink-soft transition hover:border-ink hover:text-ink"
                  aria-label={`Increase ${item.name} quantity`}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end justify-between">
              <p className="text-sm font-semibold text-ink">Rs. {(item.price * item.quantity).toLocaleString()}</p>
              <button
                type="button"
                onClick={() => onRemove(item.product_id)}
                className="text-xs text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-ink-soft">Total</span>
          <span className="text-lg font-semibold text-ink">Rs. {total.toLocaleString()}</span>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("start-checkout"))}
          className="w-full rounded-xl bg-accent py-3 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.99]"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
