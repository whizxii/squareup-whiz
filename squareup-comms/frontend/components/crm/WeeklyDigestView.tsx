"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/format";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface DigestStats {
  deals_won?: number;
  deals_lost?: number;
  new_deals?: number;
  new_contacts?: number;
  activities?: number;
  pipeline_value?: number;
  [key: string]: unknown;
}

interface WeeklyDigest {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  stats: DigestStats;
  week_start: string | null;
  week_end: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  API helpers                                                         */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) return { Authorization: `Bearer ${token}` };
  return { "X-User-Id": getCurrentUserId() };
}

async function fetchLatestDigest(): Promise<WeeklyDigest | null> {
  try {
    const res = await fetch(`${API_URL}/api/digests/latest`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: number | undefined;
  trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="text-xl font-bold">{value ?? 0}</span>
        {trend && (
          <TrendIcon className={cn("w-3.5 h-3.5 shrink-0", trendColor)} />
        )}
      </div>
    </div>
  );
}

function HighlightList({ highlights }: { highlights: string[] }) {
  if (!highlights.length) return null;
  return (
    <ul className="space-y-2">
      {highlights.map((h, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-foreground/90 leading-snug">{h}</span>
        </li>
      ))}
    </ul>
  );
}

function DateRange({
  start,
  end,
}: {
  start: string | null;
  end: string | null;
}) {
  if (!start || !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(APP_LOCALE, { month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  return (
    <span className="text-[11px] text-muted-foreground">
      {fmt(start)} – {fmt(end)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  WeeklyDigestView                                                    */
/* ------------------------------------------------------------------ */

export default function WeeklyDigestView() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    const data = await fetchLatestDigest();
    setDigest(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading digest…
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <BarChart2 className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No weekly digest yet. One will be generated every Monday.
        </p>
      </div>
    );
  }

  const { stats } = digest;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Calendar className="w-3.5 h-3.5 text-sq-agent" />
            <h2 className="text-sm font-semibold">{digest.title}</h2>
          </div>
          <DateRange start={digest.week_start} end={digest.week_end} />
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
          />
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground/80 leading-relaxed">
        {digest.summary}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard
          label="Deals Won"
          value={stats.deals_won}
          trend={
            (stats.deals_won ?? 0) > 0
              ? "up"
              : (stats.deals_won ?? 0) === 0
              ? "neutral"
              : "down"
          }
        />
        <StatCard
          label="Deals Lost"
          value={stats.deals_lost}
          trend={(stats.deals_lost ?? 0) > 0 ? "down" : "neutral"}
        />
        <StatCard label="New Deals" value={stats.new_deals} trend="up" />
        <StatCard
          label="New Contacts"
          value={stats.new_contacts}
          trend="up"
        />
        <StatCard label="Activities" value={stats.activities} />
        {stats.pipeline_value !== undefined && (
          <div className="rounded-lg border border-border bg-sq-agent/5 p-3 flex flex-col gap-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Pipeline Value
            </p>
            <span className="text-xl font-bold text-sq-agent">
              ${(stats.pipeline_value ?? 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Weekly Highlights
          </p>
          <HighlightList highlights={digest.highlights} />
        </div>
      )}
    </motion.div>
  );
}
