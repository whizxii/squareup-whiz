"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCalendarEvents } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatDate, formatTime, formatRelativeTime } from "@/lib/format";
import { EVENT_TYPE_CONFIG, STATUS_BADGES } from "../calendar-constants";
import type { CalendarEvent } from "@/lib/types/crm";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Plus,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

// ─── Event Row ──────────────────────────────────────────────────

function ContactEventRow({ event }: { event: CalendarEvent }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.meeting;
  const Icon = config.icon;
  const statusBadge = STATUS_BADGES[event.status];
  const isPast = new Date(event.start_at) < new Date();
  const isOverdue = event.status === "scheduled" && isPast;

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3 transition-colors hover:shadow-sm",
        isOverdue && "border-amber-300 dark:border-amber-700"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{event.title}</p>
            {isOverdue && (
              <span className="shrink-0 flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" /> Overdue
              </span>
            )}
            {event.is_auto_created && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                Auto
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span>{formatDate(event.start_at)}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.is_all_day
                ? "All day"
                : `${formatTime(event.start_at)} – ${formatTime(event.end_at)}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>

          {event.description && (
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", config.color)}>
              {config.label}
            </span>
            {statusBadge && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusBadge.className)}>
                {statusBadge.label}
              </span>
            )}
            {event.outcome && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  event.outcome === "positive" && "bg-green-50 text-green-600 dark:bg-green-900/20",
                  event.outcome === "neutral" && "bg-gray-100 text-gray-500 dark:bg-gray-800",
                  event.outcome === "negative" && "bg-red-50 text-red-600 dark:bg-red-900/20"
                )}
              >
                {event.outcome}
              </span>
            )}
            {event.meeting_url && (
              <a
                href={event.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Video className="w-3 h-3" /> Join
              </a>
            )}
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatRelativeTime(event.start_at)}
        </span>
      </div>
    </div>
  );
}

// ─── CalendarTab ────────────────────────────────────────────────

interface CalendarTabProps {
  contactId: string;
}

export function CalendarTab({ contactId }: CalendarTabProps) {
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const { data, isLoading, error } = useCalendarEvents({ contact_id: contactId });
  const events: CalendarEvent[] = data?.items ?? [];

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const sorted = [...events].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    return {
      upcoming: sorted.filter((e) => new Date(e.start_at) >= now || (e.status === "scheduled")),
      past: sorted.filter((e) => new Date(e.start_at) < now && e.status !== "scheduled").reverse(),
    };
  }, [events]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={80} className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-sm font-medium">Failed to load calendar events</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="No calendar events"
          description="Schedule meetings, follow-ups, and calls with this contact."
          action={{
            label: "Schedule Event",
            onClick: () => openDialog("create-event", { contact_id: contactId }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => openDialog("create-event", { contact_id: contactId })}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="w-3 h-3" /> Schedule Event
        </button>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Upcoming & Scheduled
          </h3>
          <div className="space-y-2">
            {upcoming.map((ev) => (
              <ContactEventRow key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Past Events
          </h3>
          <div className="space-y-2">
            {past.map((ev) => (
              <ContactEventRow key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
