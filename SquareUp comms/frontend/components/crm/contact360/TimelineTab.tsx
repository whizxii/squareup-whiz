"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/format";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import type { Activity, ActivityType } from "@/lib/types/crm";
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
  MousePointer,
  FormInput,
  Eye,
  MessageSquarePlus,
  Filter,
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
};

// ─── Filter chips ───────────────────────────────────────────────

const FILTER_OPTIONS: { type: ActivityType | "all"; label: string }[] = [
  { type: "all", label: "All" },
  { type: "call", label: "Calls" },
  { type: "email", label: "Emails" },
  { type: "meeting", label: "Meetings" },
  { type: "note", label: "Notes" },
  { type: "deal_update", label: "Deals" },
  { type: "agent_action", label: "AI" },
  { type: "recording", label: "Recordings" },
];

// ─── Timeline Item ──────────────────────────────────────────────

function TimelineItem({ activity }: { activity: Activity }) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-3 group">
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            config.color
          )}
        >
          {config.icon}
        </div>
        <div className="w-px flex-1 bg-border group-last:bg-transparent mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {activity.title || config.label}
            </p>
            {activity.content && (
              <p
                className={cn(
                  "text-[11px] text-muted-foreground mt-0.5 leading-relaxed",
                  !expanded && "line-clamp-2"
                )}
              >
                {activity.content}
              </p>
            )}
            {activity.content && activity.content.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-primary hover:underline mt-0.5"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>

        {/* Timestamp + performer */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(activity.created_at)}
          </span>
          {activity.performer_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">
                &middot;
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  activity.performer_type === "agent"
                    ? "text-blue-500 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {activity.performer_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Tab ───────────────────────────────────────────────

interface TimelineTabProps {
  activities: Activity[];
  contactId: string;
}

export function TimelineTab({ activities, contactId }: TimelineTabProps) {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const openDialog = useCRMUIStore((s) => s.openDialog);

  const filtered = useMemo(() => {
    const sorted = [...activities].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (filter === "all") return sorted;
    return sorted.filter((a) => a.type === filter);
  }, [activities, filter]);

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
              : `No ${filter} activities found.`
          }
          action={{
            label: "Log Activity",
            onClick: () =>
              openDialog("log-activity", { contact_id: contactId }),
          }}
          className="min-h-[200px]"
        />
      ) : (
        <div className="space-y-0">
          {filtered.map((activity) => (
            <TimelineItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {/* Floating log activity button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() =>
            openDialog("log-activity", { contact_id: contactId })
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shadow-sm transition-colors"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Log Activity
        </button>
      </div>
    </div>
  );
}
