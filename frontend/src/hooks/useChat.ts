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
const RAW_HISTORY_LIMIT = 6;
const SUMMARY_CHAR_LIMIT = 900;
const TYPEWRITER_STEP_MS = 14;
const TYPEWRITER_CHARS_PER_STEP = 6;

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

function summarizeHistory(messages: Message[]) {
  const conversational = messages.filter(
    (message) => (message.role === "user" || message.role === "assistant") && message.content.trim()
  );
  if (conversational.length <= RAW_HISTORY_LIMIT) return "";

  const older = conversational.slice(0, -RAW_HISTORY_LIMIT).slice(-8);
  const summary = older
    .map((message) => {
      const normalized = message.content.replace(/\s+/g, " ").trim().slice(0, 160);
      return `${message.role}: ${normalized}`;
    })
    .join(" | ")
    .slice(0, SUMMARY_CHAR_LIMIT)
    .trim();

  return summary ? `Earlier conversation summary: ${summary}` : "";
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useChat(sessionId: string, modelOverride?: string | null) {
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
        .slice(-RAW_HISTORY_LIMIT)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));
      const historySummary = summarizeHistory(messagesRef.current);

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
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const revealAssistantText = async (
        fullText: string,
        results: typeof toolResults
      ) => {
        for (let length = TYPEWRITER_CHARS_PER_STEP; length < fullText.length; length += TYPEWRITER_CHARS_PER_STEP) {
          const partial = fullText.slice(0, length);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: partial } : m))
          );
          await sleep(TYPEWRITER_STEP_MS);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullText, toolResults: [...results] } : m
          )
        );
      };

      try {
        for await (const event of streamChat(text, sessionId, history, historySummary, modelOverride)) {
          switch (event.type) {
            case "tool_call":
              toolCalls.push({ tool: event.tool!, args: event.args || {} });
              setMessages((prev) => {
                return prev.map((m) =>
                  m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m
                );
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
              break;

            case "text":
              assistantContent = event.text || "";
              await revealAssistantText(assistantContent, [...toolResults]);
              break;

            case "error":
              setError(event.error || "Unknown error");
              break;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connection failed");
      } finally {
        if (!assistantContent && toolResults.length) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, toolResults: [...toolResults] } : m))
          );
        }
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming, modelOverride]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    clearCachedMessages(sessionId);
  }, [sessionId]);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
