/**
 * Toast-style entrance/exit notifications for the office.
 * Shows animated slide-in toasts when users join or leave.
 * Auto-dismisses after 4 seconds.
 * Themed via useOfficeTheme.
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

interface Notification {
  readonly id: string;
  readonly userName: string;
  readonly type: "join" | "leave";
  readonly timestamp: number;
}

const NOTIFICATION_LIFETIME_MS = 4000;
const MAX_VISIBLE = 3;

export default function OfficeNotifications() {
  const { tokens } = useOfficeTheme();
  const myUserId = useCurrentUserId();
  const users = useOfficeStore((s) => s.users);
  const previousUserIdsRef = useRef<ReadonlySet<string>>(new Set());
  const [notifications, setNotifications] = useState<readonly Notification[]>(
    []
  );
  const initializedRef = useRef(false);

  // Detect user joins and leaves
  useEffect(() => {
    const currentIds = new Set(users.map((u) => u.id));
    const previousIds = previousUserIdsRef.current;

    // Skip the first render to avoid "join" notifications for existing users
    if (!initializedRef.current) {
      previousUserIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    const newNotifications: Notification[] = [];

    // Users who joined
    for (const id of currentIds) {
      if (!previousIds.has(id) && id !== myUserId) {
        const user = users.find((u) => u.id === id);
        if (user) {
          newNotifications.push({
            id: `join-${id}-${Date.now()}`,
            userName: user.name,
            type: "join",
            timestamp: Date.now(),
          });
        }
      }
    }

    // Users who left
    for (const id of previousIds) {
      if (!currentIds.has(id) && id !== myUserId) {
        newNotifications.push({
          id: `leave-${id}-${Date.now()}`,
          userName: id, // We may not have the name anymore
          type: "leave",
          timestamp: Date.now(),
        });
      }
    }

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...prev, ...newNotifications]);
    }

    previousUserIdsRef.current = currentIds;
  }, [users, myUserId]);

  // Auto-dismiss old notifications
  const cleanupNotifications = useCallback(() => {
    const now = Date.now();
    setNotifications((prev) =>
      prev.filter((n) => now - n.timestamp < NOTIFICATION_LIFETIME_MS)
    );
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setInterval(cleanupNotifications, 1000);
    return () => clearInterval(timer);
  }, [notifications.length, cleanupNotifications]);

  const visible = notifications.slice(-MAX_VISIBLE);

  return (
    <div className="absolute left-4 top-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {visible.map((notification) => (
          <motion.div
            key={notification.id}
            className="flex items-center gap-2 rounded-xl px-3 py-2 shadow-lg"
            style={{
              backgroundColor: tokens.glass,
              backdropFilter: "blur(16px) saturate(180%)",
              border: `1px solid ${tokens.glassBorder}`,
            }}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {notification.type === "join" ? (
              <LogIn
                size={12}
                style={{ color: tokens.status.online }}
              />
            ) : (
              <LogOut size={12} style={{ color: tokens.textMuted }} />
            )}
            <span
              className="text-[11px] font-medium"
              style={{ color: tokens.text }}
            >
              <span style={{ fontWeight: 600 }}>{notification.userName}</span>{" "}
              {notification.type === "join"
                ? "joined the office"
                : "left the office"}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
