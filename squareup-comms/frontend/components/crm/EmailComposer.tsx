"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSendEmail, useContacts } from "@/lib/hooks/use-crm-queries";
import type { EmailSendPayload } from "@/lib/types/crm";
import {
  Send,
  X,
  User,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface EmailComposerProps {
  /** Pre-fill contact ID if composing for a specific contact */
  contactId?: string;
  /** Pre-fill deal ID if composing in deal context */
  dealId?: string;
  /** Pre-fill subject (e.g., for replies) */
  defaultSubject?: string;
  /** Pre-fill body */
  defaultBody?: string;
  /** Thread ID if replying to a thread */
  threadId?: string;
  /** Sequence context */
  sequenceId?: string;
  sequenceStep?: number;
  /** Called after successful send */
  onSent?: () => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Compact mode hides some optional fields */
  compact?: boolean;
}

// ─── Contact Search ──────────────────────────────────────────────

function ContactSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (contactId: string, label: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useContacts(
    { search: query },
    { cursor: undefined, limit: 10 }
  );

  const contacts = data?.items ?? [];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={value || query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search contacts..."
          className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
        />
      </div>

      {open && contacts.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-6 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c.id, c.name || c.email || c.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-medium">
                {(c.name || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{c.name}</p>
                {c.email && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {c.email}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Email Composer ──────────────────────────────────────────────

export function EmailComposer({
  contactId: initialContactId,
  dealId,
  defaultSubject = "",
  defaultBody = "",
  threadId,
  sequenceId,
  sequenceStep,
  onSent,
  onCancel,
  compact = false,
}: EmailComposerProps) {
  const [contactId, setContactId] = useState(initialContactId || "");
  const [contactLabel, setContactLabel] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [bodyText, setBodyText] = useState(defaultBody);
  const [showCc, setShowCc] = useState(false);
  const [toAddresses, setToAddresses] = useState("");
  const [ccAddresses, setCcAddresses] = useState("");

  const sendEmail = useSendEmail();

  const canSend = useMemo(
    () => contactId && (subject.trim() || bodyText.trim()),
    [contactId, subject, bodyText]
  );

  const handleSend = useCallback(() => {
    if (!canSend) return;

    const payload: EmailSendPayload = {
      contact_id: contactId,
      subject: subject.trim() || undefined,
      body_text: bodyText.trim() || undefined,
      deal_id: dealId,
      thread_id: threadId,
      sequence_id: sequenceId,
      sequence_step: sequenceStep,
      to_addresses: toAddresses
        ? toAddresses.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
      cc_addresses: ccAddresses
        ? ccAddresses.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
    };

    sendEmail.mutate(payload, {
      onSuccess: () => {
        setSubject("");
        setBodyText("");
        setToAddresses("");
        setCcAddresses("");
        onSent?.();
      },
    });
  }, [
    canSend,
    contactId,
    subject,
    bodyText,
    dealId,
    threadId,
    sequenceId,
    sequenceStep,
    toAddresses,
    ccAddresses,
    sendEmail,
    onSent,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
        <p className="text-xs font-medium">New Email</p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Contact selector (unless pre-filled) */}
        {!initialContactId && (
          <ContactSearch
            value={contactLabel}
            onChange={(id, label) => {
              setContactId(id);
              setContactLabel(label);
            }}
          />
        )}

        {/* To field */}
        {!compact && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6 text-right">
              To
            </span>
            <input
              type="text"
              value={toAddresses}
              onChange={(e) => setToAddresses(e.target.value)}
              placeholder="Comma-separated email addresses"
              className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
            />
            <button
              onClick={() => setShowCc((v) => !v)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCc ? <ChevronUp className="w-3 h-3" /> : "CC"}
            </button>
          </div>
        )}

        {/* CC field */}
        {showCc && !compact && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6 text-right">
              CC
            </span>
            <input
              type="text"
              value={ccAddresses}
              onChange={(e) => setCcAddresses(e.target.value)}
              placeholder="Comma-separated CC addresses"
              className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
            />
          </div>
        )}

        {/* Subject */}
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
        />

        {/* Body */}
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your email... (Cmd+Enter to send)"
          className="w-full min-h-[150px] px-3 py-2 rounded-lg border border-border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30 leading-relaxed"
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Attach file (coming soon)"
              disabled
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            {threadId && (
              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                Reply in thread
              </span>
            )}
            {sequenceId && (
              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                Sequence step {sequenceStep ?? "?"}
              </span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend || sendEmail.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {sendEmail.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            {sendEmail.isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
