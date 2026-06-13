"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCart, updateCartItem, removeCartItem, createWsUrl, CartState } from "@/lib/api";

const emptyCart: CartState = {
  session_id: "",
  items: [],
  recipient: {},
  delivery: {},
  sender: {},
  gift_message: "",
};

export function useCart(sessionId: string) {
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [total, setTotal] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const data = await getCart(sessionId);
      setCart(data.cart);
      setTotal(data.total);
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    let isActive = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    getCart(sessionId)
      .then((data) => {
        if (!isActive) return;
        setCart(data.cart);
        setTotal(data.total);
      })
      .catch(() => {
        // ignore
      });

    const ws = new WebSocket(createWsUrl(sessionId));
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "cart_updated" && data.cart) {
          setCart(data.cart);
          setTotal(
            data.cart.items.reduce(
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

    return () => {
      isActive = false;
      if (interval) clearInterval(interval);
      ws.close();
    };
  }, [sessionId, fetchCart]);

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const data = await updateCartItem(sessionId, productId, quantity);
      setCart(data.cart);
      setTotal(data.total);
    },
    [sessionId]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      const data = await removeCartItem(sessionId, productId);
      setCart(data.cart);
      setTotal(data.total);
    },
    [sessionId]
  );

  return { cart, total, updateQuantity, removeItem, refresh: fetchCart };
}
