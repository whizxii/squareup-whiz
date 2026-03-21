"use client";

import { useMemo } from "react";
import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { useReminders, useCancelReminder } from "@/lib/hooks/use-tasks-queries";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bell, BellOff, Bot, X } from "lucide-react";
import type { Reminder, ReminderStatus } from "@/lib/types/tasks";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/format";

// ─── Status badge config ─────────────────────────────────────────

const STATUS_VARIANT: Record<ReminderStatus, "primary" | "success" | "default"> = {
  pending: "primary",
  fired: "success",
  cancelled: "default",
};

const STATUS_LABEL: Record<ReminderStatus, string> = {
  pending: "Pending",
  fired: "Fired",
  cancelled: "Cancelled",
};

// ─── Time formatting ─────────────────────────────────────────────

function formatRemindAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Past
    const absMins = Math.abs(diffMins);
    if (absMins < 60) return `${absMins}m ago`;
    const absHours = Math.abs(diffHours);
    if (absHours < 24) return `${absHours}h ago`;
    return date.toLocaleDateString(APP_LOCALE, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: APP_TIMEZONE,
    });
  }

  // Future
  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays === 1) {
    return `Tomorrow at ${date.toLocaleTimeString(APP_LOCALE, { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })}`;
  }
  if (diffDays <= 7) return `in ${diffDays} days`;

  return date.toLocaleDateString(APP_LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
}

// ─── Reminder Row ────────────────────────────────────────────────

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const cancelReminder = useCancelReminder();

  const bellColor =
    reminder.status === "pending"
      ? "text-blue-500"
      : reminder.status === "fired"
        ? "text-green-500"
        : "text-muted-foreground";

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 rounded-lg transition-colors">
      {/* Icon */}
      <div className={`shrink-0 ${bellColor}`}>
        {reminder.status === "cancelled" ? (
          <BellOff className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              reminder.status === "cancelled" ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {reminder.message}
          </span>
          {reminder.created_by_agent && (
            <span className="flex items-center gap-0.5 text-[10px] text-purple-500 font-medium">
              <Bot className="w-3 h-3" />
              Donna
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatRemindAt(reminder.remind_at)}
          </span>
          <Badge variant={STATUS_VARIANT[reminder.status]} size="sm">
            {STATUS_LABEL[reminder.status]}
          </Badge>
          {reminder.recurrence && (
            <Badge variant="purple" size="sm">
              {reminder.recurrence}
            </Badge>
          )}
        </div>
      </div>

      {/* Cancel action (pending only) */}
      {reminder.status === "pending" && (
        <button
          onClick={() => cancelReminder.mutate(reminder.id)}
          disabled={cancelReminder.isPending}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
          title="Cancel reminder"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function RemindersListView() {
  const searchQuery = useTasksUIStore((s) => s.searchQuery);
  const openDialog = useTasksUIStore((s) => s.openDialog);

  const { data: reminders, isLoading } = useReminders();

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!reminders) return [];
    if (!searchQuery.trim()) return reminders;
    const q = searchQuery.toLowerCase();
    return reminders.filter((r) => r.message.toLowerCase().includes(q));
  }, [reminders, searchQuery]);

  // Split into upcoming (pending) and past (fired + cancelled)
  const { upcoming, past } = useMemo(() => {
    const up: Reminder[] = [];
    const pa: Reminder[] = [];
    for (const r of filtered) {
      if (r.status === "pending") {
        up.push(r);
      } else {
        pa.push(r);
      }
    }
    // Sort upcoming by remind_at ASC
    up.sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime());
    // Sort past by remind_at DESC (most recent first)
    pa.sort((a, b) => new Date(b.remind_at).getTime() - new Date(a.remind_at).getTime());
    return { upcoming: up, past: pa };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading reminders...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title={searchQuery ? "No matching reminders" : "No reminders yet"}
          description={
            searchQuery
              ? "Try a different search term."
              : "Set a reminder or ask Donna to create one for you."
          }
          action={
            searchQuery
              ? undefined
              : { label: "Set a reminder", onClick: () => openDialog("create-reminder") }
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-2">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 px-4 py-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
            <span className="text-xs text-muted-foreground">({upcoming.length})</span>
          </div>
          <div className="space-y-0.5">
            {upcoming.map((r) => (
              <ReminderRow key={r.id} reminder={r} />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 px-4 py-2">
            <BellOff className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Past</h3>
            <span className="text-xs text-muted-foreground">({past.length})</span>
          </div>
          <div className="space-y-0.5">
            {past.map((r) => (
              <ReminderRow key={r.id} reminder={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
