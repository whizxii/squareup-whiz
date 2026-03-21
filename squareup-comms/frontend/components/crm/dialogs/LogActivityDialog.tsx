"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Phone, Mail, Users, FileText, Calendar, Paperclip, Upload, FileAudio, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import {
  useCreateActivity,
  useCreateCalendarEvent,
  useUpdateContact,
  useUploadRecording,
  useContact,
  useContacts,
  useAICopilot,
} from "@/lib/hooks/use-crm-queries";
import type { Contact } from "@/lib/types/crm";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/stores/toast-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import type { ActivityType } from "@/lib/types/crm";

// ─── Constants ────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;
  else base["X-User-Id"] = getCurrentUserId();
  return base;
}

const ACCEPTED_TYPES = ".mp3,.wav,.webm,.m4a,.ogg,.mp4,.flac";
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/webm", "audio/x-m4a",
  "audio/ogg", "audio/flac", "audio/mp4", "video/mp4", "video/webm",
]);

// Primary pill types — map 1:1 to ActivityType
const PRIMARY_TYPES: { value: ActivityType; label: string; icon: typeof Phone }[] = [
  { value: "call",      label: "Call",      icon: Phone },
  { value: "email",     label: "Email",     icon: Mail },
  { value: "meeting",   label: "Meeting",   icon: Users },
  { value: "note",      label: "Note",      icon: FileText },
  { value: "follow_up", label: "Follow-up", icon: Calendar },
];

// "More" types that also map to valid ActivityType values
const MORE_TYPES: { value: ActivityType; label: string }[] = [
  { value: "meeting", label: "Demo" },
  { value: "note",    label: "Proposal Sent" },
  { value: "note",    label: "LinkedIn" },
  { value: "call",    label: "Voicemail" },
  { value: "note",    label: "Task" },
  { value: "note",    label: "Other" },
];

// ─── Inline contact picker (used when no contactId provided) ──

interface InlinePickerProps {
  value: string;
  displayName: string;
  onSelect: (id: string, name: string) => void;
  inputCls: string;
}

