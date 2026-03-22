"use client";

/**
 * AIActivityView — unified "glass box" feed showing all AI actions
 * (automation logs) and AI insights in a single chronological view.
 * Replaces the old direct-fetch AutomationFeed with React Query hooks.
 */

import { useState, useMemo } from "react";
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
  Lightbulb,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useAutomationLogs,
  useInsightsList,
  usePendingReviewCount,
  useSubmitFeedback,
} from "@/lib/hooks/use-crm-queries";
import { crmApi } from "@/lib/api/crm-api";
import { useQueryClient } from "@tanstack/react-query";
import { AutomationReviewDialog } from "./AutomationReviewDialog";
import { AIAccuracyPanel } from "./AIAccuracyPanel";
import type {
  AutomationLogEntry,
  AutomationLogStatus,
  AIInsightEntry,
  AIFeedbackRating,
  AIFeedbackSourceType,
} from "@/lib/types/crm";

// ─── Filter tabs ──────────────────────────────────────────────────

type FeedFilter = "all" | "actions" | "insights" | "needs_review";

const FILTER_TABS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "actions", label: "Actions" },
  { value: "insights", label: "Insights" },
  { value: "needs_review", label: "Needs Review" },
];

// ─── Action type metadata ─────────────────────────────────────────

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

// ─── Severity style map ───────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  info: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  critical: "text-red-600 dark:text-red-400 bg-red-500/10",
};

// ─── Sub-components ───────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationLogStatus }) {
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
        cfg.cls,
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

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Feedback buttons ─────────────────────────────────────────────

function FeedbackButtons({
  sourceType,
  sourceId,
  confidence,
  actionType,
  onSubmit,
}: {
  sourceType: "automation_log" | "insight";
  sourceId: string;
  confidence?: number;
  actionType?: string;
  onSubmit: (params: {
    source_type: AIFeedbackSourceType;
    source_id: string;
    rating: AIFeedbackRating;
    ai_confidence?: number;
    action_type?: string;
  }) => void;
}) {
  const [submitted, setSubmitted] = useState<AIFeedbackRating | null>(null);

  function handleClick(rating: AIFeedbackRating) {
    if (submitted) return;
    setSubmitted(rating);
    onSubmit({
      source_type: sourceType,
      source_id: sourceId,
      rating,
      ai_confidence: confidence,
      action_type: actionType,
    });
  }

  if (submitted) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-medium",
          submitted === "thumbs_up"
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400",
        )}
      >
        {submitted === "thumbs_up" ? (
          <ThumbsUp className="w-3 h-3" />
        ) : (
          <ThumbsDown className="w-3 h-3" />
        )}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => handleClick("thumbs_up")}
        className="p-0.5 rounded hover:bg-green-500/10 transition-colors"
        title="Helpful"
      >
        <ThumbsUp className="w-3 h-3 text-muted-foreground hover:text-green-600 dark:hover:text-green-400" />
      </button>
      <button
        type="button"
        onClick={() => handleClick("thumbs_down")}
        className="p-0.5 rounded hover:bg-red-500/10 transition-colors"
        title="Not helpful"
      >
        <ThumbsDown className="w-3 h-3 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
      </button>
    </div>
  );
}

// ─── Automation log row ───────────────────────────────────────────

