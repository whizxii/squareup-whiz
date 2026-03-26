"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * useBrowserNotifications — wraps the Web Notification API permission flow.
 *
 * Returns the current permission state and a function to request permission.
 */
export function useBrowserNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, requestPermission };
}
