"use client";

import { useState, useCallback, useRef } from "react";
import { streamChat } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: { tool: string; args: Record<string, unknown> }[];
  timestamp: number;
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idCounter = useRef(0);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

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
      const assistantId = `assistant-${++idCounter.current}`;

      try {
        for await (const event of streamChat(text, sessionId)) {
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

            case "text":
              assistantContent = event.text || "";
              setMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantId);
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant" as const,
                    content: assistantContent,
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

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
