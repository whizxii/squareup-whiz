"use client";

/**
 * CRM Analytics View — deep-dive panels: win/loss analysis,
 * stage duration, deal velocity, and lead source performance.
 */

import { useState } from "react";
import {
  Trophy,
  XCircle,
  Clock,
  Zap,
  Globe,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  useWinLossAnalytics,
  useStageDuration,
  useDealVelocity,
  useLeadSourceAnalytics,
  usePipelineAnalytics,
} from "@/lib/hooks/use-crm-queries";
import { MiniBarChart, FunnelChart } from "@/components/crm/charts/MiniBarChart";
import { DealRiskPanel } from "@/components/crm/DealRiskPanel";
import { CrossDealPatternsPanel } from "@/components/crm/CrossDealPatternsPanel";

// ─── Shared ─────────────────────────────────────────────────────

const PERIODS = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "YTD" },
] as const;

function SectionCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

// ─── Win / Loss Panel ───────────────────────────────────────────

function WinLossPanel({ period }: { period: string }) {
  const { data: d, isLoading } = useWinLossAnalytics(period);

  if (isLoading) return <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />;
  if (!d) return null;

  const lossReasonBars = (d.loss_reasons ?? []).map((r) => ({
    label: (r.reason ?? "").slice(0, 10),
    value: r.count,
    color: "#ef4444",
  }));

  return (
    <SectionCard title="Win / Loss Analysis" icon={<Trophy className="w-4 h-4" />}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Stat label="Won" value={String(d.won_count)} />
        <Stat label="Lost" value={String(d.lost_count)} />
        <Stat label="Win Rate" value={`${(d.win_rate ?? 0).toFixed(1)}%`} />
        <Stat label="Won Value" value={formatCurrency(d.won_value)} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
          <div className="text-sm font-medium text-green-600">
            {(d.avg_won_cycle_days ?? 0).toFixed(0)} days
          </div>
          <div className="text-xs text-muted-foreground">Avg won cycle</div>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
          <div className="text-sm font-medium text-red-600">
            {(d.avg_lost_cycle_days ?? 0).toFixed(0)} days
          </div>
          <div className="text-xs text-muted-foreground">Avg lost cycle</div>
        </div>
      </div>

      {lossReasonBars.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Loss Reasons</h4>
          <MiniBarChart data={lossReasonBars} height={80} barColor="#ef4444" />
        </div>
      )}
    </SectionCard>
  );
}

// ─── Stage Duration Panel ───────────────────────────────────────

function StageDurationPanel() {
  const { data: stages = [], isLoading } = useStageDuration();

  if (isLoading) return <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />;
  if (stages.length === 0) return null;

  return (
    <SectionCard title="Stage Duration" icon={<Clock className="w-4 h-4" />}>
      <div className="space-y-3">
        {stages.map((s) => {
          const overSLA = s.sla_days != null && s.avg_days > s.sla_days;
          const pct = s.sla_days
            ? Math.min(Math.round((s.avg_days / s.sla_days) * 100), 100)
            : 50;
          return (
            <div key={s.stage_id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  {s.stage_label}
                  {overSLA && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                </span>
                <span>
                  <span className={overSLA ? "text-amber-500 font-medium" : ""}>
                    {(s.avg_days ?? 0).toFixed(1)}d
                  </span>
                  {s.sla_days != null && (
                    <span className="text-muted-foreground"> / {s.sla_days}d SLA</span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overSLA ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Deal Velocity Panel ────────────────────────────────────────

function DealVelocityPanel({ period }: { period: string }) {
  const { data: d, isLoading } = useDealVelocity(period);

  if (isLoading) return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;
  if (!d) return null;

  return (
    <SectionCard title="Deal Velocity" icon={<Zap className="w-4 h-4" />}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <Stat label="Created" value={String(d.deals_created)} />
        <Stat label="Closed" value={String(d.deals_closed)} />
        <Stat label="Win Rate" value={`${(d.win_rate ?? 0).toFixed(1)}%`} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Avg Value" value={formatCurrency(d.avg_value)} />
        <Stat label="Avg Cycle" value={`${(d.avg_cycle_days ?? 0).toFixed(0)}d`} />
        <Stat label="Velocity" value={formatCurrency(d.velocity)} />
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Velocity = (Deals x Win Rate x Avg Value) / Avg Cycle
      </p>
    </SectionCard>
  );
}

// ─── Lead Source Panel ──────────────────────────────────────────

function LeadSourcePanel({ period }: { period: string }) {
  const { data: sources = [], isLoading } = useLeadSourceAnalytics(period);

  if (isLoading) return <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />;
  if (sources.length === 0) return null;

  const sorted = [...sources].sort((a, b) => b.revenue - a.revenue);

  return (
    <SectionCard title="Lead Sources" icon={<Globe className="w-4 h-4" />}>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-medium">Source</th>
              <th className="text-right py-2 font-medium">Contacts</th>
              <th className="text-right py-2 font-medium">Deals</th>
              <th className="text-right py-2 font-medium">Revenue</th>
              <th className="text-right py-2 font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.source} className="border-b border-border/50 hover:bg-muted/20">
                <td className="py-2 font-medium capitalize">{s.source}</td>
                <td className="text-right py-2">{s.contacts}</td>
                <td className="text-right py-2">{s.deals}</td>
                <td className="text-right py-2">{formatCurrency(s.revenue)}</td>
                <td className="text-right py-2">
                  <span className={s.conversion_rate > 20 ? "text-green-500" : ""}>
                    {(s.conversion_rate ?? 0).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Pipeline Conversion Panel ──────────────────────────────────

function PipelineConversionPanel() {
  const { data: pipelineData, isLoading } = usePipelineAnalytics();
  const stages = pipelineData?.stages ?? [];

  if (isLoading) return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;
  if (stages.length === 0) return null;

  const conversionBars = stages.map((s, i) => ({
    label: (s.stage_label ?? "").slice(0, 8),
    value: Math.round(s.conversion_rate),
    color: [
      "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
      "#ec4899", "#f43f5e", "#ef4444",
    ][i % 7],
  }));

  return (
    <SectionCard title="Stage Conversion Rates" icon={<TrendingUp className="w-4 h-4" />}>
      <MiniBarChart data={conversionBars} height={100} barColor="#6366f1" />
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {stages.map((s) => (
          <span key={s.stage_id}>
            {s.stage_label}: {formatCurrency(s.total_value)} ({s.deal_count})
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Main Analytics View ────────────────────────────────────────

export function AnalyticsView() {
  const [period, setPeriod] = useState<string>("30d");

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  period === p.id
                    ? "bg-card text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WinLossPanel period={period} />
          <StageDurationPanel />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DealVelocityPanel period={period} />
          <PipelineConversionPanel />
        </div>

        {/* Row 3 */}
        <LeadSourcePanel period={period} />

        {/* Row 4 — AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Deal Risk & Pipeline Health" icon={<AlertTriangle className="w-4 h-4" />}>
            <DealRiskPanel />
          </SectionCard>
          <SectionCard title="Cross-Deal Patterns" icon={<Sparkles className="w-4 h-4" />}>
            <CrossDealPatternsPanel />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
