"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  UserPlus,
  TrendingUp,
  Bell,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { AutomationReviewDialog } from "./AutomationReviewDialog";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AutomationLogEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  confidence: number;
  status: "auto_executed" | "pending_review" | "approved" | "rejected";
  performed_by: string;
  result: string | null;
  review_notes: string | null;
  ai_reasoning: string | null;
  source_event: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

/* ------------------------------------------------------------------ */
/*  API helper                                                          */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) return { Authorization: `Bearer ${token}` };
  return { "X-User-Id": getCurrentUserId() };
}

async function fetchLogs(status?: string): Promise<AutomationLogEntry[]> {
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`${API_URL}/api/automation/logs${params}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load automation logs");
  const data = await res.json();
  return data.logs ?? [];
}

/* ------------------------------------------------------------------ */
/*  Action type metadata                                                */
/* ------------------------------------------------------------------ */

const ACTION_META: Record<string, { label: string; icon: React.ReactNode }> = {
  create_contact: {
    label: "Created contact",
    icon: <UserPlus className="w-3.5 h-3.5" />,
  },
  progress_deal: {
    label: "Progressed deal",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  schedule_followup: {
    label: "Scheduled follow-up",
    icon: <Bell className="w-3.5 h-3.5" />,
  },
  update_field: {
    label: "Updated field",
    icon: <Pencil className="w-3.5 h-3.5" />,
  },
};

function StatusBadge({ status }: { status: AutomationLogEntry["status"] }) {
  const cfg = {
    auto_executed: {
      cls: "text-green-600 dark:text-green-400 bg-green-500/10",
      icon: <CheckCircle className="w-3 h-3" />,
      label: "Auto-executed",
    },
    pending_review: {
      cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
      icon: <Clock className="w-3 h-3" />,
      label: "Needs review",
    },
    approved: {
      cls: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
      icon: <CheckCircle className="w-3 h-3" />,
      label: "Approved",
    },
    rejected: {
      cls: "text-red-600 dark:text-red-400 bg-red-500/10",
      icon: <XCircle className="w-3 h-3" />,
      label: "Rejected",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
        cfg.cls
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "text-green-600 dark:text-green-400"
      : pct >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  return (
    <span className={cn("text-[10px] font-mono", color)}>{pct}% conf</span>
  );
}

/* ------------------------------------------------------------------ */
/*  Single log row                                                      */
/* ------------------------------------------------------------------ */

function LogRow({
  entry,
  onReview,
}: {
  entry: AutomationLogEntry;
  onReview: (entry: AutomationLogEntry) => void;
}) {
  const meta = ACTION_META[entry.action_type] ?? {
    label: entry.action_type,
    icon: <Bot className="w-3.5 h-3.5" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-accent/30 rounded-lg transition-colors"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-md bg-sq-agent/10 flex items-center justify-center shrink-0 mt-0.5 text-sq-agent">
          {meta.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground leading-snug">
            {meta.label}{" "}
            <span className="text-sq-agent">{entry.entity_name}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(entry.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <ConfidencePill confidence={entry.confidence} />
        <StatusBadge status={entry.status} />
        {entry.status === "pending_review" && (
          <button
            type="button"
            onClick={() => onReview(entry)}
            className="px-2 py-0.5 rounded-md bg-sq-agent text-white text-[10px] font-semibold hover:bg-sq-agent/80 transition-colors"
          >
            Review
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  AutomationFeed                                                      */
/* ------------------------------------------------------------------ */

export default function AutomationFeed() {
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [reviewTarget, setReviewTarget] = useState<AutomationLogEntry | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogs(filter);
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const FILTERS = [
    { value: undefined, label: "All" },
    { value: "pending_review", label: "Needs review" },
    { value: "auto_executed", label: "Auto-executed" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-sq-agent" />
          <span className="text-sm font-semibold">AI Actions</span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1 rounded-md hover:bg-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground",
              loading && "animate-spin"
            )}
          />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={String(f.value)}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
              filter === f.value
                ? "bg-sq-agent text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 py-2 text-xs text-red-500">{error}</p>
      )}

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        <AnimatePresence initial={false}>
          {logs.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No automation actions yet.
            </p>
          )}
          {logs.map((entry) => (
            <LogRow key={entry.id} entry={entry} onReview={setReviewTarget} />
          ))}
        </AnimatePresence>
      </div>

      {/* Review dialog */}
      {reviewTarget && (
        <AutomationReviewDialog
          entry={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onDone={() => {
            setReviewTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
