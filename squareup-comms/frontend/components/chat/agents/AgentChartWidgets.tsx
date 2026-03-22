"use client";

import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ─── Data Interfaces ──────────────────────────────────────────

interface DealMetricsData {
  total_deals?: number;
  total_value?: number;
  average_value?: number;
  by_status?: Record<string, { count: number; value: number }>;
}

interface PipelineSummaryData {
  pipelines?: Array<{
    id?: string;
    name?: string;
    total_open_deals?: number;
    total_open_value?: number;
    stages?: Record<string, { count: number; value: number }>;
  }>;
}

interface ContactStatsData {
  total_contacts?: number;
  new_contacts_last_n_days?: number;
  days_back?: number;
}

// ─── Color Palette ────────────────────────────────────────────

const STATUS_COLORS: Record<string, { fill: string; text: string }> = {
  open: { fill: "#3b82f6", text: "text-blue-500" },
  won: { fill: "#10b981", text: "text-emerald-500" },
  lost: { fill: "#ef4444", text: "text-red-500" },
};

const STAGE_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
];

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

// ─── Donut Chart (Deal Metrics) ───────────────────────────────

export function DealMetricsChart({ data }: { data: DealMetricsData }) {
  const byStatus = data.by_status ?? {};
  const entries = Object.entries(byStatus);
  const totalDeals = data.total_deals ?? 0;

  if (totalDeals === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/80 p-3 text-xs max-w-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PieChart className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">Deal Metrics</span>
        </div>
        <div className="text-center py-4 text-muted-foreground">No deals found</div>
      </div>
    );
  }

  // Build donut segments
  const total = entries.reduce((sum, [, v]) => sum + v.count, 0);
  const segments: Array<{
    label: string;
    count: number;
    value: number;
    color: string;
    textColor: string;
    startAngle: number;
    endAngle: number;
  }> = [];

  let angle = -90; // start at top
  for (const [status, val] of entries) {
    const fraction = total > 0 ? val.count / total : 0;
    const sweep = fraction * 360;
    const colors = STATUS_COLORS[status] ?? { fill: "#94a3b8", text: "text-slate-400" };
    segments.push({
      label: status,
      count: val.count,
      value: val.value,
      color: colors.fill,
      textColor: colors.text,
      startAngle: angle,
      endAngle: angle + sweep,
    });
    angle += sweep;
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3 text-xs max-w-sm space-y-2">
      <div className="flex items-center gap-2">
        <PieChart className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">Deal Metrics</span>
      </div>

      <div className="flex items-center gap-4">
        {/* SVG Donut */}
        <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
          {segments.map((seg, i) => (
            <DonutSegment
              key={i}
              cx={40}
              cy={40}
              r={32}
              strokeWidth={12}
              startAngle={seg.startAngle}
              endAngle={seg.endAngle}
              color={seg.color}
            />
          ))}
          <text
            x="40"
            y="37"
            textAnchor="middle"
            className="fill-foreground font-semibold"
            fontSize="14"
          >
            {totalDeals}
          </text>
          <text
            x="40"
            y="49"
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="8"
          >
            deals
          </text>
        </svg>

        {/* Legend + KPIs */}
        <div className="space-y-1.5 min-w-0 flex-1">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="capitalize text-foreground/80 flex-1">{seg.label}</span>
              <span className="font-medium text-foreground tabular-nums">{seg.count}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(seg.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 pt-1.5 border-t border-border/30">
        <div>
          <div className="text-[10px] text-muted-foreground">Total Value</div>
          <div className="font-semibold text-foreground text-sm">
            {formatCurrency(data.total_value ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Avg Value</div>
          <div className="font-semibold text-foreground text-sm">
            {formatCurrency(data.average_value ?? 0)}
          </div>
        </div>
      </div>

      <div className="flex gap-1 pt-1 border-t border-border/30">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Pipeline
        </Link>
      </div>
    </div>
  );
}

/** SVG arc path for a donut segment. */
function DonutSegment({
  cx,
  cy,
  r,
  strokeWidth,
  startAngle,
  endAngle,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  startAngle: number;
  endAngle: number;
  color: string;
}) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return null;

  // Full circle special case
  if (sweep >= 359.99) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  }

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = sweep > 180 ? 1 : 0;

  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
}

// ─── Horizontal Bar Chart (Pipeline Summary) ─────────────────

export function PipelineSummaryChart({ data }: { data: PipelineSummaryData }) {
  const pipelines = data.pipelines ?? [];
  if (pipelines.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/80 p-3 text-xs max-w-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">Pipeline Summary</span>
        </div>
        <div className="text-center py-4 text-muted-foreground">No pipelines found</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3 text-xs max-w-md space-y-3">
      {pipelines.map((pipeline, pIdx) => {
        const stages = Object.entries(pipeline.stages ?? {});
        const maxCount = Math.max(...stages.map(([, v]) => v.count), 1);

        return (
          <div key={pipeline.id ?? pIdx} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {pipeline.name ?? "Pipeline"}
                </span>
              </div>
              <div className="text-muted-foreground">
                {pipeline.total_open_deals ?? 0} deals ·{" "}
                {formatCurrency(pipeline.total_open_value ?? 0)}
              </div>
            </div>

            {/* Bars */}
            <div className="space-y-1.5">
              {stages.map(([stage, val], sIdx) => {
                const barWidth = maxCount > 0 ? (val.count / maxCount) * 100 : 0;
                const color = STAGE_COLORS[sIdx % STAGE_COLORS.length];

                return (
                  <div key={stage} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground/80 truncate">{stage}</span>
                      <span className="text-muted-foreground tabular-nums ml-2 shrink-0">
                        {val.count} · {formatCurrency(val.value)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(barWidth, 4)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex gap-1 pt-1 border-t border-border/30">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Full Pipeline
        </Link>
      </div>
    </div>
  );
}

// ─── KPI Card (Contact Stats) ─────────────────────────────────

export function ContactStatsChart({ data }: { data: ContactStatsData }) {
  const total = data.total_contacts ?? 0;
  const recent = data.new_contacts_last_n_days ?? 0;
  const daysBack = data.days_back ?? 30;
  const growthPercent = total > 0 ? Math.round((recent / total) * 100) : 0;
  const isGrowing = recent > 0;

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3 text-xs max-w-xs space-y-2">
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">Contact Stats</span>
      </div>

      <div className="flex items-end gap-4">
        {/* Big number */}
        <div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{total}</div>
          <div className="text-[10px] text-muted-foreground">total contacts</div>
        </div>

        {/* Growth indicator */}
        <div className="flex items-center gap-1 pb-1">
          {isGrowing ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span
            className={cn(
              "font-medium",
              isGrowing ? "text-emerald-500" : "text-muted-foreground"
            )}
          >
            +{recent}
          </span>
          <span className="text-muted-foreground">({growthPercent}%)</span>
        </div>
      </div>

      {/* Mini bar showing new vs existing */}
      <div className="space-y-0.5">
        <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden flex">
          <div
            className="h-full bg-blue-500 rounded-l-full transition-all duration-500"
            style={{ width: `${Math.max(100 - growthPercent, 10)}%` }}
          />
          <div
            className="h-full bg-emerald-500 rounded-r-full transition-all duration-500"
            style={{ width: `${Math.max(growthPercent, 2)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Existing: {total - recent}</span>
          <span>
            New (last {daysBack}d): {recent}
          </span>
        </div>
      </div>

      <div className="flex gap-1 pt-1 border-t border-border/30">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Contacts
        </Link>
      </div>
    </div>
  );
}
