"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, Wallet } from "lucide-react";
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
  checkoutLabel?: string;
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
  checkoutLabel = "Proceed to checkout",
}: CartProps) {
  const hasBudget = cart.budget_max != null && Number.isFinite(cart.budget_max);
  const budgetOver = hasBudget && total > (cart.budget_max as number) ? total - (cart.budget_max as number) : 0;
  const [showBudget, setShowBudget] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <div className="rounded-[1.2rem] border border-border bg-surface p-4">
          <button
            type="button"
            onClick={() => setShowBudget((current) => !current)}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Optional budget</p>
              <p className="mt-1 text-sm text-ink-soft">Set a budget and keep shopping without losing flexibility.</p>
            </div>
            {hasBudget ? (
              <span className="rounded-full border border-[rgba(101,139,82,0.24)] bg-[rgba(101,139,82,0.12)] px-3 py-1 text-xs font-medium text-success">
                Saved budget: Rs. {(cart.budget_max as number).toLocaleString()}
              </span>
            ) : (
              <div className="rounded-[0.95rem] border border-dashed border-border bg-surface-2 px-3 py-2 text-right text-xs text-ink-soft">
                <p className="font-medium text-ink">No budget set</p>
                <p className="mt-1">{showBudget ? "Hide" : "Show"}</p>
              </div>
            )}
          </button>

          {showBudget ? (
            <form onSubmit={onBudgetSubmit} className="mt-4 space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[11rem] space-y-1">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Budget amount</span>
                  <input
                    value={budgetDraft}
                    onChange={(e) => onBudgetDraftChange(e.target.value)}
                    inputMode="numeric"
                    placeholder="Rs. 5,000"
                    className="h-11 w-full rounded-[1rem] border border-border bg-surface-2 px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
                  />
                </label>
                <button
                  type="submit"
                  disabled={budgetSaving}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wallet size={15} />
                  {budgetSaving ? "Saving..." : "Save budget"}
                </button>
                {hasBudget ? (
                  <button
                    type="button"
                    onClick={onBudgetClear}
                    disabled={budgetSaving}
                    className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink-soft hover:border-border-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">Cart total: Rs. {total.toLocaleString()}</span>
                {hasBudget ? (
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">Budget: Rs. {(cart.budget_max as number).toLocaleString()}</span>
                ) : (
                  <span className="rounded-full border border-dashed border-border bg-surface-2 px-2.5 py-1">Budget is optional</span>
                )}
              </div>

              {budgetOver ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  Budget warning: selected items are over by Rs. {budgetOver.toLocaleString()}. You can still continue.
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      {cart.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center text-ink-soft">
          <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-accent">
            <ShoppingBag size={24} />
          </div>
          <p className="text-sm font-medium text-ink">Your cart is empty</p>
          <p className="mt-1 text-xs text-muted">Add items from chat or product pages</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {cart.items.map((item) => (
            <div
              key={item.product_id}
              className="animate-fade-in group flex gap-3 rounded-[1.1rem] border border-border bg-surface p-3 transition hover:border-border-hover hover:shadow-[0_14px_28px_rgba(15,15,15,0.035)]"
            >
              {item.image_url ? (
                <Image
                  src={`/api/image-proxy?url=${encodeURIComponent(item.image_url)}`}
                  alt={item.name}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] flex-shrink-0 rounded-[1rem] object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-[1rem] bg-surface-3 text-sm font-semibold text-muted">
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
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 text-sm text-ink-soft hover:border-accent hover:text-accent"
                    aria-label={`Decrease ${item.name} quantity`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-5 text-center text-xs font-medium text-ink">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 text-sm text-ink-soft hover:border-accent hover:text-accent"
                    aria-label={`Increase ${item.name} quantity`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between">
                <p className="text-sm font-semibold text-ink">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                <button
                  type="button"
                  onClick={() => onRemove(item.product_id)}
                  className="text-xs text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto border-t border-border px-4 py-4">
        <div className="space-y-3 rounded-[1.2rem] border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="text-lg font-semibold text-ink">Rs. {total.toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
            <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">
              {cart.items.length} {cart.items.length === 1 ? "item" : "items"}
            </span>
            {cart.recipient?.name ? <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">For {cart.recipient.name}</span> : null}
            {cart.delivery?.city ? <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">{cart.delivery.city}</span> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          className="mt-3 h-11 w-full rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover active:scale-[0.99]"
        >
          {checkoutLabel}
        </button>
      </div>
    </div>
  );
}
