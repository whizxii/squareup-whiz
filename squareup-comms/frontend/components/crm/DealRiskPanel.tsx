"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAtRiskDeals } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { Deal } from "@/lib/types/crm";
import {
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  DollarSign,
  Clock,
  ChevronRight,
  Shield,
} from "lucide-react";

// ─── Health config ───────────────────────────────────────────────

const HEALTH_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  red: {
    label: "Critical",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  yellow: {
    label: "At Risk",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  green: {
    label: "Healthy",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
};

// ─── Deal Risk Card ──────────────────────────────────────────────

function DealRiskCard({
  deal,
  onSelect,
}: {
  deal: Deal;
  onSelect: () => void;
}) {
  const health = HEALTH_CONFIG[deal.deal_health] ?? HEALTH_CONFIG.yellow;

  return (
    <div
      onClick={onSelect}
      className="group rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 cursor-pointer transition-all space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{deal.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge stage={deal.stage} size="sm">
              {deal.stage}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {deal.days_in_stage}d in stage
            </span>
          </div>
        </div>

        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", health.bg, health.color)}>
          {health.icon}
          {health.label}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">
            {deal.value ? formatCurrency(deal.value, deal.currency) : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{deal.probability}% probability</span>
        </div>
        {deal.expected_close_date && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Close: {formatRelativeTime(deal.expected_close_date)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          Updated {formatRelativeTime(deal.updated_at)}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function RiskLoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton height={80} className="rounded-xl" />
        <Skeleton height={80} className="rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={140} className="rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────

export function DealRiskPanel() {
  const { data: atRiskDeals, isLoading } = useAtRiskDeals();
  const setSelectedContactId = useCRMUIStore((s) => s.setSelectedContactId);

  const deals = (atRiskDeals as Deal[] | undefined) ?? [];

  if (isLoading) return <RiskLoadingSkeleton />;

  if (deals.length === 0) {
    return (
      <EmptyState
        icon={<Shield className="w-6 h-6" />}
        title="No at-risk deals"
        description="All your open deals look healthy. Keep up the momentum!"
      />
    );
  }

  const critical = deals.filter((d) => d.deal_health === "red");
  const atRisk = deals.filter((d) => d.deal_health === "yellow");
  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold font-mono text-red-600">{critical.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical</p>
        </div>
        <div className="rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-600">{atRisk.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">At Risk</p>
        </div>
        <div className="rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold font-mono">{deals.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Flagged</p>
        </div>
        <div className="rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold font-mono">{formatCurrency(totalValue)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">At-Risk Value</p>
        </div>
      </div>

      {/* Deal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => (
          <DealRiskCard
            key={deal.id}
            deal={deal}
            onSelect={() => setSelectedContactId(deal.contact_id)}
          />
        ))}
      </div>
    </div>
  );
}
