"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: string;
  action: () => void;
}

/**
 * Global keyboard shortcut manager with leader key support.
 * Leader key pattern (Linear-style): press a prefix key, then a second key within 500ms.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  const leaderRef = useRef<string | null>(null);
  const leaderTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[contenteditable]");

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // Handle leader key sequences (e.g. "g c" = press g, then c)
        if (shortcut.key.includes(" ")) {
          const [leader, follower] = shortcut.key.split(" ");

          // If we're waiting for follower and this matches
          if (leaderRef.current === leader && e.key.toLowerCase() === follower && !isEditing) {
            e.preventDefault();
            leaderRef.current = null;
            clearTimeout(leaderTimerRef.current);
            shortcut.action();
            return;
          }

          // If this is the leader key press
          if (e.key.toLowerCase() === leader && !isEditing && !e.metaKey && !e.ctrlKey && !e.altKey) {
            leaderRef.current = leader;
            clearTimeout(leaderTimerRef.current);
            leaderTimerRef.current = setTimeout(() => {
              leaderRef.current = null;
            }, 500);
            return;
          }
          continue;
        }

        // Standard shortcuts (may work even in editors for meta/ctrl combos)
        if (shortcut.meta || shortcut.ctrl) {
          // Meta/Ctrl shortcuts always work
          if (
            e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            metaMatch &&
            ctrlMatch &&
            shiftMatch &&
            altMatch
          ) {
            e.preventDefault();
            shortcut.action();
            return;
          }
        } else if (!isEditing) {
          // Non-modifier shortcuts only work outside editors
          if (
            e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            shiftMatch &&
            altMatch &&
            !e.metaKey &&
            !e.ctrlKey
          ) {
            e.preventDefault();
            shortcut.action();
            return;
          }
        }
      }

      // If any non-matching key pressed during leader wait, cancel leader
      if (leaderRef.current && !["g", "Shift", "Control", "Alt", "Meta"].includes(e.key)) {
        leaderRef.current = null;
        clearTimeout(leaderTimerRef.current);
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(leaderTimerRef.current);
    };
  }, [handleKeyDown]);
}

/** Reactive hook that tracks the user's reduced motion preference */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
