/**
 * Keyboard shortcuts help overlay — triggered by pressing "?".
 * Glass panel with organized shortcut list.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Shortcut {
  readonly keys: readonly string[];
  readonly description: string;
}

const SHORTCUT_GROUPS: readonly {
  readonly label: string;
  readonly shortcuts: readonly Shortcut[];
}[] = [
  {
    label: "Movement",
    shortcuts: [
      { keys: ["W", "A", "S", "D"], description: "Move character" },
      { keys: ["\u2191", "\u2193", "\u2190", "\u2192"], description: "Move character (arrows)" },
      { keys: ["Click"], description: "Walk to tile" },
    ],
  },
  {
    label: "Camera",
    shortcuts: [
      { keys: ["+"], description: "Zoom in" },
      { keys: ["-"], description: "Zoom out" },
      { keys: ["0"], description: "Reset zoom" },
      { keys: ["Scroll"], description: "Zoom in/out" },
    ],
  },
  {
    label: "UI",
    shortcuts: [
      { keys: ["M"], description: "Toggle minimap" },
      { keys: ["L"], description: "Toggle list view" },
      { keys: ["Esc"], description: "Close panels / exit edit" },
      { keys: ["?"], description: "This help overlay" },
    ],
  },
  {
    label: "Interaction",
    shortcuts: [
      { keys: ["E"], description: "Interact with nearest entity" },
      { keys: ["Click"], description: "Select user / agent" },
    ],
  },
  {
    label: "Edit",
    shortcuts: [
      { keys: ["Ctrl", "E"], description: "Toggle edit mode" },
    ],
  },
];

export default function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      setOpen((prev) => !prev);
    }
    if (e.key === "Escape" && open) {
      setOpen(false);
    }
  }, [open]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 p-5 shadow-2xl"
            style={{
              backgroundColor: "rgba(30, 25, 20, 0.92)",
              backdropFilter: "blur(24px) saturate(180%)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/90">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/70"
                aria-label="Close shortcuts"
              >
                <X size={14} />
              </button>
            </div>

            {/* Groups */}
            <div className="space-y-4">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between py-0.5"
                      >
                        <span className="text-xs text-white/60">
                          {shortcut.description}
                        </span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key) => (
                            <kbd
                              key={key}
                              className="flex min-w-[22px] items-center justify-center rounded border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] font-medium text-white/70"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
