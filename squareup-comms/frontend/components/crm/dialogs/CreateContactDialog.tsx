"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  useCreateContact,
  useCreateActivity,
  useCreateCalendarEvent,
  useUpdateContact,
} from "@/lib/hooks/use-crm-queries";
import type { CRMStage } from "@/lib/types/crm";
import { toast } from "@/lib/stores/toast-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

// ─── Constants ───────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;
  else base["X-User-Id"] = getCurrentUserId();
  return base;
}

const LEAD_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "outbound", label: "Outbound" },
  { value: "event", label: "Event" },
  { value: "social_media", label: "Social Media" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "cold_call", label: "Cold Call" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const STAGES: { id: CRMStage; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

// ─── Props ───────────────────────────────────────────────────────

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function CreateContactDialog({
  open,
  onOpenChange,
}: CreateContactDialogProps) {
  const createContact = useCreateContact();
  const createActivity = useCreateActivity();
  const createCalendar = useCreateCalendarEvent();
  const updateContact = useUpdateContact();

  // Core fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<CRMStage>("lead");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  // First interaction (collapsible)
  const [showFirstInteraction, setShowFirstInteraction] = useState(false);
  const [firstMeetDate, setFirstMeetDate] = useState(
    () => new Date().toISOString().slice(0, 16)
  );
  const [firstMeetTldr, setFirstMeetTldr] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [followUpNote, setFollowUpNote] = useState("");

  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setCompany("");
    setPhone("");
    setTitle("");
    setSource("");
    setStage("lead");
    setNotes("");
    setTags("");
    setShowFirstInteraction(false);
    setFirstMeetDate(new Date().toISOString().slice(0, 16));
    setFirstMeetTldr("");
    setFollowUpDate("");
    setFollowUpTime("09:00");
    setFollowUpNote("");
    setError("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");

    try {
      const contact = await createContact.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        title: title.trim() || undefined,
        source: source || undefined,
        stage,
        notes: notes.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      const contactId = contact.id;
      const contactName = name.trim();

      // Log first interaction as an activity
      if (firstMeetTldr.trim()) {
        await createActivity.mutateAsync({
          contact_id: contactId,
          type: "meeting",
          title: "First meeting",
          content: firstMeetTldr.trim(),
          activity_metadata: {
            tldr: firstMeetTldr.trim(),
            activity_date: firstMeetDate,
          },
        });
      }

      // Auto-schedule follow-up
      if (followUpDate && followUpTime) {
        const followUpIso = `${followUpDate}T${followUpTime}:00`;
        const endAt = new Date(new Date(followUpIso).getTime() + 30 * 60_000).toISOString();
        const remindAt = new Date(new Date(followUpIso).getTime() - 15 * 60_000).toISOString();

        await Promise.all([
          createCalendar.mutateAsync({
            contact_id: contactId,
            title: `Follow-up with ${contactName}`,
            event_type: "follow_up",
            start_at: followUpIso,
            end_at: endAt,
            reminder_minutes: 15,
            description: followUpNote.trim() || undefined,
          }),
          updateContact.mutateAsync({
            id: contactId,
            updates: {
              next_follow_up_at: followUpIso,
              follow_up_note: followUpNote.trim() || undefined,
            },
          }),
          fetch(`${API_URL}/api/reminders`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              message: `Follow-up with ${contactName}`,
              remind_at: remindAt,
            }),
          }),
        ]);
      }

      const followUpLabel = followUpDate && followUpTime
        ? new Date(`${followUpDate}T${followUpTime}`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : null;

      toast.success(
        `Contact created`,
        followUpLabel ? `Follow-up scheduled for ${followUpLabel} · Reminder 15 min before` : undefined
      );

      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-y-auto max-h-[90vh]">
          <Dialog.Title className="text-lg font-display font-bold mb-4">
            Add Contact
          </Dialog.Title>

          <div className="space-y-3">
            {/* Name (required) */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              className={inputCls}
              autoFocus
            />

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className={inputCls}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                type="tel"
                className={inputCls}
              />
            </div>

            {/* Company + Job title */}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                className={inputCls}
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Job title"
                className={inputCls}
              />
            </div>

            {/* Stage + Lead source */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                  Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as CRMStage)}
                  className={inputCls}
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                  Lead source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />

            {/* Tags */}
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags: investor, warm, B2B (comma-separated)"
              className={inputCls}
            />

            {/* First Interaction (collapsible) */}
            {showFirstInteraction ? (
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  First Interaction
                </p>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    When did you meet?
                  </label>
                  <input
                    type="datetime-local"
                    value={firstMeetDate}
                    onChange={(e) => setFirstMeetDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <input
                  value={firstMeetTldr}
                  onChange={(e) => setFirstMeetTldr(e.target.value)}
                  placeholder="What did you discuss? (TLDR)"
                  className={inputCls}
                />
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Schedule follow-up
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                {followUpDate && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                    ✓ Calendar event + 15-min reminder will be auto-created
                  </div>
                )}
                <input
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Follow-up note (optional)"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowFirstInteraction(false);
                    setFirstMeetTldr("");
                    setFollowUpDate("");
                    setFollowUpNote("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  − Remove first interaction
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFirstInteraction(true)}
                className="text-xs text-primary hover:underline text-left"
              >
                + Add first interaction details
              </button>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createContact.isPending || !name.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                {createContact.isPending ? "Creating..." : "Add Contact"}
              </button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
