"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useUpdateContact } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type {
  Contact,
  Company,
  Deal,
  Activity,
  LeadScore,
  RelationshipStrength,
  ContactEnrichment,
  FollowUpSuggestion,
  CalendarEvent,
} from "@/lib/types/crm";
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Globe,
  Tag,
  MapPin,
  Linkedin,
  Twitter,
  Github,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Zap,
  Sparkles,
  ExternalLink,
  PhoneCall,
  FileText,
  Bot,
  Clock,
} from "lucide-react";

// ─── Contact Info Card ──────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  onSave,
  editable = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onSave?: (v: string) => void;
  editable?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        {editable && onSave ? (
          <InlineEdit
            value={value || ""}
            onSave={onSave}
            placeholder={`Add ${label.toLowerCase()}...`}
            className="text-xs"
          />
        ) : (
          <p className="text-xs truncate">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}

// ─── Lead Score Widget ──────────────────────────────────────────

function LeadScoreWidget({ score }: { score: LeadScore }) {
  const trendIcon =
    score.score_trend === "rising" ? (
      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
    ) : score.score_trend === "falling" ? (
      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
    ) : (
      <Minus className="w-3.5 h-3.5 text-gray-400" />
    );

  const scoreColor =
    score.overall_score >= 70
      ? "text-green-600"
      : score.overall_score >= 40
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Lead Score
        </h4>
        <div className="flex items-center gap-1">
          {trendIcon}
          <span className="text-[10px] text-muted-foreground capitalize">
            {score.score_trend}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={cn("text-3xl font-bold font-mono", scoreColor)}>
          {score.overall_score}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2">
        {(
          [
            { label: "Fit", value: score.fit_score, color: "bg-blue-500" },
            {
              label: "Engagement",
              value: score.engagement_score,
              color: "bg-green-500",
            },
            {
              label: "Intent",
              value: score.intent_score,
              color: "bg-purple-500",
            },
          ] as const
        ).map((bar) => (
          <div key={bar.label} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{bar.label}</span>
              <span className="font-medium">{bar.value}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", bar.color)}
                style={{ width: `${bar.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {score.ai_reasoning && (
        <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
          {score.ai_reasoning}
        </p>
      )}
    </div>
  );
}

// ─── Enrichment Panel ───────────────────────────────────────────

function EnrichmentPanel({ enrichment }: { enrichment: ContactEnrichment }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-primary" />
        Enrichment
      </h4>

      {/* Social links */}
      <div className="flex items-center gap-2">
        {enrichment.linkedin_url && (
          <a
            href={enrichment.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
          >
            <Linkedin className="w-3.5 h-3.5" />
          </a>
        )}
        {enrichment.twitter_url && (
          <a
            href={enrichment.twitter_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400 transition-colors"
          >
            <Twitter className="w-3.5 h-3.5" />
          </a>
        )}
        {enrichment.github_url && (
          <a
            href={enrichment.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Bio */}
      {enrichment.headline && (
        <p className="text-xs text-muted-foreground">{enrichment.headline}</p>
      )}

      {/* Location */}
      {enrichment.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {enrichment.location}
        </div>
      )}

      {/* Skills */}
      {enrichment.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {enrichment.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {skill}
            </span>
          ))}
          {enrichment.skills.length > 6 && (
            <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
              +{enrichment.skills.length - 6}
            </span>
          )}
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
        <span>Confidence: {enrichment.confidence_score}%</span>
        <span>Source: {enrichment.source}</span>
      </div>
    </div>
  );
}

// ─── Follow-up Suggestions ──────────────────────────────────────

function FollowUpCard({
  suggestion,
  onSchedule,
}: {
  suggestion: FollowUpSuggestion;
  onSchedule: () => void;
}) {
  const priorityColor = {
    high: "border-l-red-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
  }[suggestion.priority];

  return (
    <div
      className={cn(
        "rounded-lg border border-border border-l-4 p-3 space-y-1.5",
        priorityColor
      )}
    >
      <p className="text-xs font-medium">{suggestion.action}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {suggestion.reasoning}
      </p>
      <button
        onClick={onSchedule}
        className="text-[11px] text-primary font-medium hover:underline"
      >
        Schedule
      </button>
    </div>
  );
}

// ─── Recent Activity Mini-Timeline ──────────────────────────────

const ACTIVITY_ICON_MAP: Record<string, React.ReactNode> = {
  call: <PhoneCall className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  meeting: <Calendar className="w-3 h-3" />,
  note: <FileText className="w-3 h-3" />,
  deal_update: <TrendingUp className="w-3 h-3" />,
  agent_action: <Bot className="w-3 h-3" />,
  follow_up: <Clock className="w-3 h-3" />,
};

function RecentActivities({ activities }: { activities: Activity[] }) {
  const recent = activities.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h4 className="text-xs font-semibold">Recent Activity</h4>
      <div className="space-y-2.5">
        {recent.map((activity) => (
          <div key={activity.id} className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
              {ACTIVITY_ICON_MAP[activity.type] ?? (
                <Zap className="w-3 h-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium truncate">
                {activity.title || activity.type}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatRelativeTime(activity.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────

interface OverviewTabProps {
  contact: Contact;
  company?: Company;
  deals: Deal[];
  activities: Activity[];
  leadScore?: LeadScore;
  relationship?: RelationshipStrength;
  enrichment?: ContactEnrichment;
  followUpSuggestions: FollowUpSuggestion[];
  calendarEvents: CalendarEvent[];
}

export function OverviewTab({
  contact,
  company,
  deals,
  activities,
  leadScore,
  relationship,
  enrichment,
  followUpSuggestions,
  calendarEvents,
}: OverviewTabProps) {
  const updateContact = useUpdateContact();
  const openDialog = useCRMUIStore((s) => s.openDialog);

  const handleUpdateField = useCallback(
    (field: string, value: string) => {
      updateContact.mutate({
        id: contact.id,
        updates: { [field]: value },
      });
    },
    [contact.id, updateContact]
  );

  const nextEvent = calendarEvents
    .filter((e) => e.status === "scheduled" && new Date(e.start_at) > new Date())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
      {/* Left column — Contact info */}
      <div className="lg:col-span-3 space-y-5">
        {/* Contact details card */}
        <div className="rounded-xl border border-border p-4 space-y-1">
          <h4 className="text-xs font-semibold mb-2">Contact Information</h4>
          <InfoRow
            icon={<Mail className="w-3.5 h-3.5" />}
            label="Email"
            value={contact.email}
            onSave={(v) => handleUpdateField("email", v)}
            editable
          />
          <InfoRow
            icon={<Phone className="w-3.5 h-3.5" />}
            label="Phone"
            value={contact.phone}
            onSave={(v) => handleUpdateField("phone", v)}
            editable
          />
          <InfoRow
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Title"
            value={contact.title}
            onSave={(v) => handleUpdateField("title", v)}
            editable
          />
          <InfoRow
            icon={<Building2 className="w-3.5 h-3.5" />}
            label="Company"
            value={contact.company}
          />
          <InfoRow
            icon={<Globe className="w-3.5 h-3.5" />}
            label="Source"
            value={contact.source}
          />
        </div>

        {/* Company card */}
        {company && (
          <div className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Company
            </h4>
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                  {company.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{company.name}</p>
                {company.domain && (
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    {company.domain}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {company.industry && (
                <Badge variant="default" size="sm">
                  {company.industry}
                </Badge>
              )}
              {company.size && (
                <Badge variant="default" size="sm">
                  {company.size} employees
                </Badge>
              )}
              {company.annual_revenue != null && company.annual_revenue > 0 && (
                <Badge variant="primary" size="sm">
                  {formatCurrency(company.annual_revenue)}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="primary" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deals summary */}
        {deals.length > 0 && (
          <div className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Deals ({deals.length})
            </h4>
            <div className="space-y-2">
              {deals.slice(0, 3).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{deal.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge stage={deal.stage} size="sm">
                        {deal.stage}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {deal.probability}%
                      </span>
                    </div>
                  </div>
                  {deal.value != null && (
                    <span className="text-xs font-mono font-semibold text-primary shrink-0 ml-2">
                      {formatCurrency(deal.value, deal.currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column — AI insights */}
      <div className="lg:col-span-2 space-y-5">
        {/* Lead Score */}
        {leadScore && <LeadScoreWidget score={leadScore} />}

        {/* Enrichment */}
        {enrichment && <EnrichmentPanel enrichment={enrichment} />}

        {/* Next scheduled event */}
        {nextEvent && (
          <div className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Next Event
            </h4>
            <div>
              <p className="text-xs font-medium">{nextEvent.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(nextEvent.start_at).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {nextEvent.meeting_url && (
                <a
                  href={nextEvent.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  Join Meeting
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {followUpSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Suggested Actions
            </h4>
            {followUpSuggestions.map((suggestion, i) => (
              <FollowUpCard
                key={i}
                suggestion={suggestion}
                onSchedule={() =>
                  openDialog("create-event", {
                    contact_id: contact.id,
                    title: suggestion.action,
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Recent activity */}
        <RecentActivities activities={activities} />
      </div>
    </div>
  );
}
