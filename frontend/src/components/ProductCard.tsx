"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addToCart, type ProductSummary } from "@/lib/api";

interface ProductCardProps {
  product: ProductSummary;
  sessionId: string;
  onAdded?: () => void | Promise<void>;
}

function PlaceholderIcon({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-4xl font-semibold text-muted">
      {label}
    </div>
  );
}

export default function ProductCard({ product, sessionId, onAdded }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const imgSrc = useMemo(() => {
    if (!product.image_url) return null;
    return product.image_url.startsWith("http")
      ? `/api/image-proxy?url=${encodeURIComponent(product.image_url)}`
      : product.image_url;
  }, [product.image_url]);

  const productUrl = product.product_url || "#";
  const canOpen = productUrl !== "#";

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await addToCart(sessionId, product.product_id, quantity);
      setShowConfirm(true);
      await onAdded?.();
      window.setTimeout(() => setShowConfirm(false), 1800);
    } catch {
      // keep the UI responsive; cart sync will reconcile if needed.
    } finally {
      setIsAdding(false);
    }
  };

  const step = (delta: number) => setQuantity((current) => Math.max(1, current + delta));

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_14px_40px_rgba(37,36,31,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-border-hover">
      {canOpen ? (
        <Link href={productUrl} target="_blank" rel="noreferrer" className="block" aria-label={`Open ${product.name}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <PlaceholderIcon label={product.name.charAt(0)} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          </div>
        </Link>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <PlaceholderIcon label={product.name.charAt(0)} />
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          {canOpen ? (
            <Link href={productUrl} target="_blank" rel="noreferrer" className="block">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink transition group-hover:text-accent">
                {product.name}
              </h3>
            </Link>
          ) : (
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">{product.name}</h3>
          )}
          <p className="mt-2 text-sm font-semibold text-xiaomi">Rs. {product.price.toLocaleString()}</p>
          <p className="mt-1 truncate text-xs text-muted">{product.product_id}</p>
        </div>

        <div className="grid gap-2 rounded-lg border border-border bg-bg p-2.5">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 text-ink-soft transition hover:border-ink hover:text-ink"
              aria-label={`Decrease quantity for ${product.name}`}
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-medium text-ink">{quantity}</span>
            <button
              type="button"
              onClick={() => step(1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 text-ink-soft transition hover:border-ink hover:text-ink"
              aria-label={`Increase quantity for ${product.name}`}
            >
              +
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {canOpen ? (
              <Link
                href={productUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 min-w-0 items-center justify-center rounded-full border border-border bg-surface-2 px-3 text-xs font-medium text-ink-soft transition hover:border-ink hover:text-ink"
              >
                View
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className={`${canOpen ? "" : "col-span-2"} inline-flex h-9 min-w-0 items-center justify-center rounded-full bg-accent px-3 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {showConfirm ? "Added" : isAdding ? "Adding..." : `Add ${quantity}`}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
