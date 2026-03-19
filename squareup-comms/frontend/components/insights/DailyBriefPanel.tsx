"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sun,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useInsightsStore, type DailyBrief } from "@/lib/stores/insights-store";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<string, { badge: string; glow: string }> = {
  critical: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    glow: "shadow-red-500/10",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/10",
  },
  info: {
    badge: "bg-sq-agent/10 text-sq-agent",
    glow: "shadow-sq-agent/10",
  },
};

function getSeverityStyle(severity: string) {
  return SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical" || severity === "warning") {
    return (
      <AlertTriangle
        className={cn(
          "w-4 h-4",
          severity === "critical"
            ? "text-red-500"
            : "text-amber-500"
        )}
      />
    );
  }
  return <Info className="w-4 h-4 text-sq-agent" />;
}

/* ------------------------------------------------------------------ */
/*  Brief Content                                                       */
/* ------------------------------------------------------------------ */

function BriefContent({ brief }: { brief: DailyBrief }) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const style = getSeverityStyle(brief.severity);

  return (
    <div className="space-y-4">
      {/* Highlight callout */}
      {brief.highlight && (
        <div className="rounded-xl bg-sq-agent/5 border border-sq-agent/20 px-3 py-2.5">
          <p className="text-xs font-medium text-sq-agent leading-relaxed">
            {brief.highlight}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <SeverityIcon severity={brief.severity} />
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider",
              style.badge
            )}
          >
            {brief.severity}
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {brief.description}
        </p>
      </div>

      {/* Suggested Actions */}
      {brief.suggested_actions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Today&apos;s Priorities
          </p>
          <ul className="space-y-1.5">
            {brief.suggested_actions.map((action, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <ArrowRight className="w-3.5 h-3.5 text-sq-agent shrink-0 mt-0.5" />
                <span className="leading-snug">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Reasoning (collapsible) */}
      {brief.ai_reasoning && (
        <div>
          <button
            type="button"
            onClick={() => setReasoningOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] text-sq-agent hover:text-sq-agent/80 transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
            Why these priorities?
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
                    {brief.ai_reasoning}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel                                                               */
/* ------------------------------------------------------------------ */

export default function DailyBriefPanel() {
  const { dailyBrief, briefPanelOpen, setBriefPanel } = useInsightsStore();

  if (!briefPanelOpen || !dailyBrief) return null;

  const style = getSeverityStyle(dailyBrief.severity);
  const createdDate = new Date(dailyBrief.created_at).toLocaleDateString(
    undefined,
    { weekday: "long", month: "long", day: "numeric" }
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed right-4 top-16 w-96 z-50 flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden",
          style.glow
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-sq-agent/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sq-agent/10 flex items-center justify-center">
              <Sun className="w-4 h-4 text-sq-agent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-none">
                {dailyBrief.title}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {createdDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBriefPanel(false)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh] scrollbar-thin">
          <BriefContent brief={dailyBrief} />
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Generated by AI · Updates each morning
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
