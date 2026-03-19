"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface CoachingResult {
  id: string;
  type: string;
  title: string;
  description: string;
  ai_reasoning: string;
  suggested_actions: string[];
  severity: string;
  highlight?: string;
  risk_score?: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  API helper                                                          */
/* ------------------------------------------------------------------ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchDealCoaching(dealId: string): Promise<CoachingResult> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["X-User-Id"] = getCurrentUserId();
  }

  const res = await fetch(
    `${API_URL}/api/insights/deal/${encodeURIComponent(dealId)}/coaching`,
    { headers }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Risk score badge                                                    */
/* ------------------------------------------------------------------ */

function RiskBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70
      ? "text-red-600 dark:text-red-400 bg-red-500/10"
      : pct >= 40
      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
      : "text-green-600 dark:text-green-400 bg-green-500/10";

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1",
        color
      )}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {pct}% risk
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function DealCoachingCard({ dealId }: { dealId: string }) {
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDealCoaching(dealId);
      setCoaching(result);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coaching");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDealCoaching(dealId);
      setCoaching(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh coaching");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={coaching ? () => setOpen((v) => !v) : load}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sq-agent/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-sq-agent" />
          </div>
          <span className="text-sm font-semibold">AI Deal Coaching</span>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          {coaching && !loading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="p-1 rounded-md hover:bg-accent transition-colors"
              title="Refresh coaching"
            >
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          {coaching ? (
            open ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )
          ) : (
            <span className="text-xs text-sq-agent">
              {loading ? "Analyzing…" : "Get coaching"}
            </span>
          )}
        </div>
      </button>

      {/* Error state */}
      {error && (
        <div className="px-4 pb-3 text-xs text-red-500">{error}</div>
      )}

      {/* Expanded coaching content */}
      <AnimatePresence>
        {open && coaching && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
              {/* Highlight + risk score */}
              <div className="flex items-start justify-between gap-2">
                {coaching.highlight ? (
                  <p className="text-xs font-medium text-sq-agent leading-relaxed flex-1">
                    {coaching.highlight}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground flex-1">
                    {coaching.description}
                  </p>
                )}
                {coaching.risk_score !== undefined && (
                  <RiskBadge score={coaching.risk_score} />
                )}
              </div>

              {/* Suggested actions */}
              {coaching.suggested_actions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Recommended Actions
                  </p>
                  <ul className="space-y-1.5">
                    {coaching.suggested_actions.map((action, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-foreground"
                      >
                        <ArrowRight className="w-3 h-3 text-sq-agent shrink-0 mt-0.5" />
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI reasoning collapsible */}
              {coaching.ai_reasoning && (
                <div>
                  <button
                    type="button"
                    onClick={() => setReasoningOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-[10px] text-sq-agent hover:text-sq-agent/80 transition-colors"
                  >
                    <Lightbulb className="w-3 h-3" />
                    AI reasoning
                    {reasoningOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  <AnimatePresence>
                    {reasoningOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 bg-sq-agent/5 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {coaching.ai_reasoning}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <p className="text-[9px] text-muted-foreground/50 text-right">
                Generated{" "}
                {new Date(coaching.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
