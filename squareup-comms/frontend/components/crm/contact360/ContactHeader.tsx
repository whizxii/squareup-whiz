"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import { useUpdateContact, useNextActions } from "@/lib/hooks/use-crm-queries";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { formatRelativeTime, APP_LOCALE, APP_TIMEZONE } from "@/lib/format";
import type {
  Contact,
  Company,
  LeadScore,
  RelationshipStrength,
  CRMStage,
  STAGES,
  Activity,
  CallRecording,
  CalendarEvent,
  FollowUpSuggestion,
} from "@/lib/types/crm";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  GitMerge,
  ChevronDown,
  ClipboardList,
  Sparkles,
  X,
} from "lucide-react";

// ─── Stage selector colors ──────────────────────────────────────

const STAGE_COLORS: Record<CRMStage, string> = {
  lead: "bg-gray-400 text-white",
  qualified: "bg-blue-500 text-white",
  proposal: "bg-yellow-500 text-black",
  negotiation: "bg-orange-500 text-white",
  won: "bg-green-500 text-white",
  lost: "bg-red-500 text-white",
};

const STAGE_OPTIONS: { id: CRMStage; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

// ─── Relationship ring (SVG) ────────────────────────────────────

function RelationshipRing({
  strength,
  trend,
}: {
  strength: number;
  trend: "warming" | "stable" | "cooling";
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = (strength / 10) * circumference;
  const color =
    strength >= 7
      ? "text-green-500"
      : strength >= 4
        ? "text-yellow-500"
        : "text-red-500";
  const trendArrow =
    trend === "warming" ? "\u2191" : trend === "cooling" ? "\u2193" : "\u2192";

  return (
    <div className="relative inline-flex items-center justify-center" title={`Relationship: ${strength}/10 (${trend})`}>
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          className={cn("stroke-current", color)}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn("absolute text-[10px] font-bold", color)}>
        {trendArrow}
      </span>
    </div>
  );
}

// ─── AI Next-Actions Banner ─────────────────────────────────────

function AIActionsBanner({
  suggestion,
  onLogCall,
  onSchedule,
  onDismiss,
}: {
  suggestion: FollowUpSuggestion;
  onLogCall: () => void;
  onSchedule: () => void;
  onDismiss: () => void;
}) {
  const priorityColor =
    suggestion.priority === "high"
      ? "border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/30"
      : "border-blue-400/50 bg-blue-50/80 dark:bg-blue-950/30";

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border px-3 py-2 flex items-start gap-2",
        priorityColor
      )}
    >
      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug">
          {suggestion.action}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {suggestion.reasoning}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={onLogCall}
            className="text-[11px] text-primary font-medium hover:underline"
          >
            📞 Log Call
          </button>
          <span className="text-muted-foreground text-[11px]">·</span>
          <button
            onClick={onSchedule}
            className="text-[11px] text-primary font-medium hover:underline"
          >
            📅 Schedule
          </button>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Contact Header ─────────────────────────────────────────────

interface ContactHeaderProps {
  contact: Contact;
  company?: Company;
  leadScore?: LeadScore;
  relationship?: RelationshipStrength;
  activities: Activity[];
  recordings: CallRecording[];
  calendarEvents: CalendarEvent[];
  onBack: () => void;
}

