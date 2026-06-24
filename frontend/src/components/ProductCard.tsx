"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Minus, Plus, ShoppingBag } from "lucide-react";
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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1rem] border border-border bg-surface shadow-[0_10px_24px_rgba(15,15,15,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-border-hover md:rounded-[1.2rem]">
      {canOpen ? (
        <Link href={productUrl} target="_blank" rel="noreferrer" className="block" aria-label={`Open ${product.name}`}>
          <div className="relative aspect-square overflow-hidden bg-surface-2 md:aspect-[4/3]">
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
            <div className="absolute left-2 top-2 hidden rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-accent shadow-sm md:inline-flex">
              Bestseller
            </div>
          </div>
        </Link>
      ) : (
        <div className="relative aspect-square overflow-hidden bg-surface-2 md:aspect-[4/3]">
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

      <div className="flex flex-1 flex-col gap-2 p-3 md:p-3">
        <div className="min-w-0 flex-1">
          {canOpen ? (
            <Link href={productUrl} target="_blank" rel="noreferrer" className="block">
              <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-ink transition group-hover:text-accent md:min-h-0 md:text-[14px]">
                {product.name}
              </h3>
            </Link>
          ) : (
            <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-ink md:min-h-0 md:text-[14px]">{product.name}</h3>
          )}
          <p className="mt-1 text-base font-semibold leading-none text-ink md:text-sm">LKR {product.price.toLocaleString()}</p>
        </div>

        <div className="mt-auto space-y-2 border-t border-border/70 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="hidden text-[10px] uppercase tracking-[0.14em] text-muted md:inline">Quantity</span>
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1">
              <button
                type="button"
                onClick={() => step(-1)}
                className="grid h-7 w-7 place-items-center rounded-full border border-border/70 bg-surface text-ink-soft transition hover:border-accent hover:text-accent"
                aria-label={`Decrease quantity for ${product.name}`}
              >
                <Minus size={12} />
              </button>
              <span className="min-w-4 text-center text-sm font-medium text-ink">{quantity}</span>
              <button
                type="button"
                onClick={() => step(1)}
                className="grid h-7 w-7 place-items-center rounded-full border border-border/70 bg-surface text-ink-soft transition hover:border-accent hover:text-accent"
                aria-label={`Increase quantity for ${product.name}`}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {canOpen ? (
              <Link
                href={productUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-full border border-border bg-surface-2 px-2 text-[11px] font-medium text-ink-soft transition hover:border-accent hover:text-accent md:h-8 md:px-2.5 md:text-[11px]"
              >
                <ExternalLink size={12} />
                View
              </Link>
            ) : (
              <div className="hidden md:block" />
            )}
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className={`inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-full bg-accent px-2 text-[11px] font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:px-3 md:text-[11px] ${
                canOpen ? "" : "col-span-2"
              }`}
            >
              <ShoppingBag size={12} />
              {showConfirm ? "Added" : isAdding ? "Adding..." : "Add"}
              {!showConfirm && !isAdding ? <span className="hidden md:inline">{quantity}</span> : null}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