function ActionRow({
  entry,
  onReview,
  onFeedback,
}: {
  entry: AutomationLogEntry;
  onReview: (entry: AutomationLogEntry) => void;
  onFeedback: (params: {
    source_type: AIFeedbackSourceType;
    source_id: string;
    rating: AIFeedbackRating;
    ai_confidence?: number;
    action_type?: string;
  }) => void;
}) {
  const meta = ACTION_META[entry.action_type] ?? {
    label: entry.action_type.replace(/_/g, " "),
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
          {entry.ai_reasoning && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
              {entry.ai_reasoning}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {formatTimestamp(entry.created_at)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <FeedbackButtons
          sourceType="automation_log"
          sourceId={entry.id}
          confidence={entry.confidence}
          actionType={entry.action_type}
          onSubmit={onFeedback}
        />
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

// ─── AI insight row ───────────────────────────────────────────────

function InsightRow({
  insight,
  onDismiss,
  onMarkRead,
  onFeedback,
}: {
  insight: AIInsightEntry;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onFeedback: (params: {
    source_type: AIFeedbackSourceType;
    source_id: string;
    rating: AIFeedbackRating;
    ai_confidence?: number;
    action_type?: string;
  }) => void;
}) {
  const severityStyle =
    SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;

  const typeIcon = {
    deal_coaching: <TrendingUp className="w-3.5 h-3.5" />,
    pipeline_risk: <ShieldAlert className="w-3.5 h-3.5" />,
    relationship_alert: <AlertTriangle className="w-3.5 h-3.5" />,
    enriched_proactive: <Sparkles className="w-3.5 h-3.5" />,
    daily_brief: <Info className="w-3.5 h-3.5" />,
  }[insight.type] ?? <Lightbulb className="w-3.5 h-3.5" />;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "rounded-lg border border-border p-3 space-y-1.5 hover:bg-accent/30 transition-colors",
        !insight.is_read && "ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
              severityStyle,
            )}
          >
            {typeIcon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-foreground leading-snug">
                {insight.title}
              </p>
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                  severityStyle,
                )}
              >
                {insight.severity}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
              {insight.description}
            </p>
            {insight.entity_name && (
              <p className="text-[10px] text-primary mt-0.5">
                {insight.entity_type}: {insight.entity_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <FeedbackButtons
            sourceType="insight"
            sourceId={insight.id}
            actionType={insight.type}
            onSubmit={onFeedback}
          />
          {!insight.is_read && (
            <button
              type="button"
              onClick={() => onMarkRead(insight.id)}
              className="p-1 rounded-md hover:bg-accent transition-colors"
              title="Mark as read"
            >
              <Eye className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(insight.id)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
            title="Dismiss"
          >
            <EyeOff className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Suggested actions */}
      {insight.suggested_actions.length > 0 && (
        <div className="ml-8 flex flex-wrap gap-1.5">
          {insight.suggested_actions.map((action, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded"
            >
              <ArrowRight className="w-2.5 h-2.5" />
              {action}
            </span>
          ))}
        </div>
      )}

      {/* AI reasoning (collapsible) */}
      {insight.ai_reasoning && (
        <details className="ml-8 group">
          <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors">
            View AI reasoning
          </summary>
          <p className="text-[10px] text-muted-foreground/70 mt-1 italic leading-relaxed">
            {insight.ai_reasoning}
          </p>
        </details>
      )}

      <p className="text-[10px] text-muted-foreground/60 ml-8">
        {formatTimestamp(insight.created_at)}
      </p>
    </motion.div>
  );
}

// ─── Unified feed item type ───────────────────────────────────────

type FeedItem =
  | { kind: "action"; data: AutomationLogEntry; timestamp: string }
  | { kind: "insight"; data: AIInsightEntry; timestamp: string };

// ─── Main view ────────────────────────────────────────────────────

export function AIActivityView() {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [reviewTarget, setReviewTarget] = useState<AutomationLogEntry | null>(
    null,
  );

  const queryClient = useQueryClient();
  const submitFeedback = useSubmitFeedback();

  function handleFeedback(params: {
    source_type: AIFeedbackSourceType;
    source_id: string;
    rating: AIFeedbackRating;
    ai_confidence?: number;
    action_type?: string;
  }) {
    submitFeedback.mutate(params);
  }

  // Fetch automation logs — filter by status only for needs_review tab
  const logStatus =
    filter === "needs_review" ? "pending_review" : undefined;
  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useAutomationLogs(logStatus);

  // Fetch insights — skip if filtering to actions only
  const {
    data: insightsData,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useInsightsList(undefined, false);

  // Pending review count for badge
  const { data: pendingData } = usePendingReviewCount();
  const pendingCount = pendingData?.count ?? 0;

  const isLoading = logsLoading || insightsLoading;
  const hasError = logsError || insightsError;

  // Build unified feed sorted by timestamp desc
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    if (filter !== "insights") {
      for (const log of logsData?.logs ?? []) {
        items.push({ kind: "action", data: log, timestamp: log.created_at });
      }
    }

    if (filter !== "actions" && filter !== "needs_review") {
      for (const insight of insightsData?.insights ?? []) {
        items.push({
          kind: "insight",
          data: insight,
          timestamp: insight.created_at,
        });
      }
    }

    // Sort descending by timestamp
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return items;
  }, [filter, logsData, insightsData]);

  // Handlers
  function handleRefresh() {
    refetchLogs();
    refetchInsights();
  }

  async function handleDismissInsight(id: string) {
    try {
      await crmApi.dismissInsight(id);
      await queryClient.invalidateQueries({ queryKey: ["crm", "ai"] });
    } catch (err) {
      console.error("Failed to dismiss insight:", err);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await crmApi.markInsightRead(id);
      await queryClient.invalidateQueries({ queryKey: ["crm", "ai"] });
    } catch (err) {
      console.error("Failed to mark insight as read:", err);
    }
  }

  function handleReviewDone() {
    setReviewTarget(null);
    queryClient.invalidateQueries({ queryKey: ["crm", "automation"] });
  }

  // ─── Loading skeleton ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Skeleton width={140} height={20} className="rounded" />
          <Skeleton width={24} height={24} className="rounded" />
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={72} height={28} className="rounded-full" />
          ))}
        </div>
        <div className="flex-1 px-2 py-1 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={56} className="rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-sq-agent" />
          <span className="text-sm font-semibold">AI Activity</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="p-1 rounded-md hover:bg-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors relative",
              filter === tab.value
                ? "bg-sq-agent text-white"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {tab.label}
            {tab.value === "needs_review" && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Accuracy metrics panel */}
      <div className="px-3 py-1.5">
        <AIAccuracyPanel />
      </div>

      {/* Error */}
      {hasError && (
        <div className="px-4 py-2">
          <p className="text-xs text-red-500">
            {logsError instanceof Error
              ? logsError.message
              : insightsError instanceof Error
                ? insightsError.message
                : "Failed to load AI activity"}
          </p>
        </div>
      )}

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        <AnimatePresence initial={false}>
          {feedItems.length === 0 && !isLoading && (
            <div className="py-12">
              <EmptyState
                icon={<Bot className="w-6 h-6" />}
                title="No AI activity yet"
                description="When AI takes actions or generates insights, they will appear here with full transparency."
              />
            </div>
          )}
          {feedItems.map((item) =>
            item.kind === "action" ? (
              <ActionRow
                key={`action-${item.data.id}`}
                entry={item.data}
                onReview={setReviewTarget}
                onFeedback={handleFeedback}
              />
            ) : (
              <InsightRow
                key={`insight-${item.data.id}`}
                insight={item.data}
                onDismiss={handleDismissInsight}
                onMarkRead={handleMarkRead}
                onFeedback={handleFeedback}
              />
            ),
          )}
        </AnimatePresence>
      </div>

      {/* Review dialog */}
      {reviewTarget && (
        <AutomationReviewDialog
          entry={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onDone={handleReviewDone}
        />
      )}
    </div>
  );
}
