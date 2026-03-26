"use client";

/**
 * useNotificationHandler — Subscribes to "notification" WebSocket messages
 * and routes them into the notification store (bell dropdown) + toast + browser push.
 */

import { useEffect } from "react";
import { useNotificationStore } from "@/lib/stores/notification-store";
import { toast } from "@/lib/stores/toast-store";

type WSOn = (
  type: string,
  handler: (data: Record<string, unknown>) => void,
) => () => void;

export function useNotificationHandler(wsOn: WSOn | null) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!wsOn) return;

    const unsub = wsOn("notification", (data) => {
      const title = (data.title as string) || "Notification";
      const body = data.body as string | undefined;
      const notificationType = (data.notification_type as string) || "mention";
      const priority = data.priority as string | undefined;

      // 1. Add to notification store -> feeds the bell dropdown
      addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: notificationType,
        tier:
          priority === "high" || priority === "critical" ? "urgent" : "normal",
        title,
        body,
        channel_id:
          data.entity_type === "channel"
            ? (data.entity_id as string)
            : undefined,
        message_id:
          data.entity_type === "message"
            ? (data.entity_id as string)
            : undefined,
        agent_id:
          data.entity_type === "agent"
            ? (data.entity_id as string)
            : undefined,
        contact_id:
          data.entity_type === "contact"
            ? (data.entity_id as string)
            : undefined,
        read: false,
        created_at: new Date().toISOString(),
      });

      // 2. Show toast for immediate visibility
      if (priority === "high" || priority === "critical") {
        toast.warning(title, body);
      } else {
        toast.info(title, body);
      }

      // 3. Browser pop-up if backend says to and conditions are met
      if (
        data.browser_push &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        !document.hasFocus()
      ) {
        new Notification(title, {
          body: body || undefined,
          icon: "/icon-192.png",
        });
      }
    });

    return unsub;
  }, [wsOn, addNotification]);
}
