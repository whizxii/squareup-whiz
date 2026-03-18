"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, GitMerge, ArrowRight, Check } from "lucide-react";
import { useContact, useMergeContacts } from "@/lib/hooks/use-crm-queries";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/crm";

// ─── Types ─────────────────────────────────────────────────────────

interface MergeContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryId: string | null;
  secondaryId: string | null;
}

// ─── Field display helper ──────────────────────────────────────────

const COMPARE_FIELDS: { key: keyof Contact; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "stage", label: "Stage" },
  { key: "source", label: "Source" },
  { key: "lead_score", label: "Lead Score" },
  { key: "activity_count", label: "Activities" },
];

function FieldValue({ value }: { value: unknown }) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground italic">—</span>;
  }
  return <span className="truncate">{String(value)}</span>;
}

// ─── Component ─────────────────────────────────────────────────────

export function MergeContactsDialog({
  open,
  onOpenChange,
  primaryId,
  secondaryId,
}: MergeContactsDialogProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<"a" | "b">("a");
  const [merged, setMerged] = useState(false);

  const { data: contactA } = useContact(primaryId ?? "", {
    enabled: !!primaryId,
  });
  const { data: contactB } = useContact(secondaryId ?? "", {
    enabled: !!secondaryId,
  });
  const mergeMutation = useMergeContacts();

  const primary = selectedPrimary === "a" ? contactA : contactB;
  const secondary = selectedPrimary === "a" ? contactB : contactA;

  const handleMerge = () => {
    if (!primary?.id || !secondary?.id) return;

    mergeMutation.mutate(
      { primaryId: primary.id, secondaryId: secondary.id },
      {
        onSuccess: () => setMerged(true),
      }
    );
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedPrimary("a");
      setMerged(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[85vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-display font-bold mb-1">
            Merge Contacts
          </Dialog.Title>

          {merged ? (
            /* Success state */
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-medium mb-1">Contacts merged successfully</p>
              <p className="text-sm text-muted-foreground mb-6">
                {secondary?.name} has been merged into {primary?.name}.
              </p>
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Select which contact to keep as primary. The other will be
                merged in and archived.
              </p>

              {/* Primary selector */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { key: "a" as const, contact: contactA },
                  { key: "b" as const, contact: contactB },
                ].map(({ key, contact }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPrimary(key)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      selectedPrimary === key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                      {contact?.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {contact?.name ?? "Loading..."}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact?.email ?? ""}
                      </p>
                      {selectedPrimary === key && (
                        <span className="text-[10px] font-medium text-primary uppercase mt-0.5 inline-block">
                          Primary
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Field comparison */}
              {primary && secondary && (
                <div className="rounded-xl border border-border overflow-hidden mb-4">
                  <div className="grid grid-cols-[100px_1fr_32px_1fr] gap-0 text-xs">
                    <div className="px-3 py-2 bg-muted/50 font-medium text-muted-foreground">
                      Field
                    </div>
                    <div className="px-3 py-2 bg-muted/50 font-medium text-primary">
                      Primary ({primary.name?.split(" ")[0]})
                    </div>
                    <div className="bg-muted/50" />
                    <div className="px-3 py-2 bg-muted/50 font-medium text-muted-foreground">
                      Secondary ({secondary.name?.split(" ")[0]})
                    </div>

                    {COMPARE_FIELDS.map((field) => {
                      const pVal = primary[field.key];
                      const sVal = secondary[field.key];
                      const differs =
                        String(pVal ?? "") !== String(sVal ?? "");

                      return [
                        <div
                          key={`${field.key}-label`}
                          className="px-3 py-2 border-t border-border text-muted-foreground"
                        >
                          {field.label}
                        </div>,
                        <div
                          key={`${field.key}-primary`}
                          className={cn(
                            "px-3 py-2 border-t border-border",
                            differs && "bg-primary/5 font-medium"
                          )}
                        >
                          <FieldValue value={pVal} />
                        </div>,
                        <div
                          key={`${field.key}-arrow`}
                          className="border-t border-border flex items-center justify-center"
                        >
                          {differs && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>,
                        <div
                          key={`${field.key}-secondary`}
                          className={cn(
                            "px-3 py-2 border-t border-border",
                            differs && !pVal && sVal && "bg-green-50 dark:bg-green-950/20"
                          )}
                        >
                          <FieldValue value={sVal} />
                        </div>,
                      ];
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                Empty fields on the primary will be filled from the secondary.
                Tags, activities, and notes will be combined.
              </p>

              {mergeMutation.error && (
                <p className="text-sm text-red-500 mb-3">
                  {mergeMutation.error instanceof Error
                    ? mergeMutation.error.message
                    : "Merge failed"}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={mergeMutation.isPending || !primary || !secondary}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
                >
                  <GitMerge className="w-4 h-4" />
                  {mergeMutation.isPending ? "Merging..." : "Merge Contacts"}
                </button>
              </div>
            </>
          )}

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
