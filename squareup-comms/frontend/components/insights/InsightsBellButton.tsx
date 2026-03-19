"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsightsStore } from "@/lib/stores/insights-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchPendingCount(): Promise<number> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : { "X-User-Id": getCurrentUserId() };
  try {
    const res = await fetch(`${API_URL}/api/automation/pending-count`, { headers });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Compact bell icon with two badges:
 * - Red badge: unread insights
 * - Amber badge: pending automation reviews
 */
export default function InsightsBellButton() {
  const { unreadCount, togglePanel, panelOpen } = useInsightsStore();
  const [pendingReviews, setPendingReviews] = useState(0);

  useEffect(() => {
    fetchPendingCount().then(setPendingReviews);
    const interval = setInterval(() => {
      fetchPendingCount().then(setPendingReviews);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const totalBadge = unreadCount + pendingReviews;

  return (
    <button
      type="button"
      onClick={togglePanel}
      className={cn(
        "relative p-2 rounded-lg transition-colors",
        panelOpen
          ? "bg-sq-agent/10 text-sq-agent"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
      title={
        pendingReviews > 0
          ? `${pendingReviews} AI action${pendingReviews !== 1 ? "s" : ""} need review`
          : "Proactive Insights"
      }
    >
      <Bell className="w-4 h-4" />

      {/* Insights unread badge (red) */}
      {unreadCount > 0 && pendingReviews === 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {/* Pending review badge (amber) — shown when reviews exist */}
      {pendingReviews > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none">
          {totalBadge > 99 ? "99+" : totalBadge}
        </span>
      )}
    </button>
  );
}
