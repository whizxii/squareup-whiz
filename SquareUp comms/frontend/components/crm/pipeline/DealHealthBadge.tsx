"use client";

import { cn } from "@/lib/utils";
import type { DealHealth } from "@/lib/types/crm";

const HEALTH_CONFIG: Record<DealHealth, { label: string; dotClass: string; tipText: string }> = {
  green: {
    label: "Healthy",
    dotClass: "bg-green-500",
    tipText: "On track — recent activity within SLA",
  },
  yellow: {
    label: "At Risk",
    dotClass: "bg-yellow-500",
    tipText: "Approaching SLA — needs attention soon",
  },
  red: {
    label: "Stale",
    dotClass: "bg-red-500",
    tipText: "Past SLA — no recent activity",
  },
};

interface DealHealthBadgeProps {
  health: DealHealth;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function DealHealthBadge({
  health,
  showLabel = false,
  size = "sm",
  className,
}: DealHealthBadgeProps) {
  const config = HEALTH_CONFIG[health];
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span
      title={config.tipText}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span className={cn("rounded-full shrink-0", dotSize, config.dotClass)} />
      {showLabel && (
        <span className="text-[10px] text-muted-foreground">{config.label}</span>
      )}
    </span>
  );
}
