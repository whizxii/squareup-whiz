"use client";

import { cn } from "@/lib/utils";

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
        return (
          <button
            key={emoji}
            onClick={() => onToggleReaction(emoji)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors",
              hasReacted
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-accent text-muted-foreground"
            )}
          >
            <span>{emoji}</span>
            <span>{users.length}</span>
          </button>
        );
      })}
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
