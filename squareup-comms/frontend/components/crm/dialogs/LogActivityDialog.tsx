"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCRMStore, type ActivityType } from "@/lib/stores/crm-store";
import { cn } from "@/lib/utils";

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
  { value: "follow_up", label: "Follow-up" },
];

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
}

export function LogActivityDialog({
  open,
  onOpenChange,
  contactId,
}: LogActivityDialogProps) {
  const addActivity = useCRMStore((s) => s.addActivity);
  const [type, setType] = useState<ActivityType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const resetForm = () => {
    setType("note");
    setTitle("");
    setContent("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      contact_id: contactId,
      type,
      title: title.trim(),
      content: content.trim() || undefined,
      performer_type: "user",
      performer_name: "You",
      created_at: new Date().toISOString(),
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-display font-bold mb-4">
            Log Activity
          </Dialog.Title>

          <div className="space-y-3">
            {/* Activity type selector */}
            <div className="flex gap-2 flex-wrap">
              {ACTIVITY_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    type === t.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity title *"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              autoFocus
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Details (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                Log Activity
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
