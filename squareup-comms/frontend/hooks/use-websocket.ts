"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type WSStatus = "connecting" | "connected" | "disconnected" | "reconnecting";
type MessageHandler = (data: Record<string, unknown>) => void;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // exponential backoff
const MAX_RECONNECT_ATTEMPTS = 10;
// Close codes that indicate auth failure — do not retry
const AUTH_FAILURE_CODES = new Set([4001, 4003]);

export function useWebSocket(token?: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<WSStatus>("disconnected");

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type as string;
        if (!type) return;

        // Dispatch to type-specific handlers
        const handlers = handlersRef.current.get(type);
        handlers?.forEach((handler) => handler(data));

        // Also dispatch to wildcard handlers
        const wildcardHandlers = handlersRef.current.get("*");
        wildcardHandlers?.forEach((handler) => handler(data));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      // Don't retry on auth failures or after max attempts
      if (AUTH_FAILURE_CODES.has(event.code)) {
        setStatus("disconnected");
        return;
      }
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus("disconnected");
        return;
      }
      setStatus("reconnecting");
      const delay =
        RECONNECT_DELAYS[
          Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
        ];
      reconnectAttemptRef.current++;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
    setStatus("connecting");
  }, [token]);

  // Connect on mount / token change
  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("disconnected");
    };
  }, [connect]);

  // Send a message
  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Subscribe to a message type
  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return { status, send, on };
}
