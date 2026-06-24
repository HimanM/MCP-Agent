import type { CartState, ProductSummary } from "@/lib/api";

const RECENT_CARTS_KEY = "kapruka.recent.carts";
const RECENT_CART_LIMIT = 3;
const RECENT_CART_TTL_MS = 6 * 60 * 60 * 1000;
const RECENT_CARTS_EVENT = "kapruka:recent-carts";

export type RecentCartSnapshot = {
  sessionId: string;
  savedAt: number;
  itemCount: number;
  total: number;
  items: Array<ProductSummary & { quantity?: number }>;
};

export function loadRecentCartSnapshots(): RecentCartSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CARTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const fresh = (parsed as RecentCartSnapshot[])
      .filter((entry) => entry?.savedAt && Date.now() - entry.savedAt < RECENT_CART_TTL_MS)
      .slice(0, RECENT_CART_LIMIT);
    if (fresh.length !== parsed.length) {
      window.localStorage.setItem(RECENT_CARTS_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return [];
  }
}

export function subscribeRecentCartSnapshots(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const notify = () => onStoreChange();
  window.addEventListener("storage", notify);
  window.addEventListener(RECENT_CARTS_EVENT, notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(RECENT_CARTS_EVENT, notify);
  };
}

export function saveRecentCartSnapshot(cart: CartState) {
  if (typeof window === "undefined" || !cart.items.length) return;

  const snapshot: RecentCartSnapshot = {
    sessionId: cart.session_id,
    savedAt: Date.now(),
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    items: cart.items.map((item) => ({
      product_id: item.product_id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      quantity: item.quantity,
    })),
  };

  try {
    const existing = loadRecentCartSnapshots().filter((entry) => entry.sessionId !== cart.session_id);
    window.localStorage.setItem(RECENT_CARTS_KEY, JSON.stringify([snapshot, ...existing].slice(0, RECENT_CART_LIMIT)));
    window.dispatchEvent(new Event(RECENT_CARTS_EVENT));
  } catch {
    // ignore
  }
}
