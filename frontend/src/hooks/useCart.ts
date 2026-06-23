"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCart, updateCartItem, removeCartItem, createWsUrl, CartState } from "@/lib/api";
import { saveRecentCartSnapshot } from "@/lib/recent-carts";

const emptyCart: CartState = {
  session_id: "",
  items: [],
  recipient: {},
  delivery: {},
  sender: {},
  gift_message: "",
  budget_max: null,
};

export function useCart(sessionId: string) {
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [total, setTotal] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const data = await getCart(sessionId);
      const nextCart = data.cart || emptyCart;
      setCart(nextCart);
      setTotal(data.total || 0);
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    if (cart.items.length) saveRecentCartSnapshot(cart);
  }, [cart]);

  useEffect(() => {
    let isActive = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    getCart(sessionId)
      .then((data) => {
        if (!isActive) return;
        setCart(data.cart || emptyCart);
        setTotal(data.total || 0);
      })
      .catch(() => {
        // ignore
      });

    const wsUrl = createWsUrl(sessionId);
    if (!wsUrl) {
      interval = setInterval(fetchCart, 5000);
    } else {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "cart_updated" && data.cart) {
            setCart(data.cart || emptyCart);
            setTotal(
              (data.cart.items || []).reduce(
                (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
                0
              )
            );
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        if (!interval) {
          interval = setInterval(fetchCart, 5000);
        }
      };

      ws.onclose = () => {
        if (!interval) {
          interval = setInterval(fetchCart, 5000);
        }
      }
    }

    return () => {
      isActive = false;
      if (interval) clearInterval(interval);
      wsRef.current?.close();
    };
  }, [sessionId, fetchCart]);

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const data = await updateCartItem(sessionId, productId, quantity);
      setCart(data.cart || emptyCart);
      setTotal(data.total || 0);
    },
    [sessionId]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      const data = await removeCartItem(sessionId, productId);
      setCart(data.cart || emptyCart);
      setTotal(data.total || 0);
    },
    [sessionId]
  );

  return { cart, total, updateQuantity, removeItem, refresh: fetchCart };
}
