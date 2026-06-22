"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat, type OrderSummary, type ProductSummary, type TrackingSummary } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: { tool: string; args: Record<string, unknown> }[];
  toolResults?: { tool: string; result?: string; raw?: string; product?: ProductSummary; products?: ProductSummary[]; tracking?: TrackingSummary; order?: OrderSummary }[];
  timestamp: number;
}

const CHAT_CACHE_PREFIX = "kapruka.chat.messages";
const CHAT_CACHE_TTL_MS = 5 * 60 * 1000;

function chatCacheKey(sessionId: string) {
  return `${CHAT_CACHE_PREFIX}:${sessionId}`;
}

function loadCachedMessages(sessionId: string): Message[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(chatCacheKey(sessionId));
    if (!raw) return [];

    const cached = JSON.parse(raw) as { expiresAt?: number; messages?: Message[] };
    if (!cached.expiresAt || cached.expiresAt < Date.now()) {
      window.localStorage.removeItem(chatCacheKey(sessionId));
      return [];
    }

    return Array.isArray(cached.messages) ? cached.messages : [];
  } catch {
    return [];
  }
}

function saveCachedMessages(sessionId: string, messages: Message[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      chatCacheKey(sessionId),
      JSON.stringify({
        expiresAt: Date.now() + CHAT_CACHE_TTL_MS,
        messages,
      })
    );
  } catch {
    // ignore
  }
}

function clearCachedMessages(sessionId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(chatCacheKey(sessionId));
  } catch {
    // ignore
  }
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>(() => loadCachedMessages(sessionId));
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idCounter = useRef(0);
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
    idCounter.current = Math.max(idCounter.current, messages.length * 2);
    saveCachedMessages(sessionId, messages);
  }, [messages, sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const history = messagesRef.current
        .filter((message) => (message.role === "user" || message.role === "assistant") && message.content.trim())
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const userMsg: Message = {
        id: `user-${++idCounter.current}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setError(null);

      let assistantContent = "";
      const toolCalls: { tool: string; args: Record<string, unknown> }[] = [];
      const toolResults: { tool: string; result?: string; raw?: string; product?: ProductSummary; products?: ProductSummary[]; tracking?: TrackingSummary; order?: OrderSummary }[] = [];
      const assistantId = `assistant-${++idCounter.current}`;

      try {
        for await (const event of streamChat(text, sessionId, history)) {
          switch (event.type) {
            case "tool_call":
              toolCalls.push({ tool: event.tool!, args: event.args || {} });
              setMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantId);
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant" as const,
                    content: "",
                    toolCalls: [...toolCalls],
                    timestamp: Date.now(),
                  },
                ];
              });
              break;

            case "tool_result":
              toolResults.push({
                tool: event.tool || "",
                result: event.result,
                raw: event.raw,
                product: event.product,
                products: event.products,
                tracking: event.tracking,
                order: event.order,
              });
              setMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantId);
                const updatedResults = [...toolResults];
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, toolResults: updatedResults } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant" as const,
                    content: assistantContent,
                    toolResults: updatedResults,
                    timestamp: Date.now(),
                  },
                ];
              });
              break;

            case "text":
              assistantContent = event.text || "";
              setMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantId);
                const updatedResults = [...toolResults];
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent, toolResults: updatedResults } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant" as const,
                    content: assistantContent,
                    toolResults: updatedResults,
                    timestamp: Date.now(),
                  },
                ];
              });
              break;

            case "error":
              setError(event.error || "Unknown error");
              break;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connection failed");
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    clearCachedMessages(sessionId);
  }, [sessionId]);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
