"use client";

import type { OrderSummary } from "@/lib/api";

function formatTotal(total?: number | null, currency = "LKR") {
  if (total == null) return null;
  return `${currency} ${total.toLocaleString("en-LK")}`;
}

export default function PayLinkCard({ order }: { order: OrderSummary }) {
  if (!order.payment_url && !order.order_number) return null;

  const total = formatTotal(order.total, order.currency);

  return (
    <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-accent/20 bg-surface shadow-[0_16px_48px_rgba(37,36,31,0.06)]">
      <div className="border-b border-accent/15 bg-accent/8 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Order ready</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {order.order_number ? `#${order.order_number}` : "Payment link created"}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">Prices are typically held for 60 minutes. Complete payment before the link expires.</p>
      </div>

      <div className="space-y-4 px-4 py-4">
        {total ? (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-bg px-4 py-3">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="text-sm font-semibold text-ink">{total}</span>
          </div>
        ) : null}

        {order.payment_url ? (
          <a
            href={order.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Complete Payment
          </a>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-ink-soft">
            Payment link not included in the response. Please check the latest assistant message for next steps.
          </div>
        )}
      </div>
    </section>
  );
}
