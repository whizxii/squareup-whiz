"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatRelativeTime } from "@/lib/format";
import {
  useHotLeads,
  useScoreContact,
  useDashboardActions,
} from "@/lib/hooks/use-crm-queries";
import type { Contact, FollowUpSuggestion } from "@/lib/types/crm";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Zap,
  UserCheck,
  AlertTriangle,
  Clock,
} from "lucide-react";

// ─── Score tier helpers ──────────────────────────────────────────

type ScoreTier = "hot" | "warm" | "cold";

function getScoreTier(score: number): ScoreTier {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

const TIER_CONFIG: Record<ScoreTier, { label: string; color: string; bg: string; border: string }> = {
  hot: {
    label: "Hot",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
  },
  warm: {
    label: "Warm",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  cold: {
    label: "Cold",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
  },
};

// ─── Lead Row ────────────────────────────────────────────────────

function LeadRow({
  contact,
  onSelect,
  onRescore,
  isRescoring,
}: {
  contact: Contact;
  onSelect: () => void;
  onRescore: () => void;
  isRescoring: boolean;
}) {
  const tier = getScoreTier(contact.lead_score);
  const config = TIER_CONFIG[tier];

  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
        {(contact.name ?? "?")[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{contact.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {contact.title ? `${contact.title}` : ""}
          {contact.title && contact.company ? " at " : ""}
          {contact.company ?? ""}
        </p>
      </div>

      {/* Stage */}
      <Badge stage={contact.stage} size="sm">
        {contact.stage}
      </Badge>

      {/* Score */}
      <div className="flex items-center gap-2">
        <ScoreBadge score={contact.lead_score} size="sm" />
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.bg, config.color)}>
          {config.label}
        </span>
      </div>

      {/* Relationship strength bar */}
      <div className="w-16 hidden md:block">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all"
            style={{ width: `${Math.min(contact.relationship_strength * 10, 100)}%` }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground text-center mt-0.5">
          Rel: {contact.relationship_strength}/10
        </p>
      </div>

      {/* Last activity */}
      <div className="hidden lg:block text-right w-20">
        <p className="text-[10px] text-muted-foreground">
          {contact.last_activity_at ? formatRelativeTime(contact.last_activity_at) : "No activity"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRescore();
          }}
          disabled={isRescoring}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all disabled:opacity-50"
          title="Re-score lead"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isRescoring && "animate-spin")} />
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────

function StatsCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold font-mono">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Actions ───────────────────────────────────────────

function ActionCard({ suggestion }: { suggestion: FollowUpSuggestion }) {
  const priorityColor = {
    high: "border-l-red-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
  }[suggestion.priority];

  return (
    <div className={cn("rounded-lg border border-border border-l-4 p-3 space-y-1", priorityColor)}>
      <p className="text-xs font-medium">{suggestion.action}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>
      {suggestion.suggested_date && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(suggestion.suggested_date)}
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function LeadScoringLoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={80} className="rounded-xl" />
        ))}
      </div>
      <Skeleton height={24} width="30%" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={56} />
      ))}
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────

export function LeadScoringView() {
  const [tierFilter, setTierFilter] = useState<ScoreTier | "all">("all");
  const setSelectedContactId = useCRMUIStore((s) => s.setSelectedContactId);

  const { data: hotLeads, isLoading: leadsLoading } = useHotLeads();
  const { data: dashboardActions, isLoading: actionsLoading } = useDashboardActions();
  const scoreMutation = useScoreContact();

  const leads = (hotLeads as Contact[] | undefined) ?? [];

  // Filter by tier
  const filtered = tierFilter === "all"
    ? leads
    : leads.filter((c) => getScoreTier(c.lead_score) === tierFilter);

  // Stats
  const hotCount = leads.filter((c) => c.lead_score >= 70).length;
  const warmCount = leads.filter((c) => c.lead_score >= 40 && c.lead_score < 70).length;
  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((sum, c) => sum + c.lead_score, 0) / leads.length)
    : 0;

  const actions = (dashboardActions as FollowUpSuggestion[] | undefined) ?? [];

  if (leadsLoading) return <LeadScoringLoadingSkeleton />;

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="No scored leads yet"
          description="AI lead scoring will populate once contacts are added and scored."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Lead Scoring
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Contacts scored by fit, engagement, and intent signals.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            icon={<Zap className="w-5 h-5 text-green-600" />}
            label="Hot leads (70+)"
            value={hotCount}
            color="bg-green-100 dark:bg-green-900/30"
          />
          <StatsCard
            icon={<UserCheck className="w-5 h-5 text-yellow-600" />}
            label="Warm leads (40-69)"
            value={warmCount}
            color="bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatsCard
            icon={<Target className="w-5 h-5 text-blue-600" />}
            label="Avg lead score"
            value={avgScore}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lead list */}
          <div className="flex-1">
            {/* Tier filter */}
            <div className="flex items-center gap-2 mb-3">
              {(["all", "hot", "warm", "cold"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    tierFilter === tier
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {tier === "all" ? "All" : TIER_CONFIG[tier].label}
                  {tier !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({leads.filter((c) => getScoreTier(c.lead_score) === tier).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
              <div className="w-9 shrink-0" />
              <div className="flex-1">Contact</div>
              <div className="w-20">Stage</div>
              <div className="w-24">Score</div>
              <div className="w-16 hidden md:block text-center">Strength</div>
              <div className="w-20 hidden lg:block text-right">Last active</div>
              <div className="w-14" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {filtered.map((contact) => (
                <LeadRow
                  key={contact.id}
                  contact={contact}
                  onSelect={() => setSelectedContactId(contact.id)}
                  onRescore={() => scoreMutation.mutate(contact.id)}
                  isRescoring={scoreMutation.isPending}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No leads match this filter.
              </div>
            )}
          </div>

          {/* AI Actions sidebar */}
          {actions.length > 0 && (
            <div className="lg:w-80 shrink-0">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                AI Suggested Actions
              </h3>
              <div className="space-y-2">
                {actions.slice(0, 6).map((action, i) => (
                  <ActionCard key={i} suggestion={action} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
