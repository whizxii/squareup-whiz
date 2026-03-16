"use client";

import type { Deal } from "@/lib/types/crm";
import { cn } from "@/lib/utils";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { DealHealthBadge } from "./DealHealthBadge";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Trophy, XCircle, Pencil } from "lucide-react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useWinDeal } from "@/lib/hooks/use-crm-queries";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
}

export function DealCard({ deal, isDragging = false }: DealCardProps) {
  const setSelectedDealId = useCRMUIStore((s) => s.setSelectedDealId);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const winDeal = useWinDeal();

  const handleClick = () => {
    setSelectedDealId(deal.id);
  };

  const handleWin = (e: React.MouseEvent) => {
    e.stopPropagation();
    winDeal.mutate(deal.id);
  };

  const handleLose = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDialog("lose-deal", { dealId: deal.id, dealTitle: deal.title });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDialog("edit-deal", { dealId: deal.id });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border bg-card transition-all duration-150",
        "space-y-2 relative outline-none group",
        isDragging
          ? "border-primary ring-2 ring-primary/30 shadow-lg rotate-1 scale-105"
          : "border-border hover:border-primary/30 hover:shadow-md"
      )}
    >
      {/* Title + Health */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold truncate flex-1">{deal.title}</p>
        <DealHealthBadge health={deal.deal_health} />
      </div>

      {/* Value */}
      {deal.value != null && deal.value > 0 && (
        <p className="text-sm font-mono font-medium text-primary">
          {formatCurrency(deal.value, deal.currency)}
        </p>
      )}

      {/* Probability bar */}
      <div className="space-y-0.5">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
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
        <p className="text-[10px] text-muted-foreground">{deal.probability}% probability</p>
      </div>

      {/* Footer: Expected close + stage time */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {deal.expected_close_date && (
          <span className="flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {formatRelativeTime(deal.expected_close_date)}
          </span>
        )}
        {deal.stage_entered_at && (
          <span>
            {formatRelativeTime(deal.stage_entered_at)} in stage
          </span>
        )}
      </div>

      {/* Quick actions (visible on hover) */}
      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1">
        <QuickAction icon={Pencil} title="Edit" onClick={handleEdit} />
        <QuickAction icon={Trophy} title="Win" onClick={handleWin} className="text-green-600" />
        <QuickAction icon={XCircle} title="Lose" onClick={handleLose} className="text-red-500" />
      </div>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  title,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "p-1 rounded-md bg-background/80 backdrop-blur-sm border border-border",
        "hover:bg-muted transition-colors",
        className
      )}
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}
