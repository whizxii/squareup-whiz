"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useSequenceEnrollments,
  useUnenrollFromSequence,
} from "@/lib/hooks/use-crm-queries";
import { formatRelativeTime } from "@/lib/format";
import type { SequenceEnrollment } from "@/lib/types/crm";
import {
  Users,
  UserMinus,
  Filter,
  Loader2,
  CheckCircle2,
  MessageSquare,
  XCircle,
  AlertTriangle,
  Play,
} from "lucide-react";

// ─── Status config ──────────────────────────────────────────────

type EnrollmentStatus = SequenceEnrollment["status"];

const STATUS_CONFIG: Record<
  EnrollmentStatus,
  { className: string; label: string; icon: React.ReactNode }
> = {
  active: {
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Active",
    icon: <Play className="w-2.5 h-2.5" />,
  },
  completed: {
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    label: "Completed",
    icon: <CheckCircle2 className="w-2.5 h-2.5" />,
  },
  replied: {
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Replied",
    icon: <MessageSquare className="w-2.5 h-2.5" />,
  },
  unenrolled: {
    className: "bg-muted text-muted-foreground",
    label: "Unenrolled",
    icon: <XCircle className="w-2.5 h-2.5" />,
  },
  bounced: {
    className:
      "bg-destructive/10 text-destructive",
    label: "Bounced",
    icon: <AlertTriangle className="w-2.5 h-2.5" />,
  },
};

const FILTER_OPTIONS: { value: EnrollmentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "replied", label: "Replied" },
  { value: "unenrolled", label: "Unenrolled" },
  { value: "bounced", label: "Bounced" },
];

// ─── Enrollment Row ─────────────────────────────────────────────

function EnrollmentRow({
  enrollment,
  onUnenroll,
  isUnenrolling,
}: {
  enrollment: SequenceEnrollment;
  onUnenroll: (id: string) => void;
  isUnenrolling: boolean;
}) {
  const sc = STATUS_CONFIG[enrollment.status] ?? STATUS_CONFIG.active;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
      {/* Contact avatar placeholder */}
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium shrink-0">
        {(enrollment.contact_name ?? enrollment.contact_id).slice(0, 2).toUpperCase()}
      </div>

      {/* Contact ID + enrolled time */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {enrollment.contact_name ?? enrollment.contact_id}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Enrolled {formatRelativeTime(enrollment.enrolled_at)}
        </p>
      </div>

      {/* Current step */}
      <div className="text-[10px] text-muted-foreground text-center shrink-0 w-14">
        <span className="font-mono">Step {enrollment.current_step}</span>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
          sc.className
        )}
      >
        {sc.icon}
        {sc.label}
      </span>

      {/* Next send time */}
      <div className="text-[10px] text-muted-foreground text-right shrink-0 w-24">
        {enrollment.next_send_at
          ? formatRelativeTime(enrollment.next_send_at)
          : "—"}
      </div>

      {/* Unenroll action */}
      {enrollment.status === "active" && (
        <button
          onClick={() => onUnenroll(enrollment.id)}
          disabled={isUnenrolling}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
          title="Unenroll"
        >
          {isUnenrolling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <UserMinus className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Enrollment List ────────────────────────────────────────────

interface EnrollmentListProps {
  sequenceId: string;
}

export function EnrollmentList({ sequenceId }: EnrollmentListProps) {
  const [statusFilter, setStatusFilter] = useState<
    EnrollmentStatus | "all"
  >("all");
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const apiStatus = statusFilter === "all" ? undefined : statusFilter;
  const { data, isLoading } = useSequenceEnrollments(sequenceId, apiStatus);
  const unenroll = useUnenrollFromSequence();

  const enrollments: SequenceEnrollment[] = useMemo(
    () => data ?? [],
    [data]
  );

  const handleUnenroll = useCallback(
    (enrollmentId: string) => {
      setUnenrollingId(enrollmentId);
      unenroll.mutate(enrollmentId, {
        onSettled: () => setUnenrollingId(null),
      });
    },
    [unenroll]
  );

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={56} className="rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Enrollments ({enrollments.length})
        </p>
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                statusFilter === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {enrollments.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No enrollments"
          description={
            statusFilter === "all"
              ? "No contacts are enrolled in this sequence yet."
              : `No contacts with status "${statusFilter}".`
          }
          className="min-h-[200px]"
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
            <div className="w-7 shrink-0" />
            <div className="flex-1">Contact</div>
            <div className="w-14 text-center shrink-0">Step</div>
            <div className="w-20 shrink-0">Status</div>
            <div className="w-24 text-right shrink-0">Next Send</div>
            <div className="w-8 shrink-0" />
          </div>

          {enrollments.map((enrollment) => (
            <EnrollmentRow
              key={enrollment.id}
              enrollment={enrollment}
              onUnenroll={handleUnenroll}
              isUnenrolling={unenrollingId === enrollment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
