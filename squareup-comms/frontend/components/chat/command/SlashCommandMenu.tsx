"use client";

import { cn } from "@/lib/utils";
import {
  Bot,
  Sparkles,
  Image,
  Pin,
  Search,
  Clock,
  Code,
  FileText,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SlashCommand {
  trigger: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  execute: (args: string) => void;
}

interface SlashCommandMenuProps {
  /** The current text in the composer (from cursor line) */
  query: string;
  /** Whether the menu should be visible */
  visible: boolean;
  /** Position to anchor the menu (above cursor) */
  position: { top: number; left: number };
  /** Called when a command is selected */
  onSelect: (command: SlashCommand) => void;
  /** Called when the menu should close */
  onClose: () => void;
}

// Default command registry
const DEFAULT_COMMANDS: SlashCommand[] = [
  {
    trigger: "invite",
    label: "Invite agent",
    description: "Summon an AI agent to help",
    icon: <Bot className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "summarize",
    label: "Summarize",
    description: "AI summary of recent messages",
    icon: <Sparkles className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "search",
    label: "Search messages",
    description: "Find messages in this channel",
    icon: <Search className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "pin",
    label: "Pin message",
    description: "Pin last message to channel",
    icon: <Pin className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "code",
    label: "Code block",
    description: "Insert a formatted code block",
    icon: <Code className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "giphy",
    label: "Giphy",
    description: "Search and share a GIF",
    icon: <Image className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "schedule",
    label: "Schedule message",
    description: "Send a message at a later time",
    icon: <Clock className="w-4 h-4" />,
    execute: () => {},
  },
  {
    trigger: "note",
    label: "Note to self",
    description: "Save a private note",
    icon: <FileText className="w-4 h-4" />,
    execute: () => {},
  },
];

export function SlashCommandMenu({
  query,
  visible,
  position,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query (fuzzy match on trigger)
  const filtered = useMemo(() => {
    const q = query.replace(/^\//, "").toLowerCase();
    if (!q) return DEFAULT_COMMANDS;

    return DEFAULT_COMMANDS.filter(
      (cmd) =>
        cmd.trigger.toLowerCase().includes(q) ||
        cmd.label.toLowerCase().includes(q)
    );
  }, [query]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Close if no matches
  useEffect(() => {
    if (visible && filtered.length === 0) {
      onClose();
    }
  }, [visible, filtered.length, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [visible, filtered, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {visible && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="fixed z-50"
          style={{
            bottom: `calc(100vh - ${position.top}px + 8px)`,
            left: position.left,
          }}
        >
          <div
            ref={listRef}
            className={cn(
              "w-64 max-h-[280px] overflow-y-auto scrollbar-thin",
              "rounded-xl border border-border bg-card shadow-xl",
              "ring-1 ring-black/5 p-1"
            )}
          >
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Commands
            </div>
            {filtered.map((cmd, i) => (
              <button
                key={cmd.trigger}
                data-index={i}
                onClick={() => onSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                  "transition-colors duration-75",
                  i === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-accent/50"
                )}
              >
                <span
                  className={cn(
                    "shrink-0",
                    i === selectedIndex ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {cmd.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">/{cmd.trigger}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {cmd.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
