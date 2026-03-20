"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCreateReminder } from "@/lib/hooks/use-tasks-queries";

// ─── Recurrence options ──────────────────────────────────────────

const RECURRENCE_OPTIONS = [
  { value: "", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// ─── Component ───────────────────────────────────────────────────

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateReminderDialog({
  open,
  onOpenChange,
}: CreateReminderDialogProps) {
  const createReminder = useCreateReminder();

  const [message, setMessage] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setMessage("");
    setRemindAt("");
    setRecurrence("");
    setError("");
  };

  const handleCreate = async () => {
    if (!message.trim() || !remindAt) return;
    setError("");

    // Validate remind_at is in the future
    const remindDate = new Date(remindAt);
    if (remindDate <= new Date()) {
      setError("Reminder time must be in the future");
      return;
    }

    try {
      await createReminder.mutateAsync({
        message: message.trim(),
        remind_at: remindDate.toISOString(),
        recurrence: recurrence || undefined,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reminder");
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
            New Reminder
          </Dialog.Title>

          <div className="space-y-3">
            {/* Message */}
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should I remind you about? *"
              className={inputCls}
              autoFocus
            />

            {/* Remind at + Recurrence */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                  Remind at *
                </label>
                <input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                  Repeat
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className={inputCls}
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                disabled={createReminder.isPending || !message.trim() || !remindAt}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                {createReminder.isPending ? "Creating..." : "Set Reminder"}
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
