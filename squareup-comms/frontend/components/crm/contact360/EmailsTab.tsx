"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useContactEmails,
  useSendEmail,
  useTrackEmailOpen,
  useTrackEmailClick,
  useSequences,
  useContactEnrollments,
  useEnrollInSequence,
} from "@/lib/hooks/use-crm-queries";
import { formatRelativeTime, formatDate, formatTime } from "@/lib/format";
import type { Email } from "@/lib/types/crm";
import {
  Mail,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  MousePointerClick,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Workflow,
  Play,
  Loader2,
} from "lucide-react";

// ─── Direction filter ────────────────────────────────────────────

type DirectionFilter = "all" | "inbound" | "outbound";

// ─── Email Card ──────────────────────────────────────────────────

function EmailCard({ email }: { email: Email }) {
  const [expanded, setExpanded] = useState(false);

  const isOutbound = email.direction === "outbound";
  const timestamp = email.sent_at || email.received_at || email.created_at;

  return (
    <div
      className={cn(
        "rounded-lg border border-border transition-colors",
        isOutbound ? "border-l-blue-500/50 border-l-2" : "border-l-green-500/50 border-l-2"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
      >
        {/* Direction icon */}
        <div
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
            isOutbound
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          )}
        >
          {isOutbound ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownLeft className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium truncate">
              {email.subject || "(No subject)"}
            </p>
            {email.bounced && (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-medium">
                <AlertCircle className="w-2.5 h-2.5" />
                Bounced
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground truncate">
              {isOutbound ? `To: ${email.from_address}` : `From: ${email.from_address}`}
            </span>
            <span className="text-[10px] text-muted-foreground/40">&middot;</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timestamp ? formatRelativeTime(timestamp) : ""}
            </span>
          </div>

          {/* Tracking indicators */}
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={email.status} />
            {email.opened_at && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                <Eye className="w-2.5 h-2.5" />
                Opened
              </span>
            )}
            {email.clicked_at && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400">
                <MousePointerClick className="w-2.5 h-2.5" />
                Clicked
              </span>
            )}
            {email.sequence_id && (
              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                Sequence{email.sequence_step != null ? ` #${email.sequence_step}` : ""}
              </span>
            )}
          </div>

          {/* Preview (collapsed) */}
          {!expanded && email.body_text && (
            <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
              {email.body_text}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Metadata */}
          <div className="py-3 space-y-1 text-[10px] text-muted-foreground">
            <p>
              <span className="font-medium text-foreground/70">From:</span>{" "}
              {email.from_address}
            </p>
            {email.to_addresses && email.to_addresses !== "[]" && (
              <p>
                <span className="font-medium text-foreground/70">To:</span>{" "}
                {formatAddressList(email.to_addresses)}
              </p>
            )}
            {email.cc_addresses && email.cc_addresses !== "[]" && (
              <p>
                <span className="font-medium text-foreground/70">CC:</span>{" "}
                {formatAddressList(email.cc_addresses)}
              </p>
            )}
            {timestamp && (
              <p>
                <span className="font-medium text-foreground/70">Date:</span>{" "}
                {formatDate(timestamp)} at {formatTime(timestamp)}
              </p>
            )}
            {email.thread_id && (
              <p>
                <span className="font-medium text-foreground/70">Thread:</span>{" "}
                {email.thread_id}
              </p>
            )}
          </div>

          {/* Email body */}
          {email.body_html ? (
            <div
              className="prose prose-xs dark:prose-invert max-w-none text-xs"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : email.body_text ? (
            <p className="text-xs leading-relaxed whitespace-pre-wrap">
              {email.body_text}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No content available
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    draft: { className: "bg-muted text-muted-foreground", label: "Draft" },
    sent: { className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Sent" },
    delivered: { className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Delivered" },
    opened: { className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Opened" },
    clicked: { className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Clicked" },
    bounced: { className: "bg-destructive/10 text-destructive", label: "Bounced" },
    replied: { className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Replied" },
  };

  const c = config[status] ?? config.draft;

  return (
    <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", c.className)}>
      {c.label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatAddressList(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join(", ") : raw;
  } catch {
    return raw;
  }
}

// ─── Emails Tab ──────────────────────────────────────────────────

interface EmailsTabProps {
  contactId: string;
}

export function EmailsTab({ contactId }: EmailsTabProps) {
  const [dirFilter, setDirFilter] = useState<DirectionFilter>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollingSeqId, setEnrollingSeqId] = useState<string | null>(null);

  const { data, isLoading } = useContactEmails(contactId);
  const sendEmail = useSendEmail();
  const { data: sequencesData } = useSequences();
  const { data: enrollmentsData } = useContactEnrollments(contactId);
  const enrollInSequence = useEnrollInSequence();

  const sequences = sequencesData ?? [];
  const allEnrollments = enrollmentsData ?? [];
  const activeEnrollments = useMemo(
    () => allEnrollments.filter((e) => e.status === "active"),
    [allEnrollments]
  );
  const enrolledSequenceIds = useMemo(
    () => new Set(activeEnrollments.map((e) => e.sequence_id)),
    [activeEnrollments]
  );

  const emails: Email[] = useMemo(() => {
    const items = data ?? [];
    if (dirFilter === "all") return items;
    return items.filter((e) => e.direction === dirFilter);
  }, [data, dirFilter]);

  const handleSend = useCallback(() => {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedBody && !trimmedSubject) return;

    sendEmail.mutate({
      contact_id: contactId,
      subject: trimmedSubject || undefined,
      body_text: trimmedBody || undefined,
    });
    setSubject("");
    setBody("");
    setComposeOpen(false);
  }, [subject, body, contactId, sendEmail]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={80} className="rounded-lg" />
        ))}
      </div>
    );
  }

  const allEmails = data ?? [];
  const inboundCount = allEmails.filter((e) => e.direction === "inbound").length;
  const outboundCount = allEmails.filter((e) => e.direction === "outbound").length;

  return (
    <div className="p-6 space-y-4">
      {/* Compose section */}
      {composeOpen ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your email... (Cmd+Enter to send)"
            className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setComposeOpen(false);
                setSubject("");
                setBody("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={(!subject.trim() && !body.trim()) || sendEmail.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3 h-3" />
              {sendEmail.isPending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent/30 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Compose Email
        </button>
      )}

      {/* Active enrollment banner */}
      {activeEnrollments.length > 0 && (
        <div className="space-y-2">
          {activeEnrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <Play className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 truncate">
                  Active in sequence &middot; Step {enrollment.current_step}
                </p>
                {enrollment.next_send_at && (
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                    Next send {formatRelativeTime(enrollment.next_send_at)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll in sequence */}
      {enrollOpen ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Enroll in Sequence
          </p>
          {sequences.filter((s) => s.status === "active" && !enrolledSequenceIds.has(s.id)).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {sequences.some((s) => s.status === "active")
                ? "Contact is already enrolled in all active sequences."
                : "No active sequences available."}
            </p>
          ) : (
            <div className="space-y-1">
              {sequences
                .filter((s) => s.status === "active" && !enrolledSequenceIds.has(s.id))
                .map((seq) => (
                  <button
                    key={seq.id}
                    onClick={() => {
                      setEnrollingSeqId(seq.id);
                      enrollInSequence.mutate(
                        { sequenceId: seq.id, contactId },
                        {
                          onSuccess: () => { setEnrollOpen(false); setEnrollingSeqId(null); },
                          onError: () => setEnrollingSeqId(null),
                        }
                      );
                    }}
                    disabled={enrollingSeqId === seq.id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-accent/50 transition-colors disabled:opacity-40"
                  >
                    <Workflow className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{seq.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {seq.steps.length} steps &middot; {seq.total_enrolled} enrolled
                      </p>
                    </div>
                    {enrollingSeqId === seq.id && (
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    )}
                  </button>
                ))}
            </div>
          )}
          <button
            onClick={() => setEnrollOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEnrollOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent/30 transition-colors"
        >
          <Workflow className="w-3.5 h-3.5" />
          Enroll in Sequence
        </button>
      )}

      {/* Filters + count */}
      {allEmails.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Emails ({emails.length})
          </p>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground" />
            {(["all", "inbound", "outbound"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDirFilter(f)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                  dirFilter === f
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all"
                  ? `All (${allEmails.length})`
                  : f === "inbound"
                    ? `In (${inboundCount})`
                    : `Out (${outboundCount})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Email list */}
      {emails.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-6 h-6" />}
          title="No emails yet"
          description="Send an email to start a conversation with this contact."
          action={{
            label: "Compose Email",
            onClick: () => setComposeOpen(true),
          }}
          className="min-h-[200px]"
        />
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <EmailCard key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
}
