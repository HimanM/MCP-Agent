"use client";

import { useState } from "react";
import { addToCart } from "@/lib/api";

interface ProductCardProps {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  sessionId: string;
  onAdded?: () => void;
}

export default function ProductCard({
  productId,
  name,
  price,
  imageUrl,
  sessionId,
  onAdded,
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await addToCart(sessionId, productId);
      setShowConfirm(true);
      onAdded?.();
      setTimeout(() => setShowConfirm(false), 2000);
    } catch {
      // Keep the chat flow uninterrupted if a single add action fails.
    } finally {
      setIsAdding(false);
    }
  };

  const imgSrc =
    imageUrl && imageUrl.startsWith("http")
      ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      : null;

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-surface shadow-[0_14px_40px_rgba(37,36,31,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-border-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-muted">
            {name.charAt(0)}
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(37,36,31,0.18)] transition hover:bg-accent-hover disabled:opacity-50"
          >
            {showConfirm ? "Added" : isAdding ? "Adding..." : "Add to cart"}
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-1 truncate font-mono text-xs text-muted">{productId}</p>
        <h3 className="mb-3 line-clamp-2 text-sm font-medium leading-snug text-ink">{name}</h3>
        <p className="text-sm font-semibold text-xiaomi">Rs. {price.toLocaleString()}</p>
      </div>
    </div>
  );
}
