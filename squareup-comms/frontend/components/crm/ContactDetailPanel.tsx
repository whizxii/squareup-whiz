"use client";

import { useState, useCallback } from "react";
import {
  useCRMStore,
  STAGES,
  type Contact,
  type Activity,
  type ActivityType,
  type CRMStage,
} from "@/lib/stores/crm-store";
import {
  X,
  Mail,
  Phone,
  Copy,
  Check,
  ChevronRight,
  MessageSquarePlus,
  PhoneCall,
  Calendar,
  FileText,
  TrendingUp,
  Bot,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { parseUtcDate } from "@/lib/format";

// ─── Stage colors ────────────────────────────────────────────────

const STAGE_COLORS: Record<CRMStage, string> = {
  lead: "bg-gray-400 text-white",
  qualified: "bg-blue-500 text-white",
  proposal: "bg-yellow-500 text-black",
  negotiation: "bg-orange-500 text-white",
  won: "bg-green-500 text-white",
  lost: "bg-red-500 text-white",
};

const STAGE_ORDER: CRMStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
];

// ─── Activity rendering ─────────────────────────────────────────

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <PhoneCall className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  meeting: <Calendar className="w-3.5 h-3.5" />,
  note: <FileText className="w-3.5 h-3.5" />,
  deal_update: <TrendingUp className="w-3.5 h-3.5" />,
  agent_action: <Bot className="w-3.5 h-3.5" />,
  follow_up: <Clock className="w-3.5 h-3.5" />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  email: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  meeting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  note: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  deal_update: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  agent_action: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  follow_up: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="flex gap-3 group">
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          ACTIVITY_COLORS[activity.type]
        )}
      >
        {ACTIVITY_ICONS[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {activity.title || activity.type}
        </p>
        {activity.content && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {activity.content}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(parseUtcDate(activity.created_at), {
              addSuffix: true,
            })}
          </span>
          {activity.performer_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">
                &middot;
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  activity.performer_type === "agent"
                    ? "text-blue-500 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {activity.performer_name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contact Detail Panel ────────────────────────────────────────

interface ContactDetailPanelProps {
  contact: Contact;
  activities: Activity[];
  onClose: () => void;
  onLogActivity: () => void;
}

export function ContactDetailPanel({
  contact,
  activities,
  onClose,
  onLogActivity,
}: ContactDetailPanelProps) {
  const updateContact = useCRMStore((s) => s.updateContact);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleMoveToNextStage = useCallback(() => {
    const currentIndex = STAGE_ORDER.indexOf(contact.stage);
    if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 1) return;
    const nextStage = STAGE_ORDER[currentIndex + 1];
    updateContact(contact.id, {
      stage: nextStage,
      stage_changed_at: new Date().toISOString(),
    });
  }, [contact.id, contact.stage, updateContact]);

  const stageLabel = (stage: CRMStage) =>
    STAGES.find((s) => s.id === stage)?.label || stage;

  return (
    <div className="w-80 h-full overflow-y-auto scrollbar-thin">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-display font-bold">Contact Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-display font-bold text-sm">{contact.name}</p>
            {contact.title && (
              <p className="text-xs text-muted-foreground">{contact.title}</p>
            )}
            {contact.company && (
              <p className="text-xs text-muted-foreground">{contact.company}</p>
            )}
          </div>
        </div>

        {/* Email & Phone */}
        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{contact.email}</span>
              </div>
              <button
                onClick={() => handleCopy(contact.email!, "email")}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Copy email"
              >
                {copiedField === "email" ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{contact.phone}</span>
              </div>
              <button
                onClick={() => handleCopy(contact.phone!, "phone")}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Copy phone"
              >
                {copiedField === "phone" ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Stage badge */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Stage
          </p>
          <span
            className={cn(
              "inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize",
              STAGE_COLORS[contact.stage]
            )}
          >
            {stageLabel(contact.stage)}
          </span>
        </div>

        {/* Deal value */}
        {contact.value != null && contact.value > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Deal Value
            </p>
            <p className="text-lg font-mono font-semibold text-primary">
              {formatCurrency(contact.value, contact.currency)}
            </p>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Notes
          </p>
          <textarea
            value={contact.notes || ""}
            onChange={(e) =>
              updateContact(contact.id, { notes: e.target.value })
            }
            placeholder="Add notes about this contact..."
            className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
          />
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Quick Actions
          </p>
          <button
            onClick={handleMoveToNextStage}
            disabled={contact.stage === "won" || contact.stage === "lost"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            Move to next stage
          </button>
          <button
            onClick={onLogActivity}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Log activity
          </button>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Activity ({activities.length})
          </p>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="flex items-center justify-center h-20 border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
