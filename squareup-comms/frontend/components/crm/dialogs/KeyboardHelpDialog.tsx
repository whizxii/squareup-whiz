"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CRM_SHORTCUTS } from "@/lib/crm-keyboard";
import { cn } from "@/lib/utils";

interface KeyboardHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac =
  typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

function formatKeys(keys: string): string {
  return keys
    .replace("mod", isMac ? "⌘" : "Ctrl")
    .replace("shift", "⇧")
    .replace("+", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: "Navigation",
  actions: "Actions",
  dialogs: "Dialogs",
  selection: "Selection",
  editing: "Editing",
};

const CONTEXT_LABELS: Record<string, string> = {
  global: "Global",
  pipeline: "Pipeline",
  table: "Contacts Table",
  contact360: "Contact Detail",
  calendar: "Calendar",
  dialog: "Dialog",
};

export function KeyboardHelpDialog({ open, onOpenChange }: KeyboardHelpDialogProps) {
  const grouped = CRM_SHORTCUTS.reduce<Record<string, typeof CRM_SHORTCUTS>>((acc, s) => {
    const key = `${s.context}__${s.category}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  // Group by context first for display
  const byContext = CRM_SHORTCUTS.reduce<Record<string, typeof CRM_SHORTCUTS>>((acc, s) => {
    if (!acc[s.context]) acc[s.context] = [];
    acc[s.context].push(s);
    return acc;
  }, {});

  const contextOrder = ["global", "contact360", "pipeline", "table", "calendar"];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-sm font-semibold">Keyboard Shortcuts</Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                Power-user shortcuts for the CRM.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto max-h-[70vh] p-5 space-y-5">
            {contextOrder
              .filter((ctx) => byContext[ctx]?.length > 0)
              .map((ctx) => (
                <div key={ctx}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {CONTEXT_LABELS[ctx] ?? ctx}
                  </p>
                  <div className="space-y-1">
                    {byContext[ctx].map((shortcut) => (
                      <div key={shortcut.id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-foreground">{shortcut.label}</span>
                        <kbd className={cn(
                          "inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5",
                          "text-[10px] font-mono text-muted-foreground"
                        )}>
                          {formatKeys(shortcut.keys)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
