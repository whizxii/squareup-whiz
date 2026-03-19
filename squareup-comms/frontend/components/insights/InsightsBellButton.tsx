"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsightsStore } from "@/lib/stores/insights-store";

/**
 * Compact bell icon with unread badge — place in any header/toolbar.
 * Toggles the ProactiveInsightsPanel.
 */
export default function InsightsBellButton() {
  const { unreadCount, togglePanel, panelOpen } = useInsightsStore();

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
      title="Proactive Insights"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
