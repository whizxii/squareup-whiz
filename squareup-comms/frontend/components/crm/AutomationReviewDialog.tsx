"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, XCircle, Bot, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import type { AutomationLogEntry } from "@/lib/types/crm";

/* ------------------------------------------------------------------ */
/*  API helpers                                                         */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) return { ...base, Authorization: `Bearer ${token}` };
  return { ...base, "X-User-Id": getCurrentUserId() };
}

async function submitReview(
  logId: string,
  action: "approve" | "reject",
  notes: string
) {
  const res = await fetch(
    `${API_URL}/api/automation/review/${logId}/${action}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ notes: notes || null }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to ${action}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Proposed action summary                                             */
/* ------------------------------------------------------------------ */

function ProposedAction({ entry }: { entry: AutomationLogEntry }) {
  let proposed: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(entry.result ?? "{}");
    proposed = parsed.proposed ?? parsed;
  } catch {
    // ignore
  }

  const rows = Object.entries(proposed).filter(([, v]) => v != null);

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        Proposed action
      </p>
      {rows.length > 0 ? (
        rows.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground min-w-[90px] shrink-0">
              {k.replace(/_/g, " ")}
            </span>
            <span className="text-foreground font-medium break-all">
              {String(v)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-xs text-muted-foreground">No details available.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AutomationReviewDialog                                              */
/* ------------------------------------------------------------------ */

interface Props {
  entry: AutomationLogEntry;
  onClose: () => void;
  onDone: () => void;
}

export function AutomationReviewDialog({ entry, onClose, onDone }: Props) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.round(entry.confidence * 100);

  async function handle(action: "approve" | "reject") {
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(entry.id, action, notes);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-sq-agent/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sq-agent/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-sq-agent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-none">
                Review AI Action
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {entry.action_type.replace(/_/g, " ")} ·{" "}
                <span
                  className={cn(
                    "font-semibold",
                    pct >= 70
                      ? "text-amber-500"
                      : "text-red-500"
                  )}
                >
                  {pct}% confidence
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Entity */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Target
            </p>
            <p className="text-sm font-medium">{entry.entity_name}</p>
          </div>

          {/* Proposed action */}
          <ProposedAction entry={entry} />

          {/* AI reasoning */}
          {entry.ai_reasoning && (
            <div className="rounded-lg bg-sq-agent/5 border border-sq-agent/20 p-3">
              <p className="text-[10px] font-semibold text-sq-agent uppercase tracking-wider mb-1">
                AI reasoning
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {entry.ai_reasoning}
              </p>
            </div>
          )}

          {/* Confidence warning */}
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
              Confidence below 80% — manual review required before this action
              is executed.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
              Review notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add context for this decision..."
              className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-sq-agent"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={() => handle("reject")}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => handle("approve")}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/80 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approve & Execute
          </button>
        </div>
      </motion.div>
    </div>
  );
}
