const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  added_by: string;
}

export interface CartState {
  session_id: string;
  items: CartItem[];
  recipient: Record<string, string>;
  delivery: Record<string, string>;
  sender: Record<string, string>;
  gift_message: string;
  budget_max?: number | null;
}

export interface BackendMeta {
  provider: string;
  model: string;
  high_density_default: boolean;
  mcp: {
    server_url: string;
    connected: boolean;
    tool_count: number;
    tools: string[];
  };
}

export interface ProductSummary {
  name: string;
  product_id: string;
  price: number;
  image_url?: string;
  product_url?: string;
  raw?: string;
}

export interface TrackingEvent {
  label: string;
  time?: string;
  location?: string;
}

export interface TrackingItem {
  name: string;
  quantity?: number | null;
}

export interface TrackingSummary {
  order_number: string;
  status: string;
  recipient: string;
  estimated_delivery: string;
  location: string;
  items: TrackingItem[];
  events: TrackingEvent[];
  raw?: string;
}

export interface CheckoutInfoPayload {
  recipient: {
    name: string;
    phone: string;
  };
  delivery: {
    address: string;
    city: string;
    date: string;
  };
  sender: {
    name: string;
  };
  gift_message: string;
}

export interface BudgetPayload {
  budget_max: number | null;
}

export interface ChatEvent {
  type: "session_id" | "tool_call" | "tool_result" | "text" | "error" | "cart_updated";
  session_id?: string;
  provider?: string;
  model?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  raw?: string;
  text?: string;
  error?: string;
  cart?: CartState;
  product?: ProductSummary;
  products?: ProductSummary[];
  tracking?: TrackingSummary;
}

export async function* streamChat(
  message: string,
  sessionId: string,
  history?: { role: string; content: string }[]
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, history }),
  });

  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        yield JSON.parse(data) as ChatEvent;
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function getCart(sessionId: string) {
  const res = await fetch(`${API_URL}/api/cart/${sessionId}`);
  return res.json();
}

export async function addToCart(sessionId: string, productId: string, quantity = 1) {
  const res = await fetch(`${API_URL}/api/cart/${sessionId}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId, quantity }),
  });
  return res.json();
}

export async function updateCartItem(sessionId: string, productId: string, quantity: number) {
  const res = await fetch(`${API_URL}/api/cart/${sessionId}/item/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  return res.json();
}

export async function removeCartItem(sessionId: string, productId: string) {
  const res = await fetch(`${API_URL}/api/cart/${sessionId}/item/${productId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function updateCheckoutInfo(sessionId: string, payload: CheckoutInfoPayload) {
  const res = await fetch(`${API_URL}/api/cart/${sessionId}/checkout-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateBudget(sessionId: string, budget_max: number | null) {
  const res = await fetch(`${API_URL}/api/cart/${sessionId}/budget`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ budget_max }),
  });
  return res.json();
}

export function createWsUrl(sessionId: string) {
  if (typeof window === "undefined") return "ws://localhost:3000/ws";
  return `${window.location.origin.replace(/^http/, "ws")}/ws/cart/${sessionId}`;
}

export async function getBackendMeta(): Promise<BackendMeta> {
  const res = await fetch(`${API_URL}/api/meta`);
  return res.json();
}
