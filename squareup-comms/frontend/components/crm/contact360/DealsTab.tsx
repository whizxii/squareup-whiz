"use client";

import { useState } from "react";
import type { Deal, DealStatus } from "@/lib/types/crm";
import { useDealsForContact, useWinDeal } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { DealHealthBadge } from "@/components/crm/pipeline/DealHealthBadge";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Trophy, XCircle, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import DealCoachingCard from "@/components/crm/DealCoachingCard";

const STATUS_FILTERS: { value: DealStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

interface DealsTabProps {
  contactId: string;
}

export function DealsTab({ contactId }: DealsTabProps) {
  const { data: dealsRes, isLoading } = useDealsForContact(contactId);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const setSelectedDealId = useCRMUIStore((s) => s.setSelectedDealId);

  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");

  const deals = dealsRes?.items ?? [];
  const filtered =
    statusFilter === "all"
      ? deals
      : deals.filter((d) => d.status === statusFilter);

  const handleCreateDeal = () => {
    openDialog("create-deal", { contact_id: contactId });
  };

  if (isLoading) return <DealsTabSkeleton />;

  if (deals.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-6 w-6" />}
        title="No deals yet"
        description="Create a deal to start tracking revenue for this contact."
        action={{ label: "Create Deal", onClick: handleCreateDeal }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? deals.length
                : deals.filter((d) => d.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCreateDeal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Deal
        </button>
      </div>

      {/* Deal cards */}
      <div className="space-y-3">
        {filtered.map((deal) => (
          <div key={deal.id} className="space-y-1.5">
            <DealRow
              deal={deal}
              onSelect={() => setSelectedDealId(deal.id)}
            />
            {deal.status === "open" && <DealCoachingCard dealId={deal.id} />}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No {statusFilter} deals found.
          </p>
        )}
      </div>

    </div>
  );
}

// ─── Deal Row ────────────────────────────────────────────────────

interface DealRowProps {
  deal: Deal;
  onSelect: () => void;
}

function DealRow({ deal, onSelect }: DealRowProps) {
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const winDeal = useWinDeal();

  const handleWin = (e: React.MouseEvent) => {
    e.stopPropagation();
    winDeal.mutate(deal.id);
  };

  const handleLose = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDialog("lose-deal", { dealId: deal.id, dealTitle: deal.title });
  };

  const statusBadge: Record<DealStatus, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    won: { label: "Won", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    lost: { label: "Lost", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  const badge = statusBadge[deal.status];

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Title + meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{deal.title}</p>
            <DealHealthBadge health={deal.deal_health} />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {deal.value != null && deal.value > 0 && (
              <span className="font-mono font-medium text-primary">
                {formatCurrency(deal.value, deal.currency)}
              </span>
            )}
            <span>{deal.probability}% probability</span>
            {deal.expected_close_date && (
              <span>Closes {formatRelativeTime(deal.expected_close_date)}</span>
            )}
          </div>

          {/* Probability bar */}
          <div className="h-1 w-full max-w-[200px] bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                deal.probability >= 60
                  ? "bg-green-500"
                  : deal.probability >= 30
                    ? "bg-yellow-500"
                    : "bg-red-400"
              )}
              style={{ width: `${deal.probability}%` }}
            />
          </div>
        </div>

        {/* Right: Status badge + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", badge.className)}>
            {badge.label}
          </span>

          {deal.status === "open" && (
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                title="Win"
                onClick={handleWin}
                className="p-1 rounded-md bg-background/80 border border-border hover:bg-muted transition-colors text-green-600"
              >
                <Trophy className="h-3 w-3" />
              </button>
              <button
                title="Lose"
                onClick={handleLose}
                className="p-1 rounded-md bg-background/80 border border-border hover:bg-muted transition-colors text-red-500"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────

function DealsTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
