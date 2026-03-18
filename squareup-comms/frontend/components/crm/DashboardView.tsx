"use client";

/**
 * CRM Dashboard — KPI summary, pipeline funnel, revenue trend,
 * activity sparkline, deal velocity, and at-risk deals.
 */

import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  useAnalyticsOverview,
  usePipelineAnalytics,
  useRevenueAnalytics,
  useActivityAnalytics,
  useDealVelocity,
  useAtRiskDeals,
} from "@/lib/hooks/use-crm-queries";
import { Sparkline, FunnelChart } from "@/components/crm/charts/MiniBarChart";
import { DealRiskPanel } from "@/components/crm/DealRiskPanel";

// ─── Period Selector ────────────────────────────────────────────

const PERIODS = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "YTD" },
] as const;

import { useState } from "react";

// ─── KPI Card ───────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  subtext,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">
        {label}
        {subtext && <span className="ml-1 opacity-70">{subtext}</span>}
      </div>
    </div>
  );
}

// ─── Section Card ───────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-muted/40" />
        <div className="h-64 rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}

// ─── Main Dashboard View ────────────────────────────────────────

export function DashboardView() {
  const [period, setPeriod] = useState<string>("30d");

  const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview(period);
  const { data: pipeline, isLoading: loadingPipeline } = usePipelineAnalytics();
  const { data: revenueRes } = useRevenueAnalytics(period);
  const { data: activityRes } = useActivityAnalytics();
  const { data: velocityRes } = useDealVelocity(period);

  const overviewData = overview;
  const pipelineData = pipeline;
  const revenueData = revenueRes;
  const activityData = activityRes;
  const velocityData = velocityRes;

  if (loadingOverview && loadingPipeline) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  // Pipeline funnel data
  const funnelStages = (pipelineData?.stages ?? []).map((s, i) => ({
    label: s.stage_label,
    value: s.deal_count,
    color: [
      "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
      "#ec4899", "#f43f5e", "#ef4444",
    ][i % 7],
  }));

  // Activity sparkline values
  const activitySparkline = activityData?.daily?.map((d) => d.count) ?? [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dashboard</h2>
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

        {/* KPI Row 1 — Contacts & Pipeline */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<Users className="w-4 h-4" />}
            label="Total Contacts"
            value={overviewData?.total_contacts?.toLocaleString() ?? "—"}
            subtext={overviewData ? `+${overviewData.new_contacts_period} new` : undefined}
            trend="up"
          />
          <KPICard
            icon={<DollarSign className="w-4 h-4" />}
            label="Pipeline Value"
            value={overviewData ? formatCurrency(overviewData.total_pipeline_value) : "—"}
            subtext={overviewData ? `${formatCurrency(overviewData.weighted_pipeline_value)} weighted` : undefined}
          />
          <KPICard
            icon={<Target className="w-4 h-4" />}
            label="Win Rate"
            value={overviewData ? `${overviewData.win_rate.toFixed(1)}%` : "—"}
            subtext={overviewData ? `${overviewData.deals_won_period} won` : undefined}
            trend={overviewData && overviewData.win_rate > 30 ? "up" : "down"}
          />
          <KPICard
            icon={<Clock className="w-4 h-4" />}
            label="Avg Days to Close"
            value={overviewData?.avg_days_to_close?.toFixed(0) ?? "—"}
            subtext="days"
          />
        </div>

        {/* KPI Row 2 — Deal Velocity */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<DollarSign className="w-4 h-4" />}
            label="Avg Deal Size"
            value={overviewData ? formatCurrency(overviewData.avg_deal_size) : "—"}
          />
          <KPICard
            icon={<Zap className="w-4 h-4" />}
            label="Pipeline Velocity"
            value={velocityData ? formatCurrency(velocityData.velocity) : "—"}
            subtext="/month"
          />
          <KPICard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Deals Created"
            value={velocityData?.deals_created?.toLocaleString() ?? "—"}
            subtext="this period"
          />
          <KPICard
            icon={<Target className="w-4 h-4" />}
            label="Deals Closed"
            value={velocityData?.deals_closed?.toLocaleString() ?? "—"}
            subtext="this period"
          />
        </div>

        {/* Middle Row — Pipeline Funnel + Activity Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Pipeline Funnel">
            {funnelStages.length > 0 ? (
              <FunnelChart data={funnelStages} />
            ) : (
              <p className="text-sm text-muted-foreground">No pipeline data yet</p>
            )}
            {pipelineData && (
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>{pipelineData.total_deals} total deals</span>
                <span>{formatCurrency(pipelineData.total_value)} value</span>
                <span>{pipelineData.velocity_days}d avg velocity</span>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Activity Trend (30d)">
            {activitySparkline.length > 1 ? (
              <Sparkline values={activitySparkline} height={100} />
            ) : (
              <p className="text-sm text-muted-foreground">Not enough activity data</p>
            )}
            {activityData && (
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>{activityData.total_30d} total activities</span>
                <span>{activityData.avg_per_day.toFixed(1)}/day avg</span>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Revenue Trend */}
        {revenueData && (
          <SectionCard title="Revenue: Actual vs Forecast">
            <div className="space-y-3">
              {(Array.isArray(revenueData) ? revenueData : []).map(
                (r: { period: string; actual: number; forecast: number }) => {
                  const pct = r.forecast > 0 ? Math.round((r.actual / r.forecast) * 100) : 0;
                  return (
                    <div key={r.period} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{r.period}</span>
                        <span>
                          {formatCurrency(r.actual)} / {formatCurrency(r.forecast)}{" "}
                          <span className={pct >= 100 ? "text-green-500" : "text-amber-500"}>
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </SectionCard>
        )}

        {/* Deal Risk */}
        <SectionCard title="Deal Risk & Pipeline Health">
          <DealRiskPanel />
        </SectionCard>
      </div>
    </div>
  );
}
