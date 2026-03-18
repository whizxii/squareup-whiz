"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMeetingPrep } from "@/lib/hooks/use-crm-queries";
import { formatRelativeTime } from "@/lib/format";
import type { MeetingPrep, ActionItem } from "@/lib/types/crm";
import {
  BookOpen,
  Building2,
  Briefcase,
  MessageCircle,
  CheckSquare,
  Target,
  ShieldAlert,
  Heart,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react";

// ─── Section Card ────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border p-4 space-y-2.5", className)}>
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

// ─── Action Item Row ─────────────────────────────────────────────

function ActionItemRow({ item }: { item: ActionItem }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <CheckSquare
        className={cn(
          "w-3.5 h-3.5 mt-0.5 shrink-0",
          item.is_completed ? "text-green-500" : "text-muted-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs", item.is_completed && "line-through text-muted-foreground")}>
          {item.text}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.assignee && (
            <span className="text-[10px] text-muted-foreground">{item.assignee}</span>
          )}
          {item.due_date && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {item.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Strength Indicator ──────────────────────────────────────────

function StrengthIndicator({ strength }: { strength: number }) {
  const normalized = Math.min(Math.max(strength, 0), 10);
  const percentage = normalized * 10;
  const color =
    normalized >= 7 ? "bg-green-500" : normalized >= 4 ? "bg-yellow-500" : "bg-red-500";
  const label =
    normalized >= 7 ? "Strong" : normalized >= 4 ? "Moderate" : "Weak";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{normalized}/10</span>
      <Badge
        variant={normalized >= 7 ? "success" : normalized >= 4 ? "warning" : "danger"}
        size="sm"
      >
        {label}
      </Badge>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function MeetingPrepSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton height={20} width="40%" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={120} className="rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────

interface MeetingPrepPanelProps {
  eventId: string;
}

export function MeetingPrepPanel({ eventId }: MeetingPrepPanelProps) {
  const { data, isLoading, error } = useMeetingPrep(eventId, { enabled: !!eventId });

  if (isLoading) return <MeetingPrepSkeleton />;

  const prep = data;

  if (error || !prep) {
    return (
      <div className="rounded-xl border border-border p-6 text-center space-y-2">
        <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          {error ? "Failed to load meeting prep." : "No prep data available."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Meeting Prep
        </h3>
        {prep.prepared_at && (
          <span className="text-[10px] text-muted-foreground">
            Prepared {formatRelativeTime(prep.prepared_at)}
          </span>
        )}
      </div>

      {/* Relationship strength */}
      <SectionCard
        icon={<Heart className="w-3.5 h-3.5 text-pink-500" />}
        title="Relationship Strength"
      >
        <StrengthIndicator strength={prep.relationship_strength} />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact summary */}
        <SectionCard
          icon={<BookOpen className="w-3.5 h-3.5 text-blue-500" />}
          title="Contact Summary"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            {prep.contact_summary}
          </p>
        </SectionCard>

        {/* Company overview */}
        <SectionCard
          icon={<Building2 className="w-3.5 h-3.5 text-purple-500" />}
          title="Company Overview"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            {prep.company_overview}
          </p>
        </SectionCard>
      </div>

      {/* Deal status */}
      {prep.deal_status && (
        <SectionCard
          icon={<Briefcase className="w-3.5 h-3.5 text-green-500" />}
          title="Deal Status"
        >
          <p className="text-xs text-muted-foreground">{prep.deal_status}</p>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Talking points */}
        <SectionCard
          icon={<Target className="w-3.5 h-3.5 text-primary" />}
          title="Talking Points"
        >
          <ul className="space-y-1.5">
            {prep.talking_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary font-medium mt-px">{i + 1}.</span>
                {point}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Potential objections */}
        <SectionCard
          icon={<ShieldAlert className="w-3.5 h-3.5 text-orange-500" />}
          title="Potential Objections"
        >
          <ul className="space-y-1.5">
            {prep.potential_objections.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-orange-500 font-medium mt-px">!</span>
                {obj}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Recent interactions */}
      {prep.recent_interactions.length > 0 && (
        <SectionCard
          icon={<MessageCircle className="w-3.5 h-3.5 text-sky-500" />}
          title="Recent Interactions"
        >
          <div className="space-y-1.5">
            {prep.recent_interactions.map((interaction, i) => (
              <p key={i} className="text-xs text-muted-foreground border-l-2 border-sky-200 dark:border-sky-800 pl-2">
                {interaction}
              </p>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Open action items */}
      {prep.open_action_items.length > 0 && (
        <SectionCard
          icon={<CheckSquare className="w-3.5 h-3.5 text-green-500" />}
          title="Open Action Items"
        >
          <div className="divide-y divide-border">
            {prep.open_action_items.map((item, i) => (
              <ActionItemRow key={i} item={item} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
