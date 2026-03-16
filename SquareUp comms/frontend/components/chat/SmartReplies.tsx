"use client";

import { useChatStore, type Message } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

interface SmartRepliesProps {
  /** Called when a suggestion pill is clicked — populates the composer */
  onSelect: (text: string) => void;
  className?: string;
}

/** Detect if a message likely expects a response (question, request, etc.) */
function expectsResponse(msg: Message): boolean {
  const content = (msg.content || "").trim().toLowerCase();
  if (!content) return false;

  // Questions
  if (content.endsWith("?")) return true;

  // Request patterns
  const requestPatterns = [
    /^(can|could|would|will|shall|should|do|does|did|is|are|was|were|have|has|had)\b/i,
    /\b(please|pls|help|thoughts|opinion|feedback|review|check|update|let me know|lmk|wdyt|wyt)\b/i,
    /\b(what do you think|any ideas|suggestions|recommend)\b/i,
  ];

  return requestPatterns.some((p) => p.test(content));
}

/** Generate contextual smart reply suggestions based on the last messages */
function generateSuggestions(messages: Message[], currentUserId: string): string[] {
  if (messages.length === 0) return [];

  const lastMsg = messages[messages.length - 1];
  // Don't suggest replies to own messages
  if (lastMsg.sender_id === currentUserId) return [];
  // Only suggest for messages that expect a response
  if (!expectsResponse(lastMsg)) return [];

  const content = (lastMsg.content || "").trim().toLowerCase();

  // Context-specific suggestions
  if (/\b(meeting|call|sync|standup|catchup)\b/i.test(content)) {
    return [
      "Works for me!",
      "Can we reschedule?",
      "I'll be there",
    ];
  }

  if (/\b(review|pr|pull request|merge|code)\b/i.test(content)) {
    return [
      "I'll take a look",
      "On it!",
      "Need more context",
    ];
  }

  if (/\b(deploy|release|ship|launch|push)\b/i.test(content)) {
    return [
      "Let's do it!",
      "Hold on, let me check",
      "Looks good to me",
    ];
  }

  if (/\b(bug|issue|error|broken|fix)\b/i.test(content)) {
    return [
      "Looking into it",
      "Can you share more details?",
      "I'll fix this",
    ];
  }

  if (/\b(design|ui|ux|mockup|prototype|figma)\b/i.test(content)) {
    return [
      "Looks great!",
      "A few suggestions...",
      "Let's iterate on this",
    ];
  }

  if (/\b(help|stuck|blocked|confused)\b/i.test(content)) {
    return [
      "Happy to help!",
      "What are you working on?",
      "Let's hop on a call",
    ];
  }

  // Generic question responses
  if (content.endsWith("?")) {
    return [
      "Yes, sounds good!",
      "Not sure, let me check",
      "Can we discuss this?",
    ];
  }

  // Generic request responses
  return [
    "Sure, on it!",
    "I'll get back to you",
    "Thanks for the heads up",
  ];
}

// Stable empty array reference
const EMPTY_MESSAGES: Message[] = [];

export function SmartReplies({ onSelect, className }: SmartRepliesProps) {
  const currentUserId = useCurrentUserId();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore(
    (s) => (activeChannelId ? s.messages[activeChannelId] : null) ?? EMPTY_MESSAGES
  );

  const [dismissed, setDismissed] = useState(false);
  const [lastMsgId, setLastMsgId] = useState<string | null>(null);

  // Reset dismissed state when new messages arrive
  useEffect(() => {
    const latestId = messages.length > 0 ? messages[messages.length - 1].id : null;
    if (latestId !== lastMsgId) {
      setDismissed(false);
      setLastMsgId(latestId);
    }
  }, [messages, lastMsgId]);

  // Reset on channel switch
  useEffect(() => {
    setDismissed(false);
    setLastMsgId(null);
  }, [activeChannelId]);

  const suggestions = useMemo(
    () => (dismissed ? [] : generateSuggestions(messages, currentUserId)),
    [messages, dismissed, currentUserId]
  );

  const handleSelect = useCallback(
    (text: string) => {
      onSelect(text);
      setDismissed(true);
    },
    [onSelect]
  );

  if (suggestions.length === 0) return null;

  return (
    <div className={cn("px-4 pb-1", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-3 h-3 text-primary/50 shrink-0" />
        <AnimatePresence mode="popLayout">
          {suggestions.map((text, i) => (
            <motion.button
              key={text}
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                delay: i * 0.08,
              }}
              onClick={() => handleSelect(text)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                "bg-primary/5 border border-primary/15 text-primary/80",
                "hover:bg-primary/10 hover:border-primary/25 hover:text-primary",
                "active:scale-95 transition-all duration-150",
                "cursor-pointer select-none"
              )}
            >
              {text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
