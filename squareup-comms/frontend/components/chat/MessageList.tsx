"use client";

import { useChatStore, Message, TypingUser } from "@/lib/stores/chat-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { MessageBubble } from "./MessageBubble";
import { AgentThinkingIndicator } from "./agents/AgentThinkingIndicator";
import { StreamingAgentMessages } from "./agents/StreamingAgentMessage";
import { AgentConfirmationCards } from "./agents/AgentConfirmationCard";
import { ConversationSummary } from "./ConversationSummary";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MessageSquare, Sparkles, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { parseUtcDate, APP_LOCALE, APP_TIMEZONE } from "@/lib/format";
import { usePrefersReducedMotion } from "@/hooks/use-keyboard-shortcuts";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

// Stable references to avoid infinite re-render loops with React 19 + Zustand
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: TypingUser[] = [];

interface MessageListProps {
  loading?: boolean;
  onConfirmationRespond?: (
    requestId: string,
    approved: boolean,
    editedInput?: Record<string, unknown>
  ) => void;
}

/** Format a date into a human-readable day label */
function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - msgDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString(APP_LOCALE, { weekday: "long", timeZone: APP_TIMEZONE });
  }
  return date.toLocaleDateString(APP_LOCALE, {
    month: "long",
    day: "numeric",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
    timeZone: APP_TIMEZONE,
  });
}

/** Check if two dates are on different calendar days */
function isDifferentDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}

/** Row types for the flattened virtual list */
type VirtualRow =
  | { type: "date-separator"; label: string; key: string }
  | { type: "unread-divider"; key: string }
  | { type: "message"; message: Message; showAvatar: boolean; isRecent: boolean; key: string };

/** Estimated heights for initial layout before measurement */
const ROW_HEIGHT_ESTIMATES: Record<VirtualRow["type"], number> = {
  "date-separator": 44,
  "unread-divider": 32,
  message: 52,
};