function InlineContactPicker({ value, displayName, onSelect, inputCls }: InlinePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data } = useContacts(query ? { search: query } : undefined, { limit: 10 });
  const contacts = ((data as { items?: Contact[] })?.items ?? []) as Contact[];

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={displayName || query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onSelect("", "");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search contacts by name or company…"
        className={inputCls}
        autoComplete="off"
      />
      {open && contacts.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-border rounded-lg bg-background shadow-lg max-h-44 overflow-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c.id, c.name);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <span className="font-medium">{c.name}</span>
              {c.company && <span className="text-muted-foreground text-xs">at {c.company}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass when opening from a specific contact's profile. Omit to show a contact picker inside the dialog. */
  contactId?: string | null;
}

// ─── Component ────────────────────────────────────────────────

export function LogActivityDialog({
  open,
  onOpenChange,
  contactId: contactIdProp,
}: LogActivityDialogProps) {
  const createActivity   = useCreateActivity();
  const createCalendar   = useCreateCalendarEvent();
  const updateContact    = useUpdateContact();
  const uploadRecording  = useUploadRecording();
  const aiCopilot        = useAICopilot();
  const [aiExtracting, setAiExtracting] = useState(false);

  // When no contactId is passed in (e.g. opened from global shortcut), let the user pick one
  const [pickedContactId, setPickedContactId]     = useState("");
  const [pickedContactName, setPickedContactName] = useState("");

  const contactId   = contactIdProp || pickedContactId;
  const { data: contact } = useContact(contactId ?? "", { enabled: !!contactId });
  const contactName = contact?.name ?? pickedContactName ?? "Contact";

  // Form state
  const [type, setType]                 = useState<ActivityType>("call");
  const [moreLabel, setMoreLabel]       = useState<string | null>(null);
  const [showMore, setShowMore]         = useState(false);
  const [title, setTitle]               = useState("");
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [duration, setDuration]         = useState<number | "">("");
  const [tldr, setTldr]                 = useState("");
  const [notes, setNotes]               = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [followUpNote, setFollowUpNote] = useState("");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [dragActive, setDragActive]     = useState(false);
  const [fileError, setFileError]       = useState<string | null>(null);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType("call");
      setMoreLabel(null);
      setShowMore(false);
      setTitle("");
      setActivityDate(new Date().toISOString().slice(0, 16));
      setDuration("");
      setTldr("");
      setNotes("");
      setFollowUpDate("");
      setFollowUpTime("10:00");
      setFollowUpNote("");
      setRecordingFile(null);
      setFileError(null);
      setSubmitError(null);
      setAiExtracting(false);
      if (!contactIdProp) {
        setPickedContactId("");
        setPickedContactName("");
      }
    }
  }, [open, contactIdProp]);

  const handleAIExtract = useCallback(async () => {
    if (!notes.trim() || aiExtracting) return;
    setAiExtracting(true);
    try {
      const result = await aiCopilot.mutateAsync(
        `Summarize this transcript in 2 sentences and list action items:\n\n${notes.trim()}`
      );
      if (result.message) {
        setTldr(result.message);
        toast.success("AI filled TLDR — edit as needed");
      }
    } catch {
      toast.error("AI extraction failed — please fill TLDR manually");
    } finally {
      setAiExtracting(false);
    }
  }, [notes, aiExtracting, aiCopilot]);

  const selectType = useCallback((val: ActivityType, label?: string) => {
    setType(val);
    setMoreLabel(label ?? null);
    setShowMore(false);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 500 MB.`);
      return;
    }
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      setFileError(`Unsupported file type. Use MP3, WAV, M4A, MP4, or WebM.`);
      return;
    }
    setRecordingFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const followUpIso = followUpDate
    ? `${followUpDate}T${followUpTime}:00`
    : "";

  const canSubmit = !!title.trim() && !!contactId && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !contactId) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      // ── Step 1: Log activity to backend ──────────────────────
      const contentParts = [tldr.trim(), notes.trim()].filter(Boolean);
      await createActivity.mutateAsync({
        contact_id: contactId,
        type,
        title: title.trim(),
        content: contentParts.join("\n\n---\n\n") || undefined,
        activity_metadata: {
          duration_minutes: duration || undefined,
          tldr: tldr.trim() || undefined,
          transcript: notes.trim() || undefined,
          activity_date: activityDate,
          sub_label: moreLabel || undefined,
        },
      });

      // ── Step 2: Auto-schedule follow-up (parallel) ────────────
      if (followUpIso) {
        const startAt  = followUpIso;
        const endAt    = new Date(new Date(followUpIso).getTime() + 30 * 60_000).toISOString();
        const remindAt = new Date(new Date(followUpIso).getTime() - 15 * 60_000).toISOString();
        await Promise.all([
          createCalendar.mutateAsync({
            contact_id: contactId,
            title: `Follow-up with ${contactName}`,
            event_type: "follow_up",
            start_at: startAt,
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

      // ── Step 3: Upload recording in background (non-blocking) ─
      if (recordingFile) {
        uploadRecording.mutate({
          file: recordingFile,
          metadata: {
            contact_id: contactId,
            title: title.trim() || "Recording",
          },
        });
      }

      // ── Step 4: Success toast ─────────────────────────────────
      const followUpLabel = followUpIso
        ? new Date(followUpIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;
      toast.success(
        "Activity logged",
        followUpLabel
          ? `Follow-up scheduled for ${followUpLabel} · Reminder 15 min before`
          : undefined
      );

      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to log activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20";

  const showDuration = type === "call" || type === "meeting";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-y-auto max-h-[90vh]">
          <Dialog.Title className="text-lg font-display font-bold mb-1">
            Log Activity
            {contactName !== "Contact" && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                with {contactName}
              </span>
            )}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground mb-4">
            Record a call, email, meeting, or note.
          </Dialog.Description>

          <div className="space-y-4">
            {/* ── Contact picker (only when no contactId provided) ── */}
            {!contactIdProp && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Contact *
                </label>
                <InlineContactPicker
                  value={pickedContactId}
                  displayName={pickedContactName}
                  onSelect={(id, name) => {
                    setPickedContactId(id);
                    setPickedContactName(name);
                  }}
                  inputCls={inputCls}
                />
              </div>
            )}

            {/* ── Type pills ───────────────────────────────────── */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRIMARY_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectType(value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    type === value && !moreLabel
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}

              {/* More dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    moreLabel
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {moreLabel ?? "More"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showMore && (
                  <div className="absolute left-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-md py-1 min-w-[130px]">
                    {MORE_TYPES.map(({ value: v, label: l }) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => selectType(v, l)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Title + When ─────────────────────────────────── */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Activity title *"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="datetime-local"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className={cn(inputCls, "text-xs")}
                />
              </div>
            </div>

            {/* ── Duration (call/meeting only) ─────────────────── */}
            {showDuration && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Duration (min)"
                  className={cn(inputCls, "w-40")}
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
            )}

            {/* ── TLDR ─────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Quick Summary
              </label>
              <textarea
                value={tldr}
                onChange={(e) => setTldr(e.target.value)}
                placeholder="What happened? (TLDR)"
                rows={2}
                className={cn(inputCls, "resize-none")}
              />
            </div>

            {/* ── Full notes / transcript ───────────────────────── */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Full Notes / Transcript
                <span className="ml-1 font-normal opacity-60">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste full transcript or detailed notes…"
                rows={3}
                className={cn(inputCls, "resize-none")}
              />
              {notes.length > 200 && (
                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={aiExtracting}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiExtracting ? "Extracting…" : "✨ Auto-summarize → Extract TLDR + Action Items"}
                </button>
              )}
            </div>

            {/* ── Recording upload ──────────────────────────────── */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Attach Recording
                <span className="ml-1 font-normal opacity-60">(optional)</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  dragActive ? "border-primary bg-primary/5" :
                  recordingFile ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10" :
                  "border-border hover:border-muted-foreground/40"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
                {recordingFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileAudio className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium truncate max-w-[240px]">{recordingFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setRecordingFile(null); }}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-xs">Drag MP3 / M4A / MP4 / WAV here, or click to browse</span>
                  </div>
                )}
              </div>
              {fileError && (
                <p className="text-xs text-destructive mt-1">{fileError}</p>
              )}
            </div>

            {/* ── Schedule Follow-up ────────────────────────────── */}
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Schedule Follow-up
                <span className="ml-1 font-normal normal-case opacity-60">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Time</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className={cn(inputCls, "flex-1")}
                      disabled={!followUpDate}
                    />
                    {followUpDate && (
                      <button
                        type="button"
                        onClick={() => { setFollowUpDate(""); setFollowUpTime("10:00"); setFollowUpNote(""); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <input
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Follow-up note (optional)"
                className={inputCls}
                disabled={!followUpDate}
              />
              {followUpDate && (
                <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Calendar event + 15-min reminder will be auto-created
                </div>
              )}
            </div>

            {/* ── Errors ───────────────────────────────────────── */}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            {/* ── Actions ──────────────────────────────────────── */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Upload className="w-4 h-4 animate-pulse" />
                    Logging…
                  </>
                ) : (
                  "Log Activity →"
                )}
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
