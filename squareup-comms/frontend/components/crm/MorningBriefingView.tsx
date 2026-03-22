"use client";

/**
 * Morning Briefing — personalized AI-powered daily summary with
 * attention items, pipeline KPIs, and today's meetings.
 */

import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Flame,
  RefreshCw,
  Sparkles,
  Sun,
  UserX,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useMorningBriefing } from "@/lib/hooks/use-crm-queries";
import type { BriefingItem, MorningBriefing } from "@/lib/types/crm";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";

// ─── Priority badge ──────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low
      }`}
    >
      {priority}
    </span>
  );
}

// ─── Category icon ───────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  deal_risk: <AlertTriangle className="w-4 h-4 text-red-500" />,
  stale_contact: <UserX className="w-4 h-4 text-amber-500" />,
  hot_lead: <Flame className="w-4 h-4 text-orange-500" />,
  meeting: <Calendar className="w-4 h-4 text-blue-500" />,
  action: <Sparkles className="w-4 h-4 text-purple-500" />,
};

// ─── Attention Item Card ─────────────────────────────────────

function AttentionCard({
  item,
  onNavigate,
}: {
  item: BriefingItem;
  onNavigate: (entityType: string, entityId: string) => void;
}) {
  const canNavigate = item.entity_id && item.entity_type;

  return (
    <div
      className={`group rounded-lg border border-border bg-card/60 p-4 space-y-2 transition-colors ${
        canNavigate ? "hover:bg-card cursor-pointer" : ""
      }`}
      onClick={() => {
        if (canNavigate) onNavigate(item.entity_type!, item.entity_id!);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS.action}
          <span className="text-sm font-medium leading-tight">{item.title}</span>
        </div>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="text-xs text-muted-foreground pl-6">{item.description}</p>
      {item.actions.length > 0 && (
        <div className="flex gap-2 pl-6 pt-1">
          {item.actions.map((action) => (
            <button
              key={action}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
            >
              {action}
            </button>
          ))}
        </div>
      )}
      {canNavigate && (
        <ChevronRight className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

// ─── Pipeline KPI strip ──────────────────────────────────────

function PipelineStrip({ briefing }: { briefing: MorningBriefing }) {
  const s = briefing.pipeline_summary;
  const kpis = [
    { label: "Open Deals", value: String(s.open_deals) },
    { label: "Pipeline Value", value: formatCurrency(s.total_pipeline_value) },
    { label: "Avg Deal", value: formatCurrency(s.avg_deal_value) },
    { label: "Won This Month", value: String(s.won_this_month) },
    { label: "Won Revenue", value: formatCurrency(s.won_value_this_month) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border border-border bg-card/60 p-3 text-center">
          <div className="text-lg font-bold tracking-tight">{kpi.value}</div>
          <div className="text-[11px] text-muted-foreground">{kpi.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Today's meetings ────────────────────────────────────────

function MeetingsList({ briefing }: { briefing: MorningBriefing }) {
  const meetings = briefing.todays_meetings;

  if (meetings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No meetings scheduled today.</p>
    );
  }

  return (
    <div className="space-y-2">
      {meetings.map((m) => {
        const start = new Date(m.start_at);
        const timeStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-4 py-3"
          >
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m.title}</div>
              <div className="text-xs text-muted-foreground">{m.event_type}</div>
            </div>
            <span className="text-xs font-mono text-muted-foreground shrink-0">{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary counters ────────────────────────────────────────

function SummaryCounters({ briefing }: { briefing: MorningBriefing }) {
  const counters = [
    {
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      label: "Hot Leads",
      value: briefing.hot_leads_count,
    },
    {
      icon: <UserX className="w-4 h-4 text-amber-500" />,
      label: "Stale Contacts",
      value: briefing.stale_contacts_count,
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      label: "At-Risk Deals",
      value: briefing.at_risk_deals_count,
    },
  ];

  return (
    <div className="flex gap-4">
      {counters.map((c) => (
        <div key={c.label} className="flex items-center gap-2">
          {c.icon}
          <span className="text-sm font-medium">{c.value}</span>
          <span className="text-xs text-muted-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────

function BriefingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-md bg-muted/40" />
      <div className="h-4 w-48 rounded-md bg-muted/40" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/40" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted/40" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function MorningBriefingView() {
  const { data: briefing, isLoading, refetch, isRefetching } = useMorningBriefing();
  const setActiveView = useCRMUIStore((s) => s.setActiveView);

  const handleNavigate = (entityType: string, entityId: string) => {
    if (entityType === "contact") {
      // Navigate to contact 360
      window.location.hash = `#contact/${entityId}`;
    } else if (entityType === "deal") {
      setActiveView("pipeline");
    } else if (entityType === "event") {
      setActiveView("calendar");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <BriefingSkeleton />
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-muted-foreground">
        <Sun className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p>Unable to load briefing. Try refreshing.</p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const highPriorityItems = briefing.attention_items.filter((i) => i.priority === "high");
  const otherItems = briefing.attention_items.filter((i) => i.priority !== "high");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Greeting header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sun className="w-6 h-6 text-amber-500" />
            {briefing.greeting}
          </h1>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{briefing.date}</p>
      </div>

      {/* Summary counters */}
      <SummaryCounters briefing={briefing} />

      {/* Pipeline KPIs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Pipeline Summary
        </h2>
        <PipelineStrip briefing={briefing} />
      </div>

      {/* High priority attention items */}
      {highPriorityItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Needs Immediate Attention ({highPriorityItems.length})
          </h2>
          <div className="space-y-2">
            {highPriorityItems.map((item, idx) => (
              <AttentionCard key={idx} item={item} onNavigate={handleNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Other attention items */}
      {otherItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Other Items ({otherItems.length})
          </h2>
          <div className="space-y-2">
            {otherItems.map((item, idx) => (
              <AttentionCard key={idx} item={item} onNavigate={handleNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Today's meetings */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Today&apos;s Meetings ({briefing.todays_meetings.length})
        </h2>
        <MeetingsList briefing={briefing} />
      </div>
    </div>
  );
}
