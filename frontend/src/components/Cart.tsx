"use client";

import { FormEvent, type RefObject } from "react";
import { CartState } from "@/lib/api";

interface CartProps {
  cart: CartState;
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  budgetDraft: string;
  budgetSaving: boolean;
  onBudgetDraftChange: (value: string) => void;
  onBudgetSubmit: (event: FormEvent) => void;
  onBudgetClear: () => Promise<void> | void;
  budgetInputRef: RefObject<HTMLInputElement | null>;
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

export default function Cart({
  cart,
  total,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  budgetDraft,
  budgetSaving,
  onBudgetDraftChange,
  onBudgetSubmit,
  onBudgetClear,
  budgetInputRef,
}: CartProps) {
  const hasBudget = cart.budget_max != null && Number.isFinite(cart.budget_max);
  const budgetOver = hasBudget && total > (cart.budget_max as number) ? total - (cart.budget_max as number) : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <form onSubmit={onBudgetSubmit} className="space-y-3 rounded-2xl border border-border bg-surface-2 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Optional budget</p>
              <p className="mt-1 text-sm text-ink-soft">Set a budget anytime. The assistant can still continue if you go over.</p>
            </div>
            {hasBudget ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                Saved budget: Rs. {(cart.budget_max as number).toLocaleString()}
              </span>
            ) : (
              <span className="rounded-full border border-dashed border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink-soft">
                No budget set
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[11rem] space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Budget amount</span>
              <input
                ref={budgetInputRef}
                value={budgetDraft}
                onChange={(e) => onBudgetDraftChange(e.target.value)}
                onInput={(e) => onBudgetDraftChange(e.currentTarget.value)}
                onKeyUp={(e) => onBudgetDraftChange(e.currentTarget.value)}
                inputMode="numeric"
                placeholder="Rs. 5,000"
                className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface"
              />
            </label>
            <button
              type="submit"
              disabled={budgetSaving}
              className="h-11 rounded-xl bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {budgetSaving ? "Saving..." : "Save budget"}
            </button>
            {hasBudget ? (
              <button
                type="button"
                onClick={onBudgetClear}
                disabled={budgetSaving}
                className="h-11 rounded-xl border border-border bg-bg px-4 text-sm font-medium text-ink-soft transition hover:border-border-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
            <span className="rounded-full border border-border bg-bg px-2.5 py-1">Cart total: Rs. {total.toLocaleString()}</span>
            {hasBudget ? (
              <span className="rounded-full border border-border bg-bg px-2.5 py-1">Budget: Rs. {(cart.budget_max as number).toLocaleString()}</span>
            ) : (
              <span className="rounded-full border border-dashed border-border bg-bg px-2.5 py-1">Budget is optional</span>
            )}
          </div>

          {budgetOver ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Budget warning: selected items are over by Rs. {budgetOver.toLocaleString()}. You can still continue.
            </div>
          ) : null}
        </form>
      </div>

      {cart.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-ink-soft">
          <CartLineIcon />
          <p className="text-sm font-medium text-ink">Your cart is empty</p>
          <p className="mt-1 text-xs text-muted">Add items from chat or product pages</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {cart.items.map((item) => (
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
      )}

      <div className="border-t border-border p-4">
        <div className="mb-3 space-y-3 rounded-2xl border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="text-lg font-semibold text-ink">Rs. {total.toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
            <span className="rounded-full border border-border bg-bg px-2.5 py-1">
              {cart.items.length} {cart.items.length === 1 ? "item" : "items"}
            </span>
            {cart.recipient?.name ? <span className="rounded-full border border-border bg-bg px-2.5 py-1">For {cart.recipient.name}</span> : null}
            {cart.delivery?.city ? <span className="rounded-full border border-border bg-bg px-2.5 py-1">{cart.delivery.city}</span> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          className="w-full rounded-xl bg-accent py-3 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.99]"
        >
          Enter checkout details
        </button>
      </div>
    </div>
  );
}
