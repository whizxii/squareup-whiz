"use client";

/**
 * CrossDealPatternsPanel — displays AI-detected patterns across deals
 * from the last 90 days (win rate trends, segment performance, cycle times).
 */

import {
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  Target,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCrossDealPatterns } from "@/lib/hooks/use-crm-queries";
import type { CrossDealPattern } from "@/lib/types/crm";

// ─── Severity badge ─────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${style}`}
    >
      {severity}
    </span>
  );
}

// ─── Pattern card ────────────────────────────────────────────────

function PatternCard({ pattern }: { pattern: CrossDealPattern }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{pattern.pattern}</p>
          {pattern.detail && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pattern.detail}
            </p>
          )}
        </div>
      </div>

      {(pattern.impact || pattern.action) && (
        <div className="ml-5.5 flex flex-wrap gap-2 mt-1">
          {pattern.impact && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              <TrendingUp className="w-3 h-3" />
              {pattern.impact}
            </span>
          )}
          {pattern.action && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded">
              <ArrowRight className="w-3 h-3" />
              {pattern.action}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────

export function CrossDealPatternsPanel() {
  const { data, isLoading, error } = useCrossDealPatterns();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton width="100%" height={40} className="rounded-lg" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={56} className="rounded-lg" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={72} className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Sparkles className="w-6 h-6" />}
        title="Error loading patterns"
        description={
          error instanceof Error ? error.message : "Could not load cross-deal patterns"
        }
      />
    );
  }

  if (!data || (data.patterns ?? []).length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="w-6 h-6" />}
        title="No patterns detected yet"
        description="Once you have enough deal activity, AI will surface cross-deal patterns and trends here."
      />
    );
  }

  const patterns = data.patterns ?? [];
  const suggestedActions = data.suggested_actions ?? [];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={data.severity} />
          <p className="text-xs text-muted-foreground">{data.description}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {data.win_rate != null && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-sm font-medium text-green-600">
              <Target className="w-3.5 h-3.5" />
              {data.win_rate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Win Rate</div>
          </div>
        )}
        {data.avg_cycle_days != null && (
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-sm font-medium text-blue-600">
              <Clock className="w-3.5 h-3.5" />
              {data.avg_cycle_days.toFixed(0)}d
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Avg Cycle</div>
          </div>
        )}
        {data.top_segment && (
          <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-sm font-medium text-purple-600">
              <BarChart3 className="w-3.5 h-3.5" />
              {data.top_segment}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Top Segment</div>
          </div>
        )}
      </div>

      {/* Pattern cards */}
      <div className="space-y-2">
        {patterns.map((p, i) => (
          <PatternCard key={i} pattern={p} />
        ))}
      </div>

      {/* Suggested actions */}
      {suggestedActions.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Suggested Actions
          </h4>
          <ul className="space-y-1">
            {suggestedActions.map((action, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-1.5"
              >
                <ArrowRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI reasoning (collapsible) */}
      {data.ai_reasoning && (
        <details className="group">
          <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors">
            View AI reasoning
          </summary>
          <p className="text-[11px] text-muted-foreground/70 mt-1.5 italic leading-relaxed">
            {data.ai_reasoning}
          </p>
        </details>
      )}
    </div>
  );
}
