"use client";

import { useChatStore, type Message } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { Pin, X, Hash } from "lucide-react";
import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { parseUtcDate } from "@/lib/format";

// Stable empty array
const EMPTY_MESSAGES: Message[] = [];

interface PinnedMessagesProps {
  onClose: () => void;
}

export function PinnedMessages({ onClose }: PinnedMessagesProps) {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore(
    (s) =>
      (activeChannelId ? s.messages[activeChannelId] : null) ?? EMPTY_MESSAGES
  );
  const activeChannel = useChatStore((s) =>
    s.channels.find((c) => c.id === s.activeChannelId)
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.pinned),
    [messages]
  );

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="w-[380px] max-w-full flex flex-col border-l border-border bg-card shrink-0 h-full"
      role="complementary"
      aria-label="Pinned messages"
    >
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <Pin className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold flex-1">Pinned Messages</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close pinned messages"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {pinnedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div className="space-y-2">
              <Pin className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No pinned messages</p>
              <p className="text-xs text-muted-foreground/60">
                Pin important messages to find them easily later
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-4 py-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
              {pinnedMessages.length} pinned in{" "}
              <span className="inline-flex items-center gap-0.5">
                <Hash className="w-2.5 h-2.5" />
                {activeChannel?.name || "channel"}
              </span>
            </div>
            {pinnedMessages.map((msg) => (
              <PinnedMessageItem key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function PinnedMessageItem({ message }: { message: Message }) {
  const timeAgo = formatDistanceToNow(parseUtcDate(message.created_at), {
    addSuffix: true,
  });

  const updateMessage = useChatStore((s) => s.updateMessage);

  const handleUnpin = useCallback(() => {
    updateMessage(message.channel_id, message.id, { pinned: false });
  }, [message.channel_id, message.id, updateMessage]);

  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-border/50",
        "hover:bg-accent/30 transition-colors duration-100",
        "group"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] mb-1">
        <span className="font-medium text-foreground/70">
          {message.sender_name || message.sender_id}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/50">{timeAgo}</span>
        <button
          onClick={handleUnpin}
          className="ml-auto text-[10px] text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Unpin message"
        >
          Unpin
        </button>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
        {message.content}
      </p>
    </div>
  );
}
