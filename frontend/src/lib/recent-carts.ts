import type { CartState, ProductSummary } from "@/lib/api";

const RECENT_CARTS_KEY = "kapruka.recent.carts";
const RECENT_CART_LIMIT = 3;

export type RecentCartSnapshot = {
  sessionId: string;
  savedAt: number;
  itemCount: number;
  total: number;
  items: ProductSummary[];
};

export function loadRecentCartSnapshots(): RecentCartSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CARTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentCartSnapshot[]) : [];
  } catch {
    return [];
  }
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
    })),
  };

  try {
    const existing = loadRecentCartSnapshots().filter((entry) => entry.sessionId !== cart.session_id);
    window.localStorage.setItem(RECENT_CARTS_KEY, JSON.stringify([snapshot, ...existing].slice(0, RECENT_CART_LIMIT)));
  } catch {
    // ignore
  }
}
