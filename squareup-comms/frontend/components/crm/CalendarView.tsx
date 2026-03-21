"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useCalendarEvents,
  useUpcomingEvents,
} from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatDate, formatTime, APP_LOCALE, APP_TIMEZONE } from "@/lib/format";
import { EVENT_TYPE_CONFIG, STATUS_BADGES } from "./calendar-constants";
import type { CalendarEvent } from "@/lib/types/crm";
import { MeetingPrepPanel } from "@/components/crm/MeetingPrepPanel";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Video,
  AlertTriangle,
  XCircle,
  Sparkles,
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ViewMode = "month" | "week" | "agenda";

// ─── Helpers ────────────────────────────────────────────────────

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  // Next month leading days
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function dateToISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Event Card ─────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.meeting;
  const Icon = config.icon;
  const statusBadge = STATUS_BADGES[event.status];

  return (
    <div className="rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{event.title}</p>
            {event.is_auto_created && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                Auto
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
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
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
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
      </div>
    </div>
  );
}

// ─── Month Grid ─────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  events,
  onSelectDate,
  selectedDate,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  selectedDate: Date | null;
}) {
  const today = new Date();
  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = dateToISODate(new Date(ev.start_at));
      const list = map.get(key) ?? [];
      map.set(key, [...list, ev]);
    }
    return map;
  }, [events]);

  return (
    <div className="flex-1">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 flex-1">
        {days.map(({ date, isCurrentMonth }) => {
          const key = dateToISODate(date);
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(date)}
              className={cn(
                "min-h-[80px] p-1 border-b border-r border-border text-left transition-colors",
                !isCurrentMonth && "bg-muted/30",
                isSelected && "bg-primary/5 ring-1 ring-primary/20",
                "hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                  isToday && "bg-primary text-primary-foreground font-bold",
                  !isCurrentMonth && "text-muted-foreground/50"
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.meeting;
                  return (
                    <div
                      key={ev.id}
                      className={cn("text-[9px] px-1 py-0.5 rounded truncate font-medium", cfg.color)}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda View ────────────────────────────────────────────────

function AgendaView({ events }: { events: CalendarEvent[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const sorted = [...events].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    for (const ev of sorted) {
      const key = dateToISODate(new Date(ev.start_at));
      const list = map.get(key) ?? [];
      map.set(key, [...list, ev]);
    }
    return Array.from(map.entries());
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="No events in this period"
          description="Create your first event to get started."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
      {grouped.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
            {formatDate(dateKey)}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Selected Day Detail ────────────────────────────────────────

function DayDetail({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  const [prepEventId, setPrepEventId] = useState<string | null>(null);

  const dayEvents = useMemo(() => {
    const key = dateToISODate(date);
    return events.filter((ev) => dateToISODate(new Date(ev.start_at)) === key);
  }, [date, events]);

  return (
    <div className="w-80 border-l border-border bg-card p-4 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {date.toLocaleDateString(APP_LOCALE, { weekday: "long", month: "short", day: "numeric", timeZone: APP_TIMEZONE })}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <XCircle className="w-4 h-4" />
        </button>
      </div>
      {dayEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No events this day.</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((ev) => (
            <div key={ev.id} className="space-y-2">
              <EventCard event={ev} />
              <button
                onClick={() => setPrepEventId(prepEventId === ev.id ? null : ev.id)}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-lg border transition-colors",
                  prepEventId === ev.id
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Sparkles className="w-3 h-3" />
                {prepEventId === ev.id ? "Hide Meeting Prep" : "AI Meeting Prep"}
              </button>
              {prepEventId === ev.id && (
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                  <MeetingPrepPanel eventId={ev.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upcoming Sidebar ───────────────────────────────────────────

function UpcomingSidebar({ onCreateEvent }: { onCreateEvent: () => void }) {
  const { data, isLoading } = useUpcomingEvents();
  const events = data ?? [];

  return (
    <div className="w-72 border-l border-border bg-card/50 p-4 overflow-y-auto scrollbar-thin hidden xl:block">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Upcoming
        </h3>
        <button
          onClick={onCreateEvent}
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={60} className="rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <p className="text-xs text-muted-foreground">No upcoming events.</p>
      )}

      {!isLoading && events.length > 0 && (
        <div className="space-y-2">
          {events.slice(0, 10).map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.meeting;
            const Icon = cfg.icon;
            return (
              <div key={ev.id} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", cfg.color)}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{ev.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(ev.start_at)} {formatTime(ev.start_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main CalendarView ──────────────────────────────────────────

export function CalendarView() {
  const openDialog = useCRMUIStore((s) => s.openDialog);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build date range for query
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start_date: dateToISODate(start), end_date: dateToISODate(end) };
    }
    const weekDays = getWeekDays(currentDate);
    return {
      start_date: dateToISODate(weekDays[0]),
      end_date: dateToISODate(weekDays[6]),
    };
  }, [viewMode, year, month, currentDate]);

  const { data, isLoading, error } = useCalendarEvents(dateRange);
  const events: CalendarEvent[] = data?.items ?? [];

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
    setSelectedDate(null);
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
    setSelectedDate(null);
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  }, []);

  const handleCreateEvent = useCallback(() => {
    openDialog("create-event", selectedDate ? { date: dateToISODate(selectedDate) } : undefined);
  }, [openDialog, selectedDate]);

  const headerLabel = viewMode === "month"
    ? `${MONTHS[month]} ${year}`
    : (() => {
        const weekDays = getWeekDays(currentDate);
        return `${formatDate(weekDays[0].toISOString())} – ${formatDate(weekDays[6].toISOString())}`;
      })();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold ml-2">{headerLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggles */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["month", "week", "agenda"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setSelectedDate(null); }}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-medium transition-colors capitalize",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreateEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Event
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {error ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-medium">Failed to load events</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "An unexpected error occurred."}
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex-1 p-6 grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} height={80} className="rounded-lg" />
              ))}
            </div>
          ) : viewMode === "agenda" ? (
            <AgendaView events={events} />
          ) : (
            <MonthGrid
              year={year}
              month={month}
              events={events}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
        </div>

        {/* Day detail panel */}
        {selectedDate && viewMode !== "agenda" && (
          <DayDetail
            date={selectedDate}
            events={events}
            onClose={() => setSelectedDate(null)}
          />
        )}

        {/* Upcoming sidebar (hidden when day detail is shown) */}
        {!selectedDate && (
          <UpcomingSidebar onCreateEvent={handleCreateEvent} />
        )}
      </div>
    </div>
  );
}
