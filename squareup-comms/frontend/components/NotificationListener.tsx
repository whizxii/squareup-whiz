"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useWebSocket } from "@/hooks/use-websocket";
import { useNotificationHandler } from "@/hooks/use-notification-handler";

/**
 * Invisible component that maintains a WebSocket connection
 * to receive and route notifications to the bell dropdown + browser push.
 * Mounted once in the workspace layout.
 */
export function NotificationListener() {
  const token = useAuthStore((s) => s.token);
  const { on: wsOn } = useWebSocket(token);
  useNotificationHandler(wsOn);
  return null;
}
