"use client";

import { useChatStore, Message, TypingUser } from "@/lib/stores/chat-store";
import { MessageBubble } from "./MessageBubble";
import { useEffect, useRef } from "react";
import { MessageSquare, Sparkles } from "lucide-react";

const CURRENT_USER_ID = "dev-user-001"; // TODO: from auth context

// Stable references to avoid infinite re-render loops with React 19 + Zustand
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: TypingUser[] = [];

interface MessageListProps {
  loading?: boolean;
}

export function MessageList({ loading = false }: MessageListProps) {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore(
    (s) => (activeChannelId ? s.messages[activeChannelId] : null) ?? EMPTY_MESSAGES
  );
  const typingUsers = useChatStore(
    (s) =>
      (activeChannelId ? s.typingUsers[activeChannelId] : null) ?? EMPTY_TYPING
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="py-4">
        {/* Skeleton loading */}
        {loading ? (
          <div className="space-y-4 px-4">
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
          /* Messages */
          messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const showAvatar =
              !prev ||
              prev.sender_id !== msg.sender_id ||
              new Date(msg.created_at).getTime() -
                new Date(prev.created_at).getTime() >
                5 * 60 * 1000;

            // Only animate the last few messages (new arrivals), not the entire history
            const isRecent = i >= messages.length - 3;

            return (
              <div key={msg.id} className={isRecent ? "animate-message-enter" : undefined}>
                <MessageBubble
                  message={msg}
                  isOwn={msg.sender_id === CURRENT_USER_ID}
                  showAvatar={showAvatar}
                  currentUserId={CURRENT_USER_ID}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <TypingDots />
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">
                {typingUsers.map((u) => u.display_name).join(", ")}
              </span>
              {" "}{typingUsers.length === 1 ? "is" : "are"} typing
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
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
