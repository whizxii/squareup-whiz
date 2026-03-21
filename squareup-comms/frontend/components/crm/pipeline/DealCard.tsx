"use client";

import { useState } from "react";
import type { Deal } from "@/lib/types/crm";
import { cn } from "@/lib/utils";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { DealHealthBadge } from "./DealHealthBadge";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Trophy, XCircle, Pencil, AlertTriangle, Sparkles, X } from "lucide-react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useWinDeal, useAICopilot } from "@/lib/hooks/use-crm-queries";
import { toast } from "@/lib/stores/toast-store";
import { useRouter } from "next/navigation";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
}

export function DealCard({ deal, isDragging = false }: DealCardProps) {
  const router = useRouter();
  const setSelectedDealId = useCRMUIStore((s) => s.setSelectedDealId);
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const winDeal = useWinDeal();
  const aiCopilot = useAICopilot();

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const isStale = deal.deal_health === "red";
  const isAtRisk = deal.deal_health === "yellow";

  const handleClick = () => {
    setSelectedDealId(deal.id);
    if (deal.contact_id) {
      router.push(`/crm/contacts/${deal.contact_id}`);
    }
  };

  const handleGetAIAdvice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiAdvice) { setAiAdvice(null); return; }
    setAiLoading(true);
    try {
      const result = await aiCopilot.mutateAsync(
        `Give 2–3 sentences of actionable coaching advice for this stale deal: "${deal.title}", ${deal.days_in_stage} days in the "${deal.stage}" stage, ${deal.probability}% probability, value ${deal.value ? formatCurrency(deal.value, deal.currency) : "unknown"}. What should the rep do right now?`
      );
      setAiAdvice(result.message ?? "No advice available.");
    } catch {
      setAiAdvice("Could not load AI advice. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleWin = (e: React.MouseEvent) => {
    e.stopPropagation();
    winDeal.mutate(deal.id, {
      onSuccess: () => toast.success(`Deal "${deal.title}" marked as Won 🎉`),
      onError: () => toast.error("Failed to update deal"),
    });
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

      {/* Stale / At-risk warning */}
      {(isStale || isAtRisk) && (
        <div
          className={cn(
            "rounded-md px-2 py-1.5 flex items-center justify-between gap-2",
            isStale ? "bg-red-50 dark:bg-red-950/30" : "bg-yellow-50 dark:bg-yellow-950/30"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className={cn("flex items-center gap-1 text-[10px] font-medium", isStale ? "text-red-600" : "text-yellow-700")}>
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {deal.days_in_stage} day{deal.days_in_stage !== 1 ? "s" : ""} {isStale ? "stale" : "at risk"}
          </span>
          <button
            onClick={handleGetAIAdvice}
            disabled={aiLoading}
            className={cn(
              "text-[10px] font-medium flex items-center gap-0.5 transition-colors disabled:opacity-50",
              isStale ? "text-red-600 hover:text-red-700" : "text-yellow-700 hover:text-yellow-800"
            )}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {aiLoading ? "Loading…" : aiAdvice ? "Hide" : "Get AI advice →"}
          </button>
        </div>
      )}

      {/* AI advice popover */}
      {aiAdvice && (
        <div
          className="rounded-md bg-muted/60 border border-border px-2.5 py-2 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              AI Coaching
            </span>
            <button onClick={(e) => { e.stopPropagation(); setAiAdvice(null); }}>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{aiAdvice}</p>
        </div>
      )}

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
