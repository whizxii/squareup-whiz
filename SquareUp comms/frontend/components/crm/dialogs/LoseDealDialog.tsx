"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCRMUIStore } from "@/lib/stores/crm-ui-store";
import { useLoseDeal } from "@/lib/hooks/use-crm-queries";

const LOSS_REASONS = [
  { value: "price", label: "Price" },
  { value: "competition", label: "Competition" },
  { value: "no_budget", label: "No Budget" },
  { value: "timing", label: "Timing" },
  { value: "no_decision", label: "No Decision" },
  { value: "other", label: "Other" },
] as const;

interface LoseDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoseDealDialog({ open, onOpenChange }: LoseDealDialogProps) {
  const dialogData = useCRMUIStore((s) => s.dialog.data) as {
    dealId?: string;
    dealTitle?: string;
  } | null;

  const loseDeal = useLoseDeal();

  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");

  const dealId = dialogData?.dealId ?? "";
  const dealTitle = dialogData?.dealTitle ?? "this deal";

  const resetForm = () => {
    setReason("");
    setDetail("");
  };

  const handleLose = () => {
    if (!reason || !dealId) return;

    loseDeal.mutate(
      {
        id: dealId,
        reason,
        detail: detail.trim() || undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-display font-bold mb-1">
            Mark Deal as Lost
          </Dialog.Title>

          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Why was <span className="font-medium text-foreground">{dealTitle}</span> lost?
          </Dialog.Description>

          <div className="space-y-3">
            {/* Loss reason (required) */}
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              autoFocus
            >
              <option value="">Select a reason *</option>
              {LOSS_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Optional detail */}
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleLose}
                disabled={loseDeal.isPending || !reason}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {loseDeal.isPending ? "Closing..." : "Mark as Lost"}
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
