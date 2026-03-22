"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  TrendingDown,
  UserX,
  X,
} from "lucide-react";
import { useAttentionItems } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import type { AttentionItem } from "@/lib/types/crm";

// ─── Icon + color mapping per item type ──────────────────────────

const TYPE_CONFIG: Record<
  AttentionItem["type"],
  { icon: typeof AlertTriangle; label: string }
> = {
  deal_at_risk: { icon: TrendingDown, label: "Deal at risk" },
  deal_stale: { icon: Clock, label: "Stale deal" },
  contact_cold: { icon: UserX, label: "Cold contact" },
  task_overdue: { icon: AlertTriangle, label: "Overdue task" },
  missing_follow_up: { icon: Phone, label: "Missed follow-up" },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

// ─── Single attention item row ───────────────────────────────────

function AttentionRow({
  item,
  onDismiss,
}: {
  item: AttentionItem;
  onDismiss: (id: string) => void;
}) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.deal_stale;
  const Icon = config.icon;
  const setActiveView = useCRMUIStore((s) => s.setActiveView);

  const handleClick = () => {
    if (item.entity_type === "deal") setActiveView("pipeline");
    else if (item.entity_type === "contact") setActiveView("table");
    else if (item.entity_type === "task") setActiveView("table");
  };

  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 text-sm">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <button
        onClick={handleClick}
        className="truncate hover:underline text-left"
        title={item.description}
      >
        <span className="font-medium">{item.title}</span>
        <span className="ml-1.5 opacity-70">{item.description}</span>
      </button>
      <button
        onClick={() => onDismiss(item.id)}
        className="ml-auto shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:hover:bg-white/10"
        title="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Main banner ─────────────────────────────────────────────────

export function AttentionBanner() {
  const { data, isLoading } = useAttentionItems();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading || !data || data.count === 0) return null;

  const visible = data.items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  const criticalCount = visible.filter((i) => i.severity === "critical").length;
  const preview = visible.slice(0, 3);
  const hasMore = visible.length > 3;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const topSeverity = criticalCount > 0 ? "critical" : "warning";

  return (
    <div
      className={`border-b text-xs transition-all ${SEVERITY_STYLES[topSeverity]}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold">
          {visible.length} item{visible.length !== 1 ? "s" : ""} need attention
        </span>
        {criticalCount > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {criticalCount} critical
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {expanded ? (
              <>
                Collapse <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Expand <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(new Set(visible.map((i) => i.id)))}
            className="rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Dismiss all
          </button>
        </div>
      </div>

      {/* Items list */}
      {expanded && (
        <div className="border-t border-inherit pb-1">
          {visible.map((item) => (
            <AttentionRow
              key={item.id}
              item={item}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Collapsed preview: show top 3 inline */}
      {!expanded && (
        <div className="border-t border-inherit pb-1">
          {preview.map((item) => (
            <AttentionRow
              key={item.id}
              item={item}
              onDismiss={handleDismiss}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full px-3 py-1 text-center opacity-70 hover:opacity-100"
            >
              + {visible.length - 3} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
