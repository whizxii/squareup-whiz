"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useCreateCalendarEvent, useContact, useCRMSearch } from "@/lib/hooks/use-crm-queries";
import type { CalendarEventType, Contact } from "@/lib/types/crm";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Phone,
  CheckCircle2,
  Loader2,
  Search,
  User,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContactId?: string;
  defaultDealId?: string;
  defaultDate?: string; // YYYY-MM-DD
}

interface FormState {
  title: string;
  event_type: CalendarEventType;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  meeting_url: string;
  contact_id: string;
  deal_id: string;
  reminder_minutes: number;
}

const EVENT_TYPES: { value: CalendarEventType; label: string; icon: typeof Calendar }[] = [
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "follow_up", label: "Follow-up", icon: Clock },
  { value: "call", label: "Call", icon: Phone },
  { value: "demo", label: "Demo", icon: Video },
  { value: "onboarding", label: "Onboarding", icon: CheckCircle2 },
];

const REMINDER_OPTIONS = [
  { value: 0, label: "None" },
  { value: 5, label: "5 min before" },
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

function getDefaultDate(defaultDate?: string): string {
  if (defaultDate) return defaultDate;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDefaultStartTime(): string {
  const now = new Date();
  const nextHour = now.getHours() + 1;
  return `${String(nextHour % 24).padStart(2, "0")}:00`;
}

function getDefaultEndTime(): string {
  const now = new Date();
  const nextHour = now.getHours() + 1;
  return `${String((nextHour + 1) % 24).padStart(2, "0")}:00`;
}

const INITIAL_FORM = (defaults?: Partial<CreateEventDialogProps>): FormState => ({
  title: "",
  event_type: "meeting",
  description: "",
  date: getDefaultDate(defaults?.defaultDate),
  start_time: getDefaultStartTime(),
  end_time: getDefaultEndTime(),
  is_all_day: false,
  location: "",
  meeting_url: "",
  contact_id: defaults?.defaultContactId ?? "",
  deal_id: defaults?.defaultDealId ?? "",
  reminder_minutes: 15,
});

// ─── Component ──────────────────────────────────────────────────

export function CreateEventDialog({
  open,
  onOpenChange,
  defaultContactId,
  defaultDealId,
  defaultDate,
}: CreateEventDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    INITIAL_FORM({ defaultContactId, defaultDealId, defaultDate })
  );

  const createEvent = useCreateCalendarEvent();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Contact search state
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContactName, setSelectedContactName] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactPickerRef = useRef<HTMLDivElement>(null);
  const { data: searchResults, isLoading: isSearching } = useCRMSearch(contactQuery);

  // Pre-load display name for defaultContactId
  const { data: defaultContact } = useContact(defaultContactId ?? "", {
    enabled: !!defaultContactId,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contactPickerRef.current && !contactPickerRef.current.contains(e.target as Node)) {
        setShowContactDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when dialog opens or default props change
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM({ defaultContactId, defaultDealId, defaultDate }));
      setSubmitError(null);
      setContactQuery("");
      setSelectedContactName(defaultContact?.name ?? "");
      setShowContactDropdown(false);
    }
  }, [open, defaultContactId, defaultDealId, defaultDate, defaultContact]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM({ defaultContactId, defaultDealId, defaultDate }));
  }, [defaultContactId, defaultDealId, defaultDate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title.trim() || !form.contact_id.trim()) return;

      setSubmitError(null);

      const startAt = form.is_all_day
        ? `${form.date}T00:00:00Z`
        : `${form.date}T${form.start_time}:00Z`;
      const endAt = form.is_all_day
        ? `${form.date}T23:59:59Z`
        : `${form.date}T${form.end_time}:00Z`;

      try {
        await createEvent.mutateAsync({
          title: form.title.trim(),
          event_type: form.event_type,
          description: form.description.trim() || undefined,
          start_at: startAt,
          end_at: endAt,
          is_all_day: form.is_all_day,
          location: form.location.trim() || undefined,
          meeting_url: form.meeting_url.trim() || undefined,
          contact_id: form.contact_id,
          deal_id: form.deal_id || undefined,
          reminder_minutes: form.reminder_minutes,
        });

        resetForm();
        onOpenChange(false);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to create event. Please try again."
        );
      }
    },
    [form, createEvent, resetForm, onOpenChange]
  );

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "max-h-[85vh] overflow-y-auto scrollbar-thin"
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Create Event
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Schedule a new calendar event linked to a contact.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. Follow up with Jane"
                className={inputClass}
                required
              />
            </div>

            {/* Event type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateField("event_type", t.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        form.event_type === t.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 dark:border-gray-700 hover:bg-muted"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Search */}
            <div ref={contactPickerRef} className="relative">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact *
              </label>
              {selectedContactName ? (
                <div className={cn(inputClass, "flex items-center justify-between")}>
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {selectedContactName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContactName("");
                      updateField("contact_id", "");
                      setContactQuery("");
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={contactQuery}
                    onChange={(e) => {
                      setContactQuery(e.target.value);
                      setShowContactDropdown(e.target.value.length >= 2);
                    }}
                    onFocus={() => {
                      if (contactQuery.length >= 2) setShowContactDropdown(true);
                    }}
                    placeholder="Search contacts by name, email..."
                    className={cn(inputClass, "pl-9")}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />
                  )}
                </div>
              )}
              {/* Dropdown */}
              {showContactDropdown && !selectedContactName && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-48 overflow-y-auto">
                  {searchResults?.contacts && searchResults.contacts.length > 0 ? (
                    searchResults.contacts.map((c: Contact) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          updateField("contact_id", c.id);
                          setSelectedContactName(c.name);
                          setContactQuery("");
                          setShowContactDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                          {(c.email || c.company) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {[c.email, c.company].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                      {contactQuery.length < 2 ? "Type at least 2 characters..." : "No contacts found"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deal ID (optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deal ID
              </label>
              <input
                type="text"
                value={form.deal_id}
                onChange={(e) => updateField("deal_id", e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>

            {/* All day toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_all_day}
                onChange={(e) => updateField("is_all_day", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">All day event</span>
            </label>

            {/* Date / Time */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              {!form.is_all_day && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start
                    </label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => updateField("start_time", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End
                    </label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => updateField("end_time", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Location + Meeting URL */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Office, Zoom, etc."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Video className="w-3 h-3 inline mr-1" />Meeting URL
                </label>
                <input
                  type="url"
                  value={form.meeting_url}
                  onChange={(e) => updateField("meeting_url", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reminder
              </label>
              <select
                value={form.reminder_minutes}
                onChange={(e) => updateField("reminder_minutes", Number(e.target.value))}
                className={inputClass}
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Notes, agenda, etc."
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </div>

            {/* Error display */}
            {submitError && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createEvent.isPending || !form.title.trim() || !form.contact_id.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {createEvent.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Event"
                )}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
