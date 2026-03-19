"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCreateContact } from "@/lib/hooks/use-crm-queries";
import type { CRMStage } from "@/lib/types/crm";

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

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactDialog({
  open,
  onOpenChange,
}: CreateContactDialogProps) {
  const createContact = useCreateContact();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<CRMStage>("lead");
  const [notes, setNotes] = useState("");
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
    setError("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");

    try {
      await createContact.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        title: title.trim() || undefined,
        source: source || undefined,
        stage,
        notes: notes.trim() || undefined,
      });
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
