"use client";

import { useState, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles } from "lucide-react";
import {
  useCreateContact,
  useCreateActivity,
  useCreateCalendarEvent,
  useUpdateContact,
} from "@/lib/hooks/use-crm-queries";
import { useCreateReminder } from "@/lib/hooks/use-tasks-queries";
import { crmApi } from "@/lib/api/crm-api";
import type { CRMStage } from "@/lib/types/crm";
import { toast } from "@/lib/stores/toast-store";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/format";

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

/** Return current IST wall-clock time as "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
function nowIstLocal(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: APP_TIMEZONE }).slice(0, 16);
}

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
  const createReminder = useCreateReminder();

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
  const [createDeal, setCreateDeal] = useState(true);

  // AI suggestion state
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Set<string>>(new Set());
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAiSuggest = useCallback(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      const nameVal = name.trim();
      const emailVal = email.trim();
      const companyVal = company.trim();
      if (!nameVal && !emailVal) return;

      setAiSuggesting(true);
      try {
        const suggestions = await crmApi.suggestFields({
          name: nameVal || undefined,
          email: emailVal || undefined,
          company: companyVal || undefined,
        });
        if (!suggestions || Object.keys(suggestions).length === 0) return;

        const filled = new Set<string>();
        if (suggestions.company && typeof suggestions.company === "string" && !companyVal) {
          setCompany(suggestions.company);
          filled.add("company");
        }
        if (suggestions.title && typeof suggestions.title === "string" && !title.trim()) {
          setTitle(suggestions.title);
          filled.add("title");
        }
        if (suggestions.source && typeof suggestions.source === "string" && !source) {
          const match = LEAD_SOURCES.find((s) => s.value === suggestions.source);
          if (match) {
            setSource(match.value);
            filled.add("source");
          }
        }
        if (Array.isArray(suggestions.tags) && suggestions.tags.length > 0 && !tags.trim()) {
          setTags(suggestions.tags.join(", "));
          filled.add("tags");
        }
        if (suggestions.notes && typeof suggestions.notes === "string" && !notes.trim()) {
          setNotes(suggestions.notes);
          filled.add("notes");
        }
        if (filled.size > 0) {
          setAiSuggestedFields(filled);
        }
      } catch {
        // Best-effort — silently ignore failures
      } finally {
        setAiSuggesting(false);
      }
    }, 600);
  }, [name, email, company, title, source, tags, notes]);

  // First interaction (collapsible)
  const [showFirstInteraction, setShowFirstInteraction] = useState(false);
  const [firstMeetDate, setFirstMeetDate] = useState(nowIstLocal);
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
    setCreateDeal(true);
    setShowFirstInteraction(false);
    setFirstMeetDate(nowIstLocal());
    setFirstMeetTldr("");
    setFollowUpDate("");
    setFollowUpTime("09:00");
    setFollowUpNote("");
    setError("");
    setAiSuggesting(false);
    setAiSuggestedFields(new Set());
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
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
        auto_create_deal: createDeal,
      } as Record<string, unknown>);

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

      // Auto-schedule follow-up (failures here should NOT mask contact creation)
      let followUpScheduled = false;
      if (followUpDate && followUpTime) {
        try {
          const followUpIso = `${followUpDate}T${followUpTime}:00`;
          // Build end_at and remindAt in same naive format (no timezone)
          const pad = (n: number) => String(n).padStart(2, "0");
          const toLocalIso = (d: Date) =>
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

          const startMs = new Date(followUpIso).getTime();
          const endAt = toLocalIso(new Date(startMs + 30 * 60_000));
          const remindAt = toLocalIso(new Date(startMs - 15 * 60_000));

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
            createReminder.mutateAsync({
              message: `Follow-up with ${contactName}`,
              remind_at: remindAt,
            }),
          ]);
          followUpScheduled = true;
        } catch (followUpErr) {
          console.error("Follow-up scheduling failed:", followUpErr);
        }
      }

      const followUpLabel = followUpDate && followUpTime
        ? new Date(`${followUpDate}T${followUpTime}`).toLocaleDateString(APP_LOCALE, {
            month: "short",
            day: "numeric",
            timeZone: APP_TIMEZONE,
          })
        : null;

      toast.success(
        `Contact created`,
        followUpScheduled && followUpLabel
          ? `Follow-up scheduled for ${followUpLabel} · Reminder 15 min before`
          : followUpLabel
            ? `Contact saved, but follow-up scheduling failed`
            : undefined
      );

      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    }
  };

  /** Clear a field from the AI-suggested set when user manually edits it. */
  const clearAiField = (field: string) => {
    if (aiSuggestedFields.has(field)) {
      setAiSuggestedFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20";
  const aiInputCls = (field: string) =>
    `${inputCls}${aiSuggestedFields.has(field) ? " border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-950/20" : ""}`;

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
          <Dialog.Title className="text-lg font-display font-bold mb-1">
            Add Contact
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground mb-4">
            Add a new contact to your CRM.
          </Dialog.Description>

          <div className="space-y-3">
            {/* Name (required) */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={triggerAiSuggest}
              placeholder="Full name *"
              className={inputCls}
              autoFocus
            />

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={triggerAiSuggest}
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

            {/* AI suggestion status */}
            {aiSuggesting && (
              <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>AI is suggesting fields...</span>
              </div>
            )}
            {!aiSuggesting && aiSuggestedFields.size > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                <Sparkles className="w-3 h-3" />
                <span>AI suggested {aiSuggestedFields.size} field{aiSuggestedFields.size > 1 ? "s" : ""} — edit to override</span>
              </div>
            )}

            {/* Company + Job title */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  value={company}
                  onChange={(e) => { setCompany(e.target.value); clearAiField("company"); }}
                  placeholder="Company"
                  className={aiInputCls("company")}
                />
                {aiSuggestedFields.has("company") && (
                  <Sparkles className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-500" />
                )}
              </div>
              <div className="relative">
                <input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearAiField("title"); }}
                  placeholder="Job title"
                  className={aiInputCls("title")}
                />
                {aiSuggestedFields.has("title") && (
                  <Sparkles className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-500" />
                )}
              </div>
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
                  {aiSuggestedFields.has("source") && (
                    <Sparkles className="inline ml-1 w-3 h-3 text-violet-500" />
                  )}
                </label>
                <select
                  value={source}
                  onChange={(e) => { setSource(e.target.value); clearAiField("source"); }}
                  className={aiInputCls("source")}
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
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); clearAiField("notes"); }}
                placeholder="Notes (optional)"
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none ${aiSuggestedFields.has("notes") ? "border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-950/20" : "border-border"}`}
              />
              {aiSuggestedFields.has("notes") && (
                <Sparkles className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-violet-500" />
              )}
            </div>

            {/* Tags */}
            <div className="relative">
              <input
                value={tags}
                onChange={(e) => { setTags(e.target.value); clearAiField("tags"); }}
                placeholder="Tags: investor, warm, B2B (comma-separated)"
                className={aiInputCls("tags")}
              />
              {aiSuggestedFields.has("tags") && (
                <Sparkles className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-500" />
              )}
            </div>

            {/* Pipeline toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={createDeal}
                onChange={(e) => setCreateDeal(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground text-xs">
                Also add to sales pipeline
              </span>
            </label>

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
