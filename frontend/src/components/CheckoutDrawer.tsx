"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Gift, MapPinHouse, UserRound, X } from "lucide-react";
import type { CartState, CheckoutInfoPayload } from "@/lib/api";

interface CheckoutDrawerProps {
  open: boolean;
  cart: CartState;
  total: number;
  onClose: () => void;
  onSubmit: (payload: CheckoutInfoPayload) => Promise<void> | void;
  isSaving?: boolean;
  error?: string | null;
}

type CheckoutFormState = CheckoutInfoPayload;

function createCheckoutForm(cart: CartState): CheckoutFormState {
  return {
    recipient: {
      name: cart.recipient?.name || "",
      phone: cart.recipient?.phone || "",
    },
    delivery: {
      address: cart.delivery?.address || "",
      city: cart.delivery?.city || "",
      date: cart.delivery?.date || "",
    },
    sender: {
      name: cart.sender?.name || "",
    },
    gift_message: cart.gift_message || "",
  };
}

function DrawerSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-[1.1rem] border border-border bg-surface p-4 shadow-[0_10px_30px_rgba(15,15,15,0.03)]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{children}</label>;
}

export default function CheckoutDrawer({
  open,
  cart,
  total,
  onClose,
  onSubmit,
  isSaving = false,
  error,
}: CheckoutDrawerProps) {
  const [form, setForm] = useState<CheckoutFormState>(() => createCheckoutForm(cart));

  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  const setRecipient = (key: keyof CheckoutFormState["recipient"], value: string) => {
    setForm((current) => ({
      ...current,
      recipient: { ...current.recipient, [key]: value },
    }));
  };

  const setDelivery = (key: keyof CheckoutFormState["delivery"], value: string) => {
    setForm((current) => ({
      ...current,
      delivery: { ...current.delivery, [key]: value },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <form
      className={`fixed inset-y-0 right-0 z-[60] flex w-full max-w-xl flex-col border-l border-border bg-bg shadow-[0_24px_80px_rgba(15,15,15,0.18)] transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout details"
      onSubmit={handleSubmit}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">Checkout details</h2>
          <p className="mt-0.5 text-xs text-ink-soft">Fill in delivery and sender information once, then save to cart.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink-soft transition hover:border-border-hover hover:bg-surface-2 hover:text-ink"
          aria-label="Close checkout drawer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          <div className="rounded-[1.2rem] border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Order summary</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">Saved details will be attached to this cart session.</p>
              </div>
              <div className="rounded-[1rem] bg-surface-2 px-3 py-2 text-right shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Total</p>
                <p className="text-lg font-semibold text-ink">Rs. {total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>
          ) : null}

          <DrawerSection title="Recipient" description="Who should receive the order?" icon={<UserRound size={18} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-1">
                <FieldLabel>Name</FieldLabel>
                <input
                  value={form.recipient.name}
                  onChange={(e) => setRecipient("name", e.target.value)}
                  className="h-11 w-full rounded-[1rem] border border-border bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
                  placeholder="Recipient name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <FieldLabel>Phone</FieldLabel>
                <input
                  value={form.recipient.phone}
                  onChange={(e) => setRecipient("phone", e.target.value)}
                  className="h-11 w-full rounded-[1rem] border border-border bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
                  placeholder="07x xxx xxxx"
                  autoComplete="tel"
                />
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title="Delivery" description="Use the exact delivery address and preferred city/date." icon={<MapPinHouse size={18} />}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <FieldLabel>Address</FieldLabel>
                <textarea
                  value={form.delivery.address}
                  onChange={(e) => setDelivery("address", e.target.value)}
                  className="min-h-24 w-full rounded-[1rem] border border-border bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
                  placeholder="House, street, landmark, apartment, etc."
                  rows={4}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel>City</FieldLabel>
                  <input
                    value={form.delivery.city}
                    onChange={(e) => setDelivery("city", e.target.value)}
                    className="h-11 w-full rounded-[1rem] border border-border bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
                    placeholder="Colombo"
                    autoComplete="address-level2"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Delivery date</FieldLabel>
                  <input
                    type="date"
                    value={form.delivery.date}
                    onChange={(e) => setDelivery("date", e.target.value)}
                    className="h-11 w-full rounded-[1rem] border border-border bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title="Sender" description="This name appears as the sender on the order." icon={<UserRound size={18} />}>
            <div className="space-y-1.5">
              <FieldLabel>Your name</FieldLabel>
              <input
                value={form.sender.name}
                onChange={(e) => setForm((current) => ({ ...current, sender: { name: e.target.value } }))}
                className="h-11 w-full rounded-[1rem] border border-border bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          </DrawerSection>

          <DrawerSection title="Gift message" description="Optional note to print with the gift." icon={<Gift size={18} />}>
            <textarea
              value={form.gift_message}
              onChange={(e) => setForm((current) => ({ ...current, gift_message: e.target.value }))}
              className="min-h-28 w-full rounded-[1rem] border border-border bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink focus:bg-surface focus:shadow-[0_0_0_3px_rgba(15,15,15,0.08)]"
              placeholder="Write a warm note..."
              rows={5}
            />
          </DrawerSection>
        </div>
      </div>

      <div className="border-t border-border bg-bg px-5 py-4">
        <div className="flex items-center justify-between gap-3 pb-3 text-sm">
          <span className="text-ink-soft">Will be saved to this cart session</span>
          <span className="font-semibold text-ink">Rs. {total.toLocaleString()}</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink transition hover:border-border-hover hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-11 flex-1 rounded-full bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save details"}
          </button>
        </div>
      </div>
    </form>
  );
}
