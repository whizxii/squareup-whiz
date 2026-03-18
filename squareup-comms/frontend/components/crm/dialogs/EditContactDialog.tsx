"use client";

import { useState, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useContact, useUpdateContact } from "@/lib/hooks/use-crm-queries";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CRMStage } from "@/lib/types/crm";

// ─── Stage options ──────────────────────────────────────────────

const STAGE_OPTIONS: { id: CRMStage; label: string }[] = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

const SOURCE_OPTIONS = [
  "manual",
  "website",
  "referral",
  "linkedin",
  "cold_email",
  "inbound_call",
  "event",
  "partner",
  "other",
];

// ─── Form state ─────────────────────────────────────────────────

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  stage: CRMStage;
  source: string;
}

function emptyForm(): FormData {
  return {
    name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    stage: "lead",
    source: "",
  };
}

// ─── Edit Contact Dialog ────────────────────────────────────────

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
}

export function EditContactDialog({
  open,
  onOpenChange,
  contactId,
}: EditContactDialogProps) {
  const { data, isLoading } = useContact(contactId ?? "", {
    enabled: !!contactId && open,
  });
  const updateContact = useUpdateContact();

  const [form, setForm] = useState<FormData>(emptyForm());
  const [dirty, setDirty] = useState(false);

  // Populate form when contact data loads
  useEffect(() => {
    if (data) {
      const c = data;
      setForm({
        name: c.name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        company: c.company ?? "",
        title: c.title ?? "",
        stage: c.stage ?? "lead",
        source: c.source ?? "",
      });
      setDirty(false);
    }
  }, [data]);

  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setDirty(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!contactId || !form.name.trim()) return;

    const original = data;
    if (!original) return;

    // Only send changed fields
    const updates: Record<string, string> = {};
    if (form.name.trim() !== (original.name ?? ""))
      updates.name = form.name.trim();
    if (form.email.trim() !== (original.email ?? ""))
      updates.email = form.email.trim();
    if (form.phone.trim() !== (original.phone ?? ""))
      updates.phone = form.phone.trim();
    if (form.company.trim() !== (original.company ?? ""))
      updates.company = form.company.trim();
    if (form.title.trim() !== (original.title ?? ""))
      updates.title = form.title.trim();
    if (form.stage !== (original.stage ?? "lead")) updates.stage = form.stage;
    if (form.source !== (original.source ?? "")) updates.source = form.source;

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    updateContact.mutate(
      { id: contactId, updates },
      {
        onSuccess: () => {
          setDirty(false);
          onOpenChange(false);
        },
      }
    );
  }, [contactId, form, data, updateContact, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="text-lg font-display font-bold mb-4">
            Edit Contact
          </Dialog.Title>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="100%" height={38} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Full name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                />
              </div>

              {/* Company */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Company
                </label>
                <input
                  value={form.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  placeholder="Company name"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. VP of Sales"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                />
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Stage
                </label>
                <select
                  value={form.stage}
                  onChange={(e) =>
                    handleChange("stage", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) => handleChange("source", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
                >
                  <option value="">Select source</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() +
                        s.slice(1).replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-muted-foreground">
                  {dirty ? "Unsaved changes" : "No changes"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={
                      !form.name.trim() || !dirty || updateContact.isPending
                    }
                    className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {updateContact.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
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
