import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Variant styles ──────────────────────────────────────────────

const VARIANT_CLASSES = {
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  primary: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
} as const;

type BadgeVariant = keyof typeof VARIANT_CLASSES;

// ─── Stage colors ────────────────────────────────────────────────

const STAGE_COLORS: Record<string, BadgeVariant> = {
  lead: "default",
  qualified: "primary",
  proposal: "warning",
  negotiation: "orange",
  won: "success",
  lost: "danger",
  subscriber: "default",
  mql: "primary",
  sql: "purple",
  opportunity: "warning",
  customer: "success",
  evangelist: "success",
};

// ─── Size styles ─────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
} as const;

type BadgeSize = keyof typeof SIZE_CLASSES;

// ─── Badge Component ─────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  stage?: string;
  dot?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  stage,
  dot = false,
  className,
  onClick,
}: BadgeProps) {
  const resolvedVariant = stage ? (STAGE_COLORS[stage] ?? "default") : variant;

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap",
        VARIANT_CLASSES[resolvedVariant],
        SIZE_CLASSES[size],
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
    >
      {dot && (
        <span
          className={cn("inline-block h-1.5 w-1.5 rounded-full", {
            "bg-gray-500": resolvedVariant === "default",
            "bg-blue-500": resolvedVariant === "primary",
            "bg-green-500": resolvedVariant === "success",
            "bg-yellow-500": resolvedVariant === "warning",
            "bg-red-500": resolvedVariant === "danger",
            "bg-purple-500": resolvedVariant === "purple",
            "bg-orange-500": resolvedVariant === "orange",
          })}
        />
      )}
      {children}
    </span>
  );
}

// ─── Score Badge ─────────────────────────────────────────────────

interface ScoreBadgeProps {
  score: number;
  size?: BadgeSize;
  className?: string;
}

export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const variant: BadgeVariant =
    score >= 70 ? "success" : score >= 40 ? "warning" : "danger";

  return (
    <Badge variant={variant} size={size} className={className}>
      {score}
    </Badge>
  );
}
