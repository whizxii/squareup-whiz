"use client";

import { useTaskActivity } from "@/lib/hooks/use-tasks-queries";
import { formatRelativeTime } from "@/lib/format";
import {
  Plus,
  Pencil,
  UserPlus,
  CheckCircle2,
  MessageCircle,
  Trash2,
  Activity,
  Loader2,
} from "lucide-react";
import type { TaskActivityAction } from "@/lib/types/tasks";

// ─── Activity icon & color mapping ──────────────────────────────

const ACTION_CONFIG: Record<
  TaskActivityAction,
  { icon: React.ReactNode; color: string; label: string }
> = {
  created: {
    icon: <Plus className="w-3 h-3" />,
    color: "bg-green-500",
    label: "created this task",
  },
  updated: {
    icon: <Pencil className="w-3 h-3" />,
    color: "bg-blue-500",
    label: "updated",
  },
  assigned: {
    icon: <UserPlus className="w-3 h-3" />,
    color: "bg-purple-500",
    label: "reassigned",
  },
  completed: {
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: "bg-green-600",
    label: "completed this task",
  },
  commented: {
    icon: <MessageCircle className="w-3 h-3" />,
    color: "bg-amber-500",
    label: "added a comment",
  },
  deleted: {
    icon: <Trash2 className="w-3 h-3" />,
    color: "bg-red-500",
    label: "deleted this task",
  },
};

// ─── Description builder ────────────────────────────────────────

function buildDescription(
  action: TaskActivityAction,
  fieldChanged: string | null,
  oldValue: string | null,
  newValue: string | null
): string {
  const config = ACTION_CONFIG[action];
  if (!config) return action;

  if (action === "updated" && fieldChanged) {
    const fieldLabel = fieldChanged.replace(/_/g, " ");
    if (oldValue && newValue) {
      return `changed ${fieldLabel} from "${oldValue}" to "${newValue}"`;
    }
    if (newValue) {
      return `set ${fieldLabel} to "${newValue}"`;
    }
    return `updated ${fieldLabel}`;
  }

  if (action === "assigned" && newValue) {
    return `assigned task to ${newValue}`;
  }

  return config.label;
}

// ─── ActivityTimeline ───────────────────────────────────────────

interface ActivityTimelineProps {
  taskId: string;
}

export function ActivityTimeline({ taskId }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useTaskActivity(taskId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading activity...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
        <Activity className="w-4 h-4" />
        No activity yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-3">
        {activities.map((entry) => {
          const config = ACTION_CONFIG[entry.action as TaskActivityAction] ??
            ACTION_CONFIG.updated;
          const description = buildDescription(
            entry.action as TaskActivityAction,
            entry.field_changed,
            entry.old_value,
            entry.new_value
          );

          return (
            <div key={entry.id} className="flex gap-3 relative">
              {/* Dot */}
              <div
                className={`shrink-0 w-[22px] h-[22px] rounded-full ${config.color} text-white flex items-center justify-center z-10`}
              >
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{entry.user_id}</span>{" "}
                  <span className="text-muted-foreground">{description}</span>
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
