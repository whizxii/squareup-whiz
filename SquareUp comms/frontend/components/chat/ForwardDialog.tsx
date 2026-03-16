"use client";

import { useChatStore, type Channel } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { Forward, X, Hash, Search, Check } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ForwardDialogProps {
  open: boolean;
  messageContent: string;
  onClose: () => void;
  onForward: (channelId: string) => void;
}

export function ForwardDialog({
  open,
  messageContent,
  onClose,
  onForward,
}: ForwardDialogProps) {
  const channels = useChatStore((s) => s.channels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const [query, setQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Filter channels by search query, exclude current channel
  const filtered = useMemo(() => {
    const available = channels.filter((c) => c.id !== activeChannelId);
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [channels, activeChannelId, query]);

  const handleForward = useCallback(() => {
    if (!selectedChannelId) return;
    onForward(selectedChannelId);
    setSelectedChannelId(null);
    setQuery("");
    onClose();
  }, [selectedChannelId, onForward, onClose]);

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
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-x-0 top-[20%] z-50 mx-auto w-full max-w-sm"
          >
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden ring-1 ring-black/5">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Forward className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold flex-1">
                  Forward Message
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Message preview */}
              <div className="px-4 py-2 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {messageContent}
                </p>
              </div>

              {/* Search */}
              <div className="px-4 py-2 border-b border-border">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search channels..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>
              </div>

              {/* Channel list */}
              <div className="max-h-[240px] overflow-y-auto scrollbar-thin py-1">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No channels found
                  </p>
                ) : (
                  filtered.map((ch) => (
                    <ChannelOption
                      key={ch.id}
                      channel={ch}
                      selected={ch.id === selectedChannelId}
                      onSelect={() => setSelectedChannelId(ch.id)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForward}
                  disabled={!selectedChannelId}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Forward
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ChannelOption({
  channel,
  selected,
  onSelect,
}: {
  channel: Channel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 text-left",
        "transition-colors duration-75",
        selected
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent/50 text-foreground/80"
      )}
    >
      <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{channel.name}</span>
        {channel.description && (
          <span className="ml-2 text-xs text-muted-foreground truncate">
            {channel.description}
          </span>
        )}
      </div>
      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}
