"use client";

import { useChatStore } from "@/lib/stores/chat-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { cn } from "@/lib/utils";
import {
  Hash,
  Bot,
  Search,
  Pin,
  MessageSquareReply,
  Bookmark,
  Settings,
  Users,
  Sparkles,
} from "lucide-react";
import { Command } from "cmdk";
import { useEffect, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  group: string;
  shortcut?: string;
  onSelect: () => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const channels = useChatStore((s) => s.channels);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const agents = useAgentStore((s) => s.agents);
  const [search, setSearch] = useState("");

  // Reset search on open
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  // Build actions list
  const actions = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [];

    // Channel switching
    channels.forEach((ch) => {
      items.push({
        id: `channel-${ch.id}`,
        label: ch.name,
        description: ch.description,
        icon: <Hash className="w-4 h-4 text-muted-foreground" />,
        group: "Channels",
        onSelect: () => {
          setActiveChannel(ch.id);
          onOpenChange(false);
        },
      });
    });

    // Agent summoning
    agents
      .filter((a) => a.active)
      .forEach((agent) => {
        items.push({
          id: `agent-${agent.id}`,
          label: agent.name,
          description: agent.description,
          icon: (
            <span className="text-sm" role="img" aria-label={agent.name}>
              {agent.office_station_icon}
            </span>
          ),
          group: "Agents",
          onSelect: () => {
            // Focus composer and insert @mention
            onOpenChange(false);
          },
        });
      });

    // Quick actions
    items.push(
      {
        id: "action-search",
        label: "Search messages",
        description: "Find messages across channels",
        icon: <Search className="w-4 h-4 text-muted-foreground" />,
        group: "Actions",
        shortcut: "⌘⇧F",
        onSelect: () => onOpenChange(false),
      },
      {
        id: "action-threads",
        label: "View threads",
        description: "See all your thread replies",
        icon: <MessageSquareReply className="w-4 h-4 text-muted-foreground" />,
        group: "Actions",
        shortcut: "⌘⇧T",
        onSelect: () => onOpenChange(false),
      },
      {
        id: "action-pinned",
        label: "Pinned messages",
        description: "View pinned messages in channel",
        icon: <Pin className="w-4 h-4 text-muted-foreground" />,
        group: "Actions",
        onSelect: () => onOpenChange(false),
      },
      {
        id: "action-bookmarks",
        label: "Bookmarked messages",
        description: "Your saved messages",
        icon: <Bookmark className="w-4 h-4 text-muted-foreground" />,
        group: "Actions",
        onSelect: () => onOpenChange(false),
      },
      {
        id: "action-members",
        label: "Channel members",
        description: "See who's in this channel",
        icon: <Users className="w-4 h-4 text-muted-foreground" />,
        group: "Actions",
        onSelect: () => onOpenChange(false),
      },
      {
        id: "action-summarize",
        label: "Summarize conversation",
        description: "AI summary of recent messages",
        icon: <Sparkles className="w-4 h-4 text-primary/60" />,
        group: "Actions",
        onSelect: () => onOpenChange(false),
      },
      {
        id: "action-settings",
        label: "Settings",
        description: "Notification and display preferences",
        icon: <Settings className="w-4 h-4 text-muted-foreground" />,
        group: "Actions",
        shortcut: "⌘,",
        onSelect: () => onOpenChange(false),
      }
    );

    return items;
  }, [channels, agents, setActiveChannel, onOpenChange]);

  // Group actions
  const groups = useMemo(() => {
    const grouped = new Map<string, CommandAction[]>();
    for (const action of actions) {
      const existing = grouped.get(action.group) || [];
      grouped.set(action.group, [...existing, action]);
    }
    return grouped;
  }, [actions]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    },
    [open, onOpenChange]
  );

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-lg"
          >
            <Command
              className={cn(
                "rounded-xl border border-border bg-card shadow-2xl overflow-hidden",
                "ring-1 ring-black/5"
              )}
              shouldFilter={true}
              loop
            >
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search channels, agents, actions..."
                  className={cn(
                    "flex-1 h-12 bg-transparent text-sm text-foreground",
                    "placeholder:text-muted-foreground/60",
                    "outline-none border-none focus:ring-0"
                  )}
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-[360px] overflow-y-auto scrollbar-thin p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {Array.from(groups.entries()).map(([group, items]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.description || ""}`}
                        onSelect={item.onSelect}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer",
                          "text-sm text-foreground/90",
                          "aria-selected:bg-primary/10 aria-selected:text-primary",
                          "transition-colors duration-75"
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span className="ml-2 text-xs text-muted-foreground truncate">
                              {item.description}
                            </span>
                          )}
                        </div>
                        {item.shortcut && (
                          <kbd className="hidden sm:inline-flex text-[10px] font-mono text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                            {item.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">esc</kbd>
                  close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
