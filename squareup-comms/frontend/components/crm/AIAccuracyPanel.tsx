"use client";

/**
 * AIAccuracyPanel — displays AI feedback accuracy metrics, including
 * overall approval rate, per-action-type breakdown, and weekly trend.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAIAccuracyMetrics } from "@/lib/hooks/use-crm-queries";

// ─── Helpers ──────────────────────────────────────────────────────

function pctLabel(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function trendDirection(
  trend: Array<{ week: string; approval_rate: number }>,
): "up" | "down" | "flat" {
  if (trend.length < 2) return "flat";
  const recent = trend[trend.length - 1].approval_rate;
  const previous = trend[trend.length - 2].approval_rate;
  const delta = recent - previous;
  if (delta > 0.02) return "up";
  if (delta < -0.02) return "down";
  return "flat";
}

// ─── Micro-bar chart for weekly trend ─────────────────────────────

function TrendBars({
  trend,
}: {
  trend: Array<{ week: string; total: number; approval_rate: number }>;
}) {
  const maxTotal = Math.max(...trend.map((t) => t.total), 1);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {trend.map((w) => {
        const height = Math.max((w.total / maxTotal) * 100, 8);
        const approvalPct = Math.round(w.approval_rate * 100);
        const color =
          approvalPct >= 80
            ? "bg-green-500"
            : approvalPct >= 60
              ? "bg-amber-500"
              : "bg-red-500";
        return (
          <div
            key={w.week}
            className={cn("w-2.5 rounded-t transition-all", color)}
            style={{ height: `${height}%` }}
            title={`${w.week}: ${w.total} ratings, ${approvalPct}% positive`}
          />
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function AIAccuracyPanel() {
  const { data: metrics, isLoading } = useAIAccuracyMetrics();

  const trend = useMemo(() => {
    if (!metrics?.trend) return "flat" as const;
    return trendDirection(metrics.trend);
  }, [metrics?.trend]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <Skeleton width={120} height={14} className="rounded" />
        <div className="flex items-center gap-4">
          <Skeleton width={60} height={28} className="rounded" />
          <Skeleton width={60} height={28} className="rounded" />
          <Skeleton width={60} height={28} className="rounded" />
        </div>
      </div>
    );
  }

  if (!metrics || metrics.total === 0) {
    return null; // Hide panel when no feedback data exists
  }

  const approvalPct = Math.round(metrics.approval_rate * 100);
  const actionTypes = Object.entries(metrics.by_action_type);
  const trendData = metrics.trend ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-3 space-y-3"
    >
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">
            AI Accuracy
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {metrics.total} ratings
        </span>
      </div>

      {/* KPI row */}
      <div className="flex items-center gap-4">
        {/* Approval rate */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-lg font-bold",
              approvalPct >= 80
                ? "text-green-600 dark:text-green-400"
                : approvalPct >= 60
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400",
            )}
          >
            {approvalPct}%
          </span>
          {trend === "up" && (
            <TrendingUp className="w-3 h-3 text-green-500" />
          )}
          {trend === "down" && (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          {trend === "flat" && (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
        </div>

        {/* Thumbs up / down counts */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
            <ThumbsUp className="w-3 h-3" />
            {metrics.thumbs_up}
          </span>
          <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400">
            <ThumbsDown className="w-3 h-3" />
            {metrics.thumbs_down}
          </span>
        </div>

        {/* Micro trend chart */}
        {trendData.length > 1 && (
          <div className="ml-auto">
            <TrendBars trend={trendData} />
          </div>
        )}
      </div>

      {/* Per-action-type breakdown (show top 4) */}
      {actionTypes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
            By action type
          </p>
          {actionTypes.slice(0, 4).map(([type, data]) => (
            <div
              key={type}
              className="flex items-center justify-between text-[10px]"
            >
              <span className="text-muted-foreground capitalize">
                {type.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      data.approval_rate >= 0.8
                        ? "bg-green-500"
                        : data.approval_rate >= 0.6
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                    style={{ width: `${Math.round(data.approval_rate * 100)}%` }}
                  />
                </div>
                <span className="font-medium text-foreground w-8 text-right">
                  {pctLabel(data.approval_rate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
