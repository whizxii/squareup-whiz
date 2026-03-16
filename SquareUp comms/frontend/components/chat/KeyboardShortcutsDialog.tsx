"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  category: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    category: "General",
    shortcuts: [
      { keys: ["\u2318", "K"], description: "Open command palette" },
      { keys: ["\u2318", "/"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close panel / dialog" },
    ],
  },
  {
    category: "Navigation",
    shortcuts: [
      { keys: ["\u2318", "\u21E7", "M"], description: "Toggle sidebar" },
      { keys: ["\u2318", "\u21E7", "F"], description: "Search messages" },
      { keys: ["\u2318", "\u21E7", "T"], description: "Toggle thread panel" },
      { keys: ["G", "then", "C"], description: "Go to chat" },
    ],
  },
  {
    category: "Composer",
    shortcuts: [
      { keys: ["Enter"], description: "Send message" },
      { keys: ["\u21E7", "Enter"], description: "New line" },
      { keys: ["\u2318", "B"], description: "Bold" },
      { keys: ["\u2318", "I"], description: "Italic" },
      { keys: ["\u2318", "K"], description: "Insert link" },
      { keys: ["\u2191"], description: "Edit last message (empty composer)" },
    ],
  },
  {
    category: "Messages",
    shortcuts: [
      { keys: ["R"], description: "Reply in thread" },
      { keys: ["E"], description: "Edit message" },
    ],
  },
] as const;

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({
  open,
  onClose,
}: KeyboardShortcutsDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-x-0 top-[10%] z-50 mx-auto w-full max-w-lg"
          >
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden ring-1 ring-black/5">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {group.category}
                    </h3>
                    <div className="space-y-1.5">
                      {group.shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.description}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-sm text-foreground/80">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, i) =>
                              key === "then" ? (
                                <span
                                  key={i}
                                  className="text-[10px] text-muted-foreground mx-0.5"
                                >
                                  then
                                </span>
                              ) : (
                                <kbd
                                  key={i}
                                  className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono font-medium text-muted-foreground"
                                >
                                  {key}
                                </kbd>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-muted/30">
                <p className="text-[11px] text-muted-foreground">
                  Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Esc</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
