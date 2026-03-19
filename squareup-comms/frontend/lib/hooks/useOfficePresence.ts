/**
 * Unified presence hook — idle detection and activity sync.
 *
 * Tracks mouse/keyboard activity to detect idle state:
 *  - 5 min inactivity → status "away"
 *  - 15 min inactivity → dim avatar (future: ghost opacity)
 *  - Activity resumes → restore previous status
 *
 * Also broadcasts activity via WebSocket when status changes.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useOfficeStore } from "@/lib/stores/office-store";
import type { UserStatus } from "@/lib/stores/office-store";

const AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DIM_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

interface UseOfficePresenceOptions {
  readonly userId: string;
  readonly enabled?: boolean;
  readonly onStatusChange?: (status: UserStatus) => void;
}

export function useOfficePresence({
  userId,
  enabled = true,
  onStatusChange,
}: UseOfficePresenceOptions) {
  const lastActivityRef = useRef(Date.now());
  const previousStatusRef = useRef<UserStatus>("online");
  const isIdleRef = useRef(false);

  const updateUserStatus = useOfficeStore((s) => s.updateUserStatus);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (isIdleRef.current) {
      isIdleRef.current = false;
      updateUserStatus(userId, previousStatusRef.current);
      onStatusChange?.(previousStatusRef.current);
    }
  }, [userId, updateUserStatus, onStatusChange]);

  // Track user activity events
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const events: readonly string[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const handler = () => resetActivity();

    for (const event of events) {
      window.addEventListener(event, handler, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handler);
      }
    };
  }, [enabled, resetActivity]);

  // Periodic idle check
  useEffect(() => {
    if (!enabled) return;

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= AWAY_TIMEOUT_MS && !isIdleRef.current) {
        // Store the current status before going idle
        const currentUsers = useOfficeStore.getState().users;
        const me = currentUsers.find((u) => u.id === userId);
        if (me && me.status !== "away") {
          previousStatusRef.current = me.status;
        }

        isIdleRef.current = true;
        updateUserStatus(userId, "away", "Idle");
        onStatusChange?.("away");
      }
    };

    const interval = setInterval(checkIdle, 30_000); // Check every 30s
    return () => clearInterval(interval);
  }, [enabled, userId, updateUserStatus, onStatusChange]);

  // On mount, mark as online
  useEffect(() => {
    if (!enabled) return;

    updateUserStatus(userId, "online");
    onStatusChange?.("online");

    // On unmount (tab close / navigate away), we could mark offline
    // but the WebSocket disconnect handler should handle that server-side
  }, [enabled, userId, updateUserStatus, onStatusChange]);
}