export function MessageList({ loading = false, onConfirmationRespond }: MessageListProps) {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore(
    (s) => (activeChannelId ? s.messages[activeChannelId] : null) ?? EMPTY_MESSAGES
  );
  const typingUsers = useChatStore(
    (s) =>
      (activeChannelId ? s.typingUsers[activeChannelId] : null) ?? EMPTY_TYPING
  );
  const lastReadMessageId = useChatStore(
    (s) => (activeChannelId ? s.lastReadMessageId[activeChannelId] : null) ?? null
  );

  // Agents currently thinking/working (for thinking indicator bubbles)
  // Select stable reference, then filter in useMemo to avoid React 19 infinite loop
  const allAgents = useAgentStore((s) => s.agents);
  const thinkingAgents = useMemo(
    () => allAgents.filter((a) =>
      a.status === "thinking" || a.status === "working" || a.status === "tool_calling"
    ),
    [allAgents]
  );

  // Track streaming messages to auto-scroll during agent responses
  const streamingMessages = useAgentStore((s) => s.streamingMessages);
  const hasActiveStreams = useMemo(() => {
    if (!activeChannelId) return false;
    return Object.keys(streamingMessages).some((k) => k.startsWith(`${activeChannelId}:`));
  }, [streamingMessages, activeChannelId]);

  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isNearBottomRef = useRef(true);

  // Build the unread marker index (first message after lastReadMessageId)
  const unreadMarkerIndex = useMemo(() => {
    if (!lastReadMessageId) return -1;
    const readIdx = messages.findIndex((m) => m.id === lastReadMessageId);
    if (readIdx === -1 || readIdx >= messages.length - 1) return -1;
    return readIdx + 1;
  }, [messages, lastReadMessageId]);

  // Flatten messages + separators into a single row list for virtualization
  const rows = useMemo((): VirtualRow[] => {
    const result: VirtualRow[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = i > 0 ? messages[i - 1] : null;
      const msgDate = parseUtcDate(msg.created_at);
      const prevDate = prev ? parseUtcDate(prev.created_at) : null;

      const showDateSeparator = !prevDate || isDifferentDay(prevDate, msgDate);

      if (showDateSeparator) {
        result.push({
          type: "date-separator",
          label: formatDateLabel(msgDate),
          key: `date-${msg.id}`,
        });
      }

      if (i === unreadMarkerIndex) {
        result.push({ type: "unread-divider", key: `unread-${msg.id}` });
      }

      const showAvatar =
        !prev ||
        prev.sender_id !== msg.sender_id ||
        msgDate.getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000 ||
        showDateSeparator;

      result.push({
        type: "message",
        message: msg,
        showAvatar,
        isRecent: i >= messages.length - 3,
        key: msg.id,
      });
    }
    return result;
  }, [messages, unreadMarkerIndex]);

  // Virtual list for efficient rendering of 10k+ messages
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => ROW_HEIGHT_ESTIMATES[rows[index].type],
    overscan: 10,
  });

  // Track scroll position to show/hide jump-to-bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 100;
    isNearBottomRef.current = nearBottom;
    setIsScrolledUp(!nearBottom);
    if (nearBottom) {
      setUnreadCount(0);
    }
  }, []);

  // Auto-scroll to bottom on new messages (only if already near bottom)
  useEffect(() => {
    if (rows.length === 0) return;
    if (isNearBottomRef.current) {
      // Defer so the virtualizer has measured the new rows first.
      const frame = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(rows.length - 1, { align: "end", behavior: "smooth" });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages.length, rows.length, virtualizer]);

  // Auto-scroll during streaming agent responses (keep chat pinned to bottom)
  useEffect(() => {
    if (hasActiveStreams && isNearBottomRef.current && scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [hasActiveStreams, streamingMessages]);

  // Track whether we still need to perform the initial scroll-to-bottom after
  // a channel switch.  The effect below sets this to true; once the scroll
  // actually happens (possibly deferred until rows are available) it is cleared.
  const needsInitialScrollRef = useRef(false);

  // Reset state on channel switch.
  useEffect(() => {
    setIsScrolledUp(false);
    setUnreadCount(0);
    isNearBottomRef.current = true;
    needsInitialScrollRef.current = true;
  }, [activeChannelId]);

  // Perform the actual scroll-to-bottom.  Runs whenever the channel changes
  // OR when rows first populate (messages loaded after channel switch).
  useEffect(() => {
    if (!needsInitialScrollRef.current) return;
    if (rows.length === 0) return; // wait until rows are available

    needsInitialScrollRef.current = false;

    // Double-rAF: first frame lets the virtualizer measure, second scrolls.
    let cancelled = false;
    const frame1 = requestAnimationFrame(() => {
      if (cancelled) return;
      const frame2 = requestAnimationFrame(() => {
        if (cancelled) return;
        virtualizer.scrollToIndex(rows.length - 1, { align: "end", behavior: "auto" });
        // Fallback: also set scrollTop directly in case virtualizer hasn't settled
        const el = scrollRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
      // Store frame2 ID for cleanup
      cleanupFrame2 = frame2;
    });
    let cleanupFrame2: number | undefined;
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame1);
      if (cleanupFrame2 !== undefined) cancelAnimationFrame(cleanupFrame2);
    };
  }, [activeChannelId, rows.length, virtualizer]);

  const jumpToBottom = useCallback(() => {
    virtualizer.scrollToIndex(rows.length - 1, { align: "end", behavior: "smooth" });
    setIsScrolledUp(false);
    setUnreadCount(0);
  }, [virtualizer, rows.length]);

  if (!activeChannelId) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in-up">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto ring-1 ring-primary/10">
            <MessageSquare className="w-7 h-7 text-primary/50" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">Welcome to Chat</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select a channel from the sidebar to start a conversation with your team.
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">⌘K</kbd>
            <span>to search channels</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div
        key={activeChannelId}
        ref={scrollRef}
        className="h-full overflow-y-auto scrollbar-thin"
        onScroll={handleScroll}
        role="log"
        aria-label="Message history"
        aria-live="polite"
        aria-relevant="additions"
      >
        {/* AI conversation summary */}
        <ConversationSummary />

        {/* Skeleton loading */}
        {loading ? (
          <div className="space-y-4 px-4 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <MessageSkeleton key={i} short={i % 3 === 2} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full min-h-[300px] animate-fade-in-up">
            <div className="text-center space-y-4 max-w-xs">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto ring-1 ring-primary/10">
                <Sparkles className="w-7 h-7 text-primary/60" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sq-online ring-2 ring-card" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">
                  Start the conversation
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Say hello, share an update, or mention <span className="text-sq-agent font-medium">@agent</span> to get things done automatically.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Virtualized message list */
          <div
            style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <VirtualRowRenderer
                    row={row}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Streaming agent responses (live text + tool cards) */}
        {activeChannelId && (
          <StreamingAgentMessages channelId={activeChannelId} />
        )}

        {/* Agent confirmation cards (destructive action approval) */}
        {activeChannelId && onConfirmationRespond && (
          <AgentConfirmationCards
            channelId={activeChannelId}
            onRespond={onConfirmationRespond}
          />
        )}

        {/* Agent thinking indicators */}
        <div aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {thinkingAgents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 5, height: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 25 }}
              className="overflow-hidden"
            >
              <AgentThinkingIndicator
                agentName={agent.name}
                agentIcon={agent.office_station_icon}
                statusDescription={agent.current_task}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        </div>

        {/* Typing indicator */}
        <div aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 5, height: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 25 }}
              className="px-4 py-2 overflow-hidden"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <TypingDots />
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">
                    {typingUsers.map((u) => u.display_name).join(", ")}
                  </span>
                  {" "}{typingUsers.length === 1 ? "is" : "are"} typing
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Jump to bottom button */}
      {isScrolledUp && (
        <button
          onClick={jumpToBottom}
          className={cn(
            "absolute bottom-4 left-1/2 -translate-x-1/2 z-30",
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            "bg-card border border-border shadow-lg",
            "text-xs font-medium text-foreground/80",
            "hover:bg-accent hover:shadow-xl transition-all duration-200",
            "animate-fade-in-up"
          )}
          aria-label={unreadCount > 0 ? `${unreadCount} new messages — jump to bottom` : "Jump to bottom"}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          {unreadCount > 0 ? (
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] text-center">
                {unreadCount}
              </span>
              new
            </span>
          ) : (
            "Jump to latest"
          )}
        </button>
      )}
    </div>
  );
}

