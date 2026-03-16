"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, Users, AtSign } from "lucide-react";

export interface MentionSuggestion {
  id: string;
  label: string;
  type: "user" | "agent";
  icon?: string;
  description?: string;
}

interface MentionListProps {
  items: MentionSuggestion[];
  command: (item: MentionSuggestion) => void;
}

export const MentionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  MentionListProps
>(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) =>
          prev <= 0 ? items.length - 1 : prev - 1
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) =>
          prev >= items.length - 1 ? 0 : prev + 1
        );
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-lg p-3 z-50">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AtSign className="w-3 h-3" />
          No matches found
        </p>
      </div>
    );
  }

  // Group items by type
  const agents = items.filter((i) => i.type === "agent");
  const users = items.filter((i) => i.type === "user");

  // Build flat list for selection tracking
  const flatItems = [...users, ...agents];

  return (
    <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 min-w-[220px] max-w-[320px]">
      {users.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30">
            <Users className="w-3 h-3" />
            People
          </div>
          {users.map((item) => {
            const idx = flatItems.indexOf(item);
            return (
              <MentionItem
                key={item.id}
                item={item}
                isSelected={idx === selectedIndex}
                onClick={() => command(item)}
                onHover={() => setSelectedIndex(idx)}
              />
            );
          })}
        </div>
      )}

      {agents.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30">
            <Bot className="w-3 h-3" />
            Agents
          </div>
          {agents.map((item) => {
            const idx = flatItems.indexOf(item);
            return (
              <MentionItem
                key={item.id}
                item={item}
                isSelected={idx === selectedIndex}
                onClick={() => command(item)}
                onHover={() => setSelectedIndex(idx)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

function MentionItem({
  item,
  isSelected,
  onClick,
  onHover,
}: {
  item: MentionSuggestion;
  isSelected: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  const isAgent = item.type === "agent";

  return (
    <button
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
      )}
      onClick={onClick}
      onMouseEnter={onHover}
      role="option"
      aria-selected={isSelected}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
          isAgent
            ? "bg-sq-agent/10 ring-1 ring-sq-agent/20"
            : "bg-gradient-brand text-white"
        )}
      >
        {isAgent ? (
          item.icon ? (
            <span className="text-sm">{item.icon}</span>
          ) : (
            <Bot className="w-3.5 h-3.5 text-sq-agent" />
          )
        ) : (
          item.label.charAt(0).toUpperCase()
        )}
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{item.label}</span>
          {isAgent && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-sq-agent/10 text-sq-agent font-semibold leading-none">
              AI
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-[11px] text-muted-foreground truncate">
            {item.description}
          </p>
        )}
      </div>
    </button>
  );
}
