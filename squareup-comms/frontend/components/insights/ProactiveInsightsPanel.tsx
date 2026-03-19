"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  TrendingDown,
  UserX,
  Clock,
  CalendarX,
  CheckCircle,
  Bell,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useInsightsStore, type ProactiveInsight } from "@/lib/stores/insights-store";

/* ------------------------------------------------------------------ */
/*  Icon + color mapping                                               */
/* ------------------------------------------------------------------ */

const INSIGHT_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; color: string; bg: string }
> = {
  deal_stale: {
    icon: TrendingDown,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  deal_at_risk: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  contact_cold: {
    icon: UserX,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  task_due_soon: {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  task_overdue: {
    icon: CalendarX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  missing_follow_up: {
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
};

const SEVERITY_STYLES: Record<string, { border: string; badge: string }> = {
  critical: {
    border: "border-red-500/30",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  warning: {
    border: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  info: {
    border: "border-blue-500/30",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

function getConfig(type: string) {
  return (
    INSIGHT_CONFIG[type] ?? {
      icon: Info,
      color: "text-muted-foreground",
      bg: "bg-muted",
    }
  );
}

function getSeverityStyle(severity: string) {
  return (
    SEVERITY_STYLES[severity] ?? {
      border: "border-border",
      badge: "bg-muted text-muted-foreground",
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Insight Card                                                       */
/* ------------------------------------------------------------------ */

function InsightCard({
  insight,
  onDismiss,
}: {
  insight: ProactiveInsight;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = getConfig(insight.type);
  const severity = getSeverityStyle(insight.severity);
  const Icon = config.icon;

  const aiReasoning = insight.metadata?.ai_reasoning as string | undefined;
  const suggestedActions = insight.metadata?.suggested_actions as string[] | undefined;
  const hasAI = !!(aiReasoning || (suggestedActions && suggestedActions.length > 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "group relative rounded-xl border transition-colors",
        insight.dismissed
          ? "opacity-50 border-border bg-muted/20"
          : `${severity.border} bg-card hover:bg-accent/30`
      )}
    >
      <div className="flex items-start gap-2.5 p-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            config.bg
          )}
        >
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider",
                severity.badge
              )}
            >
              {insight.severity}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {insight.entity_type}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-tight mb-1">
            {insight.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {insight.description}
          </p>

          {/* AI expand toggle */}
          {hasAI && !insight.dismissed && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-[10px] text-sq-agent hover:text-sq-agent/80 transition-colors"
            >
              <Lightbulb className="w-3 h-3" />
              AI reasoning
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {!insight.dismissed && (
          <button
            type="button"
            onClick={onDismiss}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all shrink-0"
            title="Dismiss"
          >
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* AI reasoning panel */}
      <AnimatePresence>
        {expanded && hasAI && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-2">
              {aiReasoning && (
                <div className="bg-sq-agent/5 rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-sq-agent mb-0.5 uppercase tracking-wider">
                    AI Analysis
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiReasoning}
                  </p>
                </div>
              )}
              {suggestedActions && suggestedActions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    Suggested Actions
                  </p>
                  <ul className="space-y-1">
                    {suggestedActions.map((action, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-foreground"
                      >
                        <ArrowRight className="w-3 h-3 text-sq-agent shrink-0 mt-0.5" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

export default function ProactiveInsightsPanel() {
  const { insights, panelOpen, unreadCount, dismissInsight, dismissAll, setPanel } =
    useInsightsStore();

  const activeInsights = insights.filter((i) => !i.dismissed);
  const dismissedInsights = insights.filter((i) => i.dismissed);

  if (!panelOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-4 top-16 bottom-4 w-96 z-40 flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-sq-agent" />
          <h3 className="text-sm font-semibold">Proactive Insights</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sq-agent/10 text-sq-agent">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeInsights.length > 0 && (
            <button
              type="button"
              onClick={dismissAll}
              className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors"
            >
              Dismiss all
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel(false)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No insights yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Proactive alerts will appear here when we detect stale deals,
              missed follow-ups, or upcoming deadlines.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {activeInsights.map((insight) => (
              <InsightCard
                key={insight.entity_id}
                insight={insight}
                onDismiss={() => dismissInsight(insight.entity_id)}
              />
            ))}
            {dismissedInsights.length > 0 && activeInsights.length > 0 && (
              <div
                key="divider"
                className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pt-2"
              >
                Dismissed
              </div>
            )}
            {dismissedInsights.map((insight) => (
              <InsightCard
                key={insight.entity_id}
                insight={insight}
                onDismiss={() => {}}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
