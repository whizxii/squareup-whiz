"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/format";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useContactEmails } from "@/lib/hooks/use-crm-queries";
import type {
  Activity,
  ActivityType,
  CallRecording,
  CalendarEvent,
  ContactNote,
  Email,
} from "@/lib/types/crm";
import {
  PhoneCall,
  Mail,
  Calendar,
  FileText,
  TrendingUp,
  Bot,
  Clock,
  Zap,
  Mic,
  RefreshCw,
  BarChart3,
  CalendarCheck,
  MailOpen,
  FormInput,
  Eye,
  MessageSquarePlus,
  Filter,
  Pin,
  CheckCircle,
  XCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

// ─── Activity type config ───────────────────────────────────────

interface ActivityTypeConfig {
  icon: React.ReactNode;
  label: string;
  color: string;
}

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  call: {
    icon: <PhoneCall className="w-3.5 h-3.5" />,
    label: "Call",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  email: {
    icon: <Mail className="w-3.5 h-3.5" />,
    label: "Email",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  meeting: {
    icon: <Calendar className="w-3.5 h-3.5" />,
    label: "Meeting",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  note: {
    icon: <FileText className="w-3.5 h-3.5" />,
    label: "Note",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  deal_update: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: "Deal",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  agent_action: {
    icon: <Bot className="w-3.5 h-3.5" />,
    label: "AI Agent",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  follow_up: {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "Follow-up",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  recording: {
    icon: <Mic className="w-3.5 h-3.5" />,
    label: "Recording",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  enrichment: {
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    label: "Enrichment",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  score_update: {
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    label: "Score",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  calendar_event: {
    icon: <CalendarCheck className="w-3.5 h-3.5" />,
    label: "Calendar",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  email_sent: {
    icon: <Mail className="w-3.5 h-3.5" />,
    label: "Sent",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  email_received: {
    icon: <Mail className="w-3.5 h-3.5" />,
    label: "Received",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  email_opened: {
    icon: <MailOpen className="w-3.5 h-3.5" />,
    label: "Opened",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  form_submitted: {
    icon: <FormInput className="w-3.5 h-3.5" />,
    label: "Form",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  page_visited: {
    icon: <Eye className="w-3.5 h-3.5" />,
    label: "Visit",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
  workflow_triggered: {
    icon: <Zap className="w-3.5 h-3.5" />,
    label: "Workflow",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  chat_mention: {
    icon: <MessageSquarePlus className="w-3.5 h-3.5" />,
    label: "Chat Mention",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  chat_deal_signal: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: "Deal Signal",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  chat_action_item: {
    icon: <Bot className="w-3.5 h-3.5" />,
    label: "Action Item",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  chat_meeting_request: {
    icon: <Calendar className="w-3.5 h-3.5" />,
    label: "Meeting Request",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  chat_follow_up: {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "Chat Follow-up",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

// ─── Unified entry type ─────────────────────────────────────────

type EntryKind = "activity" | "recording" | "calendar" | "note" | "email";

interface UnifiedEntry {
  id: string;
  kind: EntryKind;
  ts: string;
  activity?: Activity;
  recording?: CallRecording;
  calendarEvent?: CalendarEvent;
  note?: ContactNote;
  email?: Email;
}

type FilterOption = ActivityType | "all" | "recordings" | "calendar" | "notes" | "emails";

// ─── Filter chips ───────────────────────────────────────────────

const FILTER_OPTIONS: { type: FilterOption; label: string }[] = [
  { type: "all", label: "All" },
  { type: "call", label: "Calls" },
  { type: "email", label: "Emails" },
  { type: "meeting", label: "Meetings" },
  { type: "notes", label: "Notes" },
  { type: "deal_update", label: "Deals" },
  { type: "agent_action", label: "AI" },
  { type: "recordings", label: "Recordings" },
  { type: "calendar", label: "Events" },
];

// ─── Item renderers ─────────────────────────────────────────────

function ActivityItem({ activity }: { activity: Activity }) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.color)}>
          {config.icon}
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <p className="text-xs font-medium">{activity.title || config.label}</p>
        {activity.content && (
          <p className={cn("text-[11px] text-muted-foreground mt-0.5 leading-relaxed", !expanded && "line-clamp-2")}>
            {activity.content}
          </p>
        )}
        {activity.content && activity.content.length > 120 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary hover:underline mt-0.5">
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(activity.created_at)}</span>
          {activity.performer_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">&middot;</span>
              <span className={cn("text-[10px]", activity.performer_type === "agent" ? "text-blue-500 font-medium" : "text-muted-foreground")}>
                {activity.performer_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordingItem({ recording }: { recording: CallRecording }) {
  const sentimentColor =
    recording.ai_sentiment === "positive" ? "text-green-600 dark:text-green-400" :
    recording.ai_sentiment === "negative" ? "text-red-600 dark:text-red-400" :
    "text-muted-foreground";

  const durationMin = Math.round((recording.duration_seconds ?? 0) / 60);

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <Mic className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">{recording.title}</p>
          {durationMin > 0 && (
            <span className="text-[10px] text-muted-foreground">· {durationMin}m</span>
          )}
          {recording.ai_sentiment && (
            <span className={cn("text-[10px] font-medium capitalize", sentimentColor)}>
              · {recording.ai_sentiment}
            </span>
          )}
        </div>
        {recording.ai_summary && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {recording.ai_summary}
          </p>
        )}
        {recording.ai_action_items.length > 0 && (
          <p className="text-[10px] text-primary mt-0.5">
            {recording.ai_action_items.length} action item{recording.ai_action_items.length !== 1 ? "s" : ""}
          </p>
        )}
        <span className="text-[10px] text-muted-foreground mt-1.5 block">{formatRelativeTime(recording.created_at)}</span>
      </div>
    </div>
  );
}

function CalendarItem({ event }: { event: CalendarEvent }) {
  const outcomeIcon =
    event.outcome === "positive" ? <CheckCircle className="w-3 h-3 text-green-500" /> :
    event.outcome === "negative" ? <XCircle className="w-3 h-3 text-red-500" /> :
    event.outcome === "neutral" ? <MinusCircle className="w-3 h-3 text-yellow-500" /> :
    null;

  const isUpcoming = new Date(event.start_at) > new Date();

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
          <CalendarCheck className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium">{event.title}</p>
          {outcomeIcon}
          {isUpcoming && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              upcoming
            </span>
          )}
        </div>
        {event.outcome_notes && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {event.outcome_notes}
          </p>
        )}
        <span className="text-[10px] text-muted-foreground mt-1.5 block capitalize">
          {event.event_type.replace("_", " ")} · {formatRelativeTime(event.start_at)}
        </span>
      </div>
    </div>
  );
}

function NoteItem({ note }: { note: ContactNote }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <FileText className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium">Note</p>
          {note.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
        </div>
        <p className={cn("text-[11px] text-muted-foreground mt-0.5 leading-relaxed", !expanded && "line-clamp-2")}>
          {note.content}
        </p>
        {note.content.length > 120 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary hover:underline mt-0.5">
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
        <span className="text-[10px] text-muted-foreground mt-1.5 block">{formatRelativeTime(note.created_at)}</span>
      </div>
    </div>
  );
}

function EmailItem({ email }: { email: Email }) {
  const isOutbound = email.direction === "outbound";

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Mail className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-1.5">
          {isOutbound
            ? <ArrowUpRight className="w-3 h-3 text-blue-500 shrink-0" />
            : <ArrowDownLeft className="w-3 h-3 text-green-500 shrink-0" />}
          <p className="text-xs font-medium truncate">{email.subject || "(no subject)"}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground capitalize">{email.status}</span>
          <span className="text-[10px] text-muted-foreground/40">&middot;</span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(email.sent_at ?? email.received_at ?? email.created_at ?? "")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Tab ───────────────────────────────────────────────

interface TimelineTabProps {
  activities: Activity[];
  recordings: CallRecording[];
  calendarEvents: CalendarEvent[];
  notes: ContactNote[];
  contactId: string;
}

export function TimelineTab({
  activities,
  recordings,
  calendarEvents,
  notes,
  contactId,
}: TimelineTabProps) {
  const [filter, setFilter] = useState<FilterOption>("all");
  const openDialog = useCRMUIStore((s) => s.openDialog);

  const { data: emailsData } = useContactEmails(contactId);
  const emails: Email[] = emailsData ?? [];

  const allEntries = useMemo((): UnifiedEntry[] => {
    const entries: UnifiedEntry[] = [
      ...activities.map((a): UnifiedEntry => ({ id: `act-${a.id}`, kind: "activity", ts: a.created_at, activity: a })),
      ...recordings.map((r): UnifiedEntry => ({ id: `rec-${r.id}`, kind: "recording", ts: r.created_at, recording: r })),
      ...calendarEvents.map((e): UnifiedEntry => ({ id: `cal-${e.id}`, kind: "calendar", ts: e.start_at, calendarEvent: e })),
      ...notes.map((n): UnifiedEntry => ({ id: `note-${n.id}`, kind: "note", ts: n.created_at, note: n })),
      ...emails.map((e): UnifiedEntry => ({
        id: `email-${e.id}`,
        kind: "email",
        ts: e.sent_at ?? e.received_at ?? e.created_at ?? "",
        email: e,
      })),
    ];
    return entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [activities, recordings, calendarEvents, notes, emails]);

  const filtered = useMemo(() => {
    if (filter === "all") return allEntries;
    if (filter === "recordings") return allEntries.filter((e) => e.kind === "recording");
    if (filter === "calendar") return allEntries.filter((e) => e.kind === "calendar");
    if (filter === "notes") return allEntries.filter((e) => e.kind === "note");
    if (filter === "emails") return allEntries.filter((e) => e.kind === "email");
    // activity type filter
    return allEntries.filter(
      (e) => e.kind === "activity" && e.activity?.type === filter
    );
  }, [allEntries, filter]);

  return (
    <div className="p-6 space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => setFilter(opt.type)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
              filter === opt.type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-6 h-6" />}
          title="No activity yet"
          description={
            filter === "all"
              ? "Activities will appear here as you interact with this contact."
              : "Nothing found for this filter."
          }
          action={{
            label: "Log Activity",
            onClick: () => openDialog("log-activity", { contact_id: contactId }),
          }}
          className="min-h-[200px]"
        />
      ) : (
        <div className="space-y-0">
          {filtered.map((entry) => {
            if (entry.kind === "activity" && entry.activity) {
              return <ActivityItem key={entry.id} activity={entry.activity} />;
            }
            if (entry.kind === "recording" && entry.recording) {
              return <RecordingItem key={entry.id} recording={entry.recording} />;
            }
            if (entry.kind === "calendar" && entry.calendarEvent) {
              return <CalendarItem key={entry.id} event={entry.calendarEvent} />;
            }
            if (entry.kind === "note" && entry.note) {
              return <NoteItem key={entry.id} note={entry.note} />;
            }
            if (entry.kind === "email" && entry.email) {
              return <EmailItem key={entry.id} email={entry.email} />;
            }
            return null;
          })}
        </div>
      )}

      {/* Floating log activity button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => openDialog("log-activity", { contact_id: contactId })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shadow-sm transition-colors"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Log Activity
        </button>
      </div>
    </div>
  );
}
