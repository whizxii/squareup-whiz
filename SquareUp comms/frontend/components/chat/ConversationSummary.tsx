"use client";

import { useChatStore, type Message } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

// Stable empty array
const EMPTY_MESSAGES: Message[] = [];

interface ConversationSummaryProps {
  className?: string;
}

/** Generate a local summary from messages (simulated — replace with agent API call) */
function generateLocalSummary(messages: Message[]): {
  topics: string[];
  decisions: string[];
  actionItems: string[];
} {
  if (messages.length === 0) {
    return { topics: [], decisions: [], actionItems: [] };
  }

  const topics: string[] = [];
  const decisions: string[] = [];
  const actionItems: string[] = [];

  // Analyze message content for patterns
  const allContent = messages
    .map((m) => (m.content || "").toLowerCase())
    .join(" ");

  // Topic detection
  if (/\b(design|ui|ux|mockup|figma|prototype)\b/.test(allContent)) {
    topics.push("Design and UI/UX discussion");
  }
  if (/\b(bug|fix|error|issue|broken|crash)\b/.test(allContent)) {
    topics.push("Bug reports and fixes");
  }
  if (/\b(deploy|release|ship|launch|production)\b/.test(allContent)) {
    topics.push("Deployment and release planning");
  }
  if (/\b(meeting|sync|standup|call|catchup)\b/.test(allContent)) {
    topics.push("Meeting coordination");
  }
  if (/\b(review|pr|pull request|merge|code)\b/.test(allContent)) {
    topics.push("Code review activity");
  }
  if (/\b(feature|implement|build|create|add)\b/.test(allContent)) {
    topics.push("Feature development");
  }

  // Decision detection
  if (/\b(decided|agreed|let'?s go with|we'?ll use|approved)\b/.test(allContent)) {
    decisions.push("Team reached agreement on an approach");
  }
  if (/\b(deadline|due by|by end of|target date)\b/.test(allContent)) {
    decisions.push("Timeline or deadline was set");
  }

  // Action item detection
  if (/\b(todo|to-do|action item|follow up|next step)\b/.test(allContent)) {
    actionItems.push("Follow-up tasks were identified");
  }
  if (/\b(i'?ll|i will|i can|let me|i'?m going to)\b/.test(allContent)) {
    actionItems.push("Team members volunteered for tasks");
  }
  if (/\b(assign|owner|responsible|take care of)\b/.test(allContent)) {
    actionItems.push("Work was assigned to team members");
  }

  // Fallback summary based on activity
  if (topics.length === 0) {
    const senderCount = new Set(messages.map((m) => m.sender_id)).size;
    const agentMessages = messages.filter((m) => m.sender_type === "agent").length;
    topics.push(
      `${messages.length} messages from ${senderCount} participant${senderCount !== 1 ? "s" : ""}${
        agentMessages > 0 ? ` (including ${agentMessages} agent response${agentMessages !== 1 ? "s" : ""})` : ""
      }`
    );
  }

  return { topics, decisions, actionItems };
}

export function ConversationSummary({ className }: ConversationSummaryProps) {
  const currentUserId = useCurrentUserId();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore(
    (s) => (activeChannelId ? s.messages[activeChannelId] : null) ?? EMPTY_MESSAGES
  );

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  // Only consider unread / recent messages (last 50 for summary context)
  const recentMessages = useMemo(
    () => messages.slice(-50).filter((m) => m.sender_id !== currentUserId),
    [messages, currentUserId]
  );

  const summary = useMemo(
    () => (summaryGenerated ? generateLocalSummary(recentMessages) : null),
    [recentMessages, summaryGenerated]
  );

  const hasSummary =
    summary &&
    (summary.topics.length > 0 ||
      summary.decisions.length > 0 ||
      summary.actionItems.length > 0);

  const handleSummarize = useCallback(() => {
    setLoading(true);
    // Simulate AI processing delay
    setTimeout(() => {
      setSummaryGenerated(true);
      setExpanded(true);
      setLoading(false);
    }, 800);
  }, []);

  const handleRefresh = useCallback(() => {
    setSummaryGenerated(false);
    handleSummarize();
  }, [handleSummarize]);

  // Don't show if no messages or too few to summarize
  if (messages.length < 3) return null;

  return (
    <div
      className={cn(
        "border-b border-border bg-gradient-to-r from-primary/[0.03] to-transparent",
        className
      )}
    >
      {/* Toggle bar */}
      <button
        onClick={hasSummary ? () => setExpanded((prev) => !prev) : handleSummarize}
        disabled={loading}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2 text-left",
          "hover:bg-primary/[0.04] transition-colors duration-150",
          "disabled:opacity-60 disabled:cursor-wait"
        )}
      >
        <Sparkles
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            loading ? "text-primary animate-spin" : "text-primary/60"
          )}
        />
        <span className="text-xs font-medium text-foreground/80 flex-1">
          {loading
            ? "Summarizing conversation..."
            : hasSummary
            ? "Conversation summary"
            : "Summarize unread messages"}
        </span>

        {hasSummary && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="p-0.5 rounded hover:bg-accent transition-colors"
              aria-label="Refresh summary"
            >
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            </button>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        )}
      </button>

      {/* Summary content */}
      <AnimatePresence>
        {expanded && hasSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {/* Topics */}
              {summary.topics.length > 0 && (
                <SummarySection title="Topics discussed" items={summary.topics} />
              )}

              {/* Decisions */}
              {summary.decisions.length > 0 && (
                <SummarySection
                  title="Decisions made"
                  items={summary.decisions}
                  variant="success"
                />
              )}

              {/* Action items */}
              {summary.actionItems.length > 0 && (
                <SummarySection
                  title="Action items"
                  items={summary.actionItems}
                  variant="warning"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummarySection({
  title,
  items,
  variant = "default",
}: {
  title: string;
  items: string[];
  variant?: "default" | "success" | "warning";
}) {
  const dotColor = {
    default: "bg-primary/50",
    success: "bg-emerald-500/60",
    warning: "bg-amber-500/60",
  }[variant];

  return (
    <div>
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {title}
      </h4>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-foreground/80">
            <span
              className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", dotColor)}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