export function ContactHeader({
  contact,
  company,
  leadScore,
  relationship,
  activities,
  recordings,
  calendarEvents,
  onBack,
}: ContactHeaderProps) {
  const updateContact = useUpdateContact();
  const openDialog = useCRMUIStore((s) => s.openDialog);
  const [stageOpen, setStageOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: nextActions } = useNextActions(contact.id);
  const topAction = !bannerDismissed ? (nextActions?.[0] ?? null) : null;

  const handleUpdateField = useCallback(
    (field: string, value: string) => {
      updateContact.mutate({
        id: contact.id,
        updates: { [field]: value },
      });
    },
    [contact.id, updateContact]
  );

  const handleStageChange = useCallback(
    (stage: CRMStage) => {
      updateContact.mutate({
        id: contact.id,
        updates: {
          stage,
          stage_changed_at: new Date().toISOString(),
        },
      });
      setStageOpen(false);
    },
    [contact.id, updateContact]
  );

  const lastActivityTime = contact.last_activity_at ?? activities[0]?.created_at;
  const nextEvent = calendarEvents
    .filter((e) => e.status === "scheduled" && new Date(e.start_at) > new Date())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];

  return (
    <div className="border-b border-border bg-background px-6 py-4">
      {/* Back button + breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>CRM</span>
          <span>/</span>
          <span>Contacts</span>
          <span>/</span>
          <span className="text-foreground font-medium">{contact.name}</span>
        </nav>
      </div>

      {/* Main header row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Avatar + info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
            {contact.name.charAt(0).toUpperCase()}
          </div>

          {/* Name, title, company */}
          <div className="min-w-0">
            <InlineEdit
              value={contact.name}
              onSave={(v) => handleUpdateField("name", v)}
              className="text-lg font-display font-bold"
              displayClassName="text-lg"
            />
            <div className="flex items-center gap-1.5 mt-0.5">
              {contact.title && (
                <span className="text-sm text-muted-foreground">
                  {contact.title}
                </span>
              )}
              {contact.title && company && (
                <span className="text-sm text-muted-foreground">@</span>
              )}
              {company && (
                <span className="text-sm text-primary font-medium">
                  {company.name}
                </span>
              )}
            </div>

            {/* Stage + scores */}
            <div className="flex items-center gap-3 mt-2">
              {/* Stage dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStageOpen(!stageOpen)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-opacity hover:opacity-90",
                    STAGE_COLORS[contact.stage]
                  )}
                >
                  {STAGE_OPTIONS.find((s) => s.id === contact.stage)?.label ??
                    contact.stage}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {stageOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setStageOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 z-50 w-40 rounded-lg border border-border bg-popover shadow-lg py-1">
                      {STAGE_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleStageChange(s.id)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2",
                            contact.stage === s.id && "font-semibold"
                          )}
                        >
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              STAGE_COLORS[s.id].split(" ")[0]
                            )}
                          />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Lead score */}
              {leadScore && (
                <div title={`Lead Score: ${leadScore.overall_score} (${leadScore.score_trend})`}>
                  <ScoreBadge score={leadScore.overall_score} size="sm" />
                </div>
              )}

              {/* Relationship ring */}
              {relationship && (
                <RelationshipRing
                  strength={relationship.strength}
                  trend={relationship.sentiment_trend}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="p-2 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Send email"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="p-2 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() =>
              openDialog("log-activity", { contact_id: contact.id, contact_name: contact.name })
            }
            className="p-2 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Log activity (⌘⇧A)"
          >
            <ClipboardList className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              openDialog("create-event", { contact_id: contact.id })
            }
            className="p-2 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Schedule event"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="p-2 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-popover shadow-lg py-1">
                  <button
                    onClick={() => {
                      openDialog("edit-contact", { contactId: contact.id });
                      setMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Contact
                  </button>
                  <button
                    onClick={() => {
                      openDialog("merge-contacts", {
                        contactId: contact.id,
                      });
                      setMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    Merge
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI next-actions banner */}
      {topAction && (
        <AIActionsBanner
          suggestion={topAction}
          onLogCall={() => {
            openDialog("log-activity", { contact_id: contact.id, contact_name: contact.name });
            setBannerDismissed(true);
          }}
          onSchedule={() => {
            openDialog("create-event", { contact_id: contact.id });
            setBannerDismissed(true);
          }}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Live status strip */}
      {(lastActivityTime || nextEvent || recordings.length > 0) && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
          {lastActivityTime && (
            <span className="text-[11px] text-muted-foreground">
              Last activity: {formatRelativeTime(lastActivityTime)}
            </span>
          )}
          {nextEvent && (
            <>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">
                Next event:{" "}
                {new Date(nextEvent.start_at).toLocaleDateString(APP_LOCALE, {
                  month: "short",
                  day: "numeric",
                  timeZone: APP_TIMEZONE,
                })}
              </span>
            </>
          )}
          {recordings.length > 0 && (
            <>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">
                {recordings.length} recording
                {recordings.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
