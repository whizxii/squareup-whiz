/**
 * CRM Keyboard Shortcut Registry
 *
 * Global + contextual shortcuts for power-user productivity.
 * Inspired by Linear's keyboard-first UX.
 */

// ─── Types ───────────────────────────────────────────────────────

export interface KeyboardShortcut {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Key combination: "mod" = Cmd on Mac, Ctrl on Win/Linux */
  keys: string;
  /** Context: "global" = always active, others = active in that view */
  context: "global" | "pipeline" | "table" | "contact360" | "calendar" | "dialog";
  /** Category for grouping in help dialog */
  category: "navigation" | "actions" | "selection" | "dialogs" | "editing";
  /** Handler called when shortcut is triggered */
  handler?: () => void;
}

// ─── Shortcut definitions ────────────────────────────────────────

export const CRM_SHORTCUTS: Omit<KeyboardShortcut, "handler">[] = [
  // Global navigation
  { id: "cmd-k", label: "Command palette", keys: "mod+k", context: "global", category: "navigation" },
  { id: "cmd-j", label: "AI Copilot", keys: "mod+j", context: "global", category: "navigation" },
  { id: "cmd-shift-n", label: "New contact", keys: "mod+shift+n", context: "global", category: "actions" },
  { id: "cmd-shift-d", label: "New deal", keys: "mod+shift+d", context: "global", category: "actions" },
  { id: "cmd-shift-a", label: "Log activity", keys: "mod+shift+a", context: "global", category: "actions" },
  { id: "cmd-slash", label: "Keyboard shortcuts", keys: "mod+/", context: "global", category: "navigation" },
  { id: "question", label: "Keyboard shortcuts", keys: "?", context: "global", category: "navigation" },
  { id: "escape", label: "Close panel / dialog", keys: "Escape", context: "global", category: "navigation" },

  // List navigation
  { id: "j", label: "Next item", keys: "j", context: "pipeline", category: "selection" },
  { id: "k", label: "Previous item", keys: "k", context: "pipeline", category: "selection" },
  { id: "enter", label: "Open selected", keys: "Enter", context: "pipeline", category: "selection" },

  // Table navigation
  { id: "table-j", label: "Next row", keys: "j", context: "table", category: "selection" },
  { id: "table-k", label: "Previous row", keys: "k", context: "table", category: "selection" },
  { id: "table-enter", label: "Open selected", keys: "Enter", context: "table", category: "selection" },
  { id: "table-e", label: "Edit selected", keys: "e", context: "table", category: "editing" },
  { id: "table-d", label: "Delete selected", keys: "d", context: "table", category: "actions" },

  // Contact 360
  { id: "c360-e", label: "Edit contact", keys: "e", context: "contact360", category: "editing" },
  { id: "c360-n", label: "Add note", keys: "n", context: "contact360", category: "actions" },
  { id: "c360-a", label: "Log activity", keys: "a", context: "contact360", category: "actions" },
];

// ─── Key matching ────────────────────────────────────────────────

const isMac =
  typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

/**
 * Parse a shortcut key string into its component parts.
 */
function parseKeys(keys: string): { mod: boolean; shift: boolean; key: string } {
  const parts = keys.toLowerCase().split("+");
  return {
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    key: parts.filter((p) => p !== "mod" && p !== "shift")[0] ?? "",
  };
}

/**
 * Check if a keyboard event matches a shortcut key string.
 */
export function matchesShortcut(event: KeyboardEvent, keys: string): boolean {
  const parsed = parseKeys(keys);
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  if (parsed.mod && !modKey) return false;
  if (!parsed.mod && modKey) return false;
  if (parsed.shift && !event.shiftKey) return false;
  if (!parsed.shift && event.shiftKey) return false;

  return event.key.toLowerCase() === parsed.key;
}

/**
 * Format shortcut keys for display.
 * "mod+shift+n" → "⌘⇧N" (Mac) or "Ctrl+Shift+N" (Windows)
 */
export function formatShortcut(keys: string): string {
  const parts = keys.split("+");
  return parts
    .map((part) => {
      switch (part.toLowerCase()) {
        case "mod":
          return isMac ? "\u2318" : "Ctrl";
        case "shift":
          return isMac ? "\u21E7" : "Shift";
        case "escape":
          return isMac ? "Esc" : "Esc";
        case "enter":
          return isMac ? "\u21A9" : "Enter";
        default:
          return part.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

// ─── Keyboard handler ────────────────────────────────────────────

export type ShortcutHandler = (shortcutId: string) => void;

/**
 * Create a keyboard event handler for a given context.
 * Attach to document or a container element.
 */
export function createKeyboardHandler(
  context: KeyboardShortcut["context"],
  onShortcut: ShortcutHandler
): (event: KeyboardEvent) => void {
  const contextShortcuts = CRM_SHORTCUTS.filter(
    (s) => s.context === context || s.context === "global"
  );

  return (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;

    for (const shortcut of contextShortcuts) {
      if (matchesShortcut(event, shortcut.keys)) {
        // Allow mod-key shortcuts even in inputs
        const parsed = parseKeys(shortcut.keys);
        if (isInput && !parsed.mod) continue;

        event.preventDefault();
        event.stopPropagation();
        onShortcut(shortcut.id);
        return;
      }
    }
  };
}

/**
 * Get shortcuts grouped by category for the help dialog.
 */
export function getShortcutsByCategory(): Record<string, Omit<KeyboardShortcut, "handler">[]> {
  const grouped: Record<string, Omit<KeyboardShortcut, "handler">[]> = {};
  for (const shortcut of CRM_SHORTCUTS) {
    const key = shortcut.category;
    const list = grouped[key] ?? [];
    grouped[key] = [...list, shortcut];
  }
  return grouped;
}
