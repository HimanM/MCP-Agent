const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
}

export interface ChatEvent {
  type: "session_id" | "tool_call" | "tool_result" | "text" | "error" | "cart_updated";
  session_id?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  text?: string;
  error?: string;
  cart?: CartState;
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

export function createWsUrl(sessionId: string) {
  const base = API_URL.replace("http", "ws");
  return `${base}/ws/cart/${sessionId}`;
}
