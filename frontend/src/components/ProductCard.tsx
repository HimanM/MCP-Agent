"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Minus, Plus, ShoppingBag, Star } from "lucide-react";
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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1rem] border border-border bg-white shadow-[0_10px_24px_rgba(37,36,31,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-border-hover md:rounded-[1.5rem] md:shadow-[0_14px_40px_rgba(37,36,31,0.05)]">
      {canOpen ? (
        <Link href={productUrl} target="_blank" rel="noreferrer" className="block" aria-label={`Open ${product.name}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 md:aspect-[4/3]">
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={product.name}
                width={640}
                height={480}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                unoptimized
              />
            ) : (
              <PlaceholderIcon label={product.name.charAt(0)} />
            )}
            <div className="absolute left-2 top-2 hidden rounded-full bg-white/92 px-2 py-1 text-[11px] font-semibold text-accent shadow-sm md:inline-flex">
              Bestseller
            </div>
          </div>
        </Link>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={product.name}
              width={640}
              height={480}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              unoptimized
            />
          ) : (
            <PlaceholderIcon label={product.name.charAt(0)} />
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-4">
        <div className="min-w-0 flex-1">
          {canOpen ? (
            <Link href={productUrl} target="_blank" rel="noreferrer" className="block">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink transition group-hover:text-accent md:text-[15px]">
                {product.name}
              </h3>
            </Link>
          ) : (
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink md:text-[15px]">{product.name}</h3>
          )}
          <p className="mt-1 text-sm font-semibold text-ink md:mt-2 md:text-base">LKR {product.price.toLocaleString()}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#b67a2f] md:mt-2 md:text-xs">
            <Star size={12} className="fill-current" />
            <span>4.8</span>
            <span className="hidden text-muted md:inline">(124)</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2 md:grid md:gap-2 md:rounded-[1.1rem] md:border md:border-border md:bg-bg md:p-2.5">
          <div className="flex items-center gap-1 md:justify-center md:gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="grid h-7 w-7 place-items-center rounded-full border border-border bg-surface-2 text-ink-soft transition hover:border-accent hover:text-accent md:h-8 md:w-8"
              aria-label={`Decrease quantity for ${product.name}`}
            >
              <Minus size={14} />
            </button>
            <span className="min-w-5 text-center text-xs font-medium text-ink md:min-w-6 md:text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => step(1)}
              className="grid h-7 w-7 place-items-center rounded-full border border-border bg-surface-2 text-ink-soft transition hover:border-accent hover:text-accent md:h-8 md:w-8"
              aria-label={`Increase quantity for ${product.name}`}
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 md:grid md:grid-cols-2">
            {canOpen ? (
              <Link
                href={productUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 min-w-0 items-center justify-center gap-1 rounded-full border border-border bg-surface-2 px-3 text-xs font-medium text-ink-soft transition hover:border-accent hover:text-accent md:inline-flex"
              >
                <ExternalLink size={13} />
                View
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className={`${canOpen ? "" : "md:col-span-2"} inline-flex h-9 min-w-[4.7rem] items-center justify-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:min-w-0 md:px-3 md:text-sm`}
            >
              <ShoppingBag size={14} />
              {showConfirm ? "Added" : isAdding ? "Adding..." : "Add"}
              {!showConfirm && !isAdding ? <span className="hidden md:inline">{quantity}</span> : null}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
