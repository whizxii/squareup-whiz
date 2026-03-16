"use client";

import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

interface Reaction {
  emoji: string;
  user_id: string;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

export function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
}: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  const grouped = groupReactions(reactions);

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {grouped.map(([emoji, users]) => {
        const hasReacted = users.includes(currentUserId);
        const hasMomentum = users.length >= 3;

        return (
          <ReactionPill
            key={emoji}
            emoji={emoji}
            count={users.length}
            hasReacted={hasReacted}
            hasMomentum={hasMomentum}
            userIds={users}
            onClick={() => onToggleReaction(emoji)}
          />
        );
      })}
    </div>
  );
}

function ReactionPill({
  emoji,
  count,
  hasReacted,
  hasMomentum,
  userIds,
  onClick,
}: {
  emoji: string;
  count: number;
  hasReacted: boolean;
  hasMomentum: boolean;
  userIds: string[];
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [popping, setPopping] = useState(false);

  const handleClick = useCallback(() => {
    setPopping(true);
    onClick();
    // Remove animation class after it completes so it can retrigger
    setTimeout(() => setPopping(false), 260);
  }, [onClick]);

  // Build tooltip text from user IDs (in production, map to display names)
  const tooltipText =
    userIds.length <= 3
      ? userIds.join(", ")
      : `${userIds.slice(0, 2).join(", ")} and ${userIds.length - 2} more`;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all duration-150",
          hasReacted
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-card hover:bg-accent text-muted-foreground",
          hasMomentum && "border-primary/40 bg-primary/15 shadow-sm",
          "hover:scale-105 active:scale-95",
          popping && "animate-reaction-pop"
        )}
        aria-label={`React with ${emoji}, ${count} reaction${count !== 1 ? "s" : ""}`}
      >
        <span className={cn(hasMomentum && "text-sm")}>{emoji}</span>
        <span className={cn(hasMomentum && "font-semibold")}>{count}</span>
      </button>

      {/* Tooltip showing who reacted */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-40 pointer-events-none">
          <div className="px-2 py-1 rounded-md bg-popover border border-border shadow-md text-[10px] text-popover-foreground whitespace-nowrap">
            {tooltipText}
          </div>
        </div>
      )}
    </div>
  );
}

function groupReactions(
  reactions: Reaction[]
): [string, string[]][] {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) || [];
    map.set(r.emoji, [...existing, r.user_id]);
  }
  return Array.from(map.entries());
}