/** Renders a single virtual row — date separator, unread divider, or message */
function VirtualRowRenderer({
  row,
  prefersReducedMotion,
}: {
  row: VirtualRow;
  prefersReducedMotion: boolean;
}) {
  const currentUserId = useCurrentUserId();

  if (row.type === "date-separator") {
    return <DateSeparator label={row.label} />;
  }
  if (row.type === "unread-divider") {
    return <UnreadDivider />;
  }
  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={row.isRecent && !prefersReducedMotion ? { opacity: 0, y: 15, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={prefersReducedMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }
      }
      className="origin-bottom"
    >
      <MessageBubble
        message={row.message}
        isOwn={row.message.sender_id === currentUserId}
        showAvatar={row.showAvatar}
        currentUserId={currentUserId}
      />
    </motion.div>
  );
}

/** Date separator line with centered label */
function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" role="separator" aria-label={label}>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground select-none">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/** Unread messages divider */
function UnreadDivider() {
  return (
    <div className="flex items-center gap-3 px-4 py-2" role="separator" aria-label="New messages">
      <div className="flex-1 h-px bg-destructive/40" />
      <span className="text-[11px] font-semibold text-destructive select-none">
        New messages
      </span>
      <div className="flex-1 h-px bg-destructive/40" />
    </div>
  );
}

function MessageSkeleton({ short = false }: { short?: boolean }) {
  return (
    <div className="flex gap-3 px-4 py-1.5">
      <div className="w-8 h-8 rounded-lg skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded skeleton" />
          <div className="h-2.5 w-12 rounded skeleton" />
        </div>
        <div className="h-3 rounded skeleton" style={{ width: short ? "40%" : "75%" }} />
        {!short && <div className="h-3 w-[50%] rounded skeleton" />}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-typing-dot"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </span>
  );
}
