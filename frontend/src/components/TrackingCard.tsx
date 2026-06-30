"use client";

import { MapPin, PackageCheck } from "lucide-react";
import type { TrackingSummary } from "@/lib/api";
import { getTrackingHeadline, getTrackingSupportGuidance } from "@/lib/tracking";

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("deliver")) return "bg-surface-2 text-accent border-border";
  if (normalized.includes("ship") || normalized.includes("transit")) return "bg-surface-2 text-ink border-border";
  if (normalized.includes("process") || normalized.includes("pending")) return "bg-surface-2 text-ink border-border";
  if (normalized.includes("cancel")) return "bg-surface-2 text-danger border-border";
  return "bg-surface-2 text-ink-soft border-border";
}

export default function TrackingCard({ tracking }: { tracking: TrackingSummary }) {
  const hasEvents = tracking.events.length > 0;
  const hasItems = tracking.items.length > 0;
  const hasTotal = typeof tracking.total === "number" && Number.isFinite(tracking.total);
  const headline = getTrackingHeadline(tracking);
  const support = getTrackingSupportGuidance(tracking);

  if (!tracking.order_number && !tracking.status && !hasEvents) return null;

  return (
    <section className="mt-4 overflow-hidden md:rounded-[1.25rem] md:border md:border-border md:bg-surface md:shadow-[0_16px_48px_rgba(15,15,15,0.04)]">
      <div className="flex items-start justify-between gap-4 px-1 py-3 md:border-b md:border-border md:bg-surface md:px-4 md:py-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent">
            <PackageCheck size={18} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Order tracking</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              {tracking.order_number ? `#${tracking.order_number}` : "Latest order update"}
            </h3>
            {tracking.recipient ? <p className="mt-1 text-sm text-ink-soft">Recipient: {tracking.recipient}</p> : null}
          </div>
        </div>
        {tracking.status ? (
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusTone(tracking.status)}`}>
            {tracking.status}
          </span>
        ) : null}
      </div>

      <div className="space-y-4 px-1 py-3 md:px-4 md:py-4">
        <div className="rounded-[1rem] border border-border bg-surface-2 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">What this means</p>
          <p className="mt-2 text-sm leading-6 text-ink">{headline.summary}</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{headline.nextStep}</p>
        </div>

        <div className="rounded-[1rem] border border-border bg-surface px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Next likely step</p>
          <p className="mt-2 text-sm leading-6 text-ink">{support.expectation}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted">Need help?</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{support.support}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted">Order edits</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{support.editNote}</p>
        </div>

        {(tracking.estimated_delivery || tracking.location || hasTotal) ? (
          <div className={`grid gap-3 ${hasTotal ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {tracking.estimated_delivery ? (
              <div className="rounded-[1rem] border border-border bg-surface-2 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Estimated delivery</p>
                <p className="mt-1 text-sm font-medium text-ink">{tracking.estimated_delivery}</p>
              </div>
            ) : null}
            {tracking.location ? (
              <div className="rounded-[1rem] border border-border bg-surface-2 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Current location</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-ink">
                  <MapPin size={13} className="text-accent" />
                  {tracking.location}
                </p>
              </div>
            ) : null}
            {hasTotal ? (
              <div className="rounded-[1rem] border border-border bg-surface-2 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Order total</p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {(tracking.currency || "LKR")} {tracking.total?.toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasItems ? (
          <div className="rounded-[1rem] border border-border bg-surface-2 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Items</p>
            <ul className="mt-4 space-y-3">
              {tracking.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 text-ink">{item.name}</span>
                  {item.quantity ? <span className="shrink-0 text-ink-soft">x{item.quantity}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasEvents ? (
          <div className="rounded-[1rem] border border-border bg-surface-2 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Timeline</p>
            <ol className="mt-4 space-y-4">
              {tracking.events.map((event, index) => (
                <li key={`${event.label}-${index}`} className="relative pl-7">
                  <span
                    className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${
                      index === tracking.events.length - 1 ? "bg-accent" : "bg-border-hover"
                    }`}
                  />
                  <p className="text-sm font-medium text-ink">{event.label}</p>
                  {(event.time || event.location) ? (
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      {[event.time, event.location].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-dashed border-border bg-surface-2 px-4 py-4 text-sm text-ink-soft">
            No event timeline was returned for this order yet.
          </div>
        )}
      </div>
    </section>
  );
}
