"use client";

import { useRef, useEffect, useState } from "react";
import {
  SmilePlus,
  MessageSquareReply,
  Pencil,
  Trash2,
} from "lucide-react";

const QUICK_REACTIONS = [
  "\u{1F44D}", // 👍
  "\u{2764}\u{FE0F}", // ❤️
  "\u{1F602}", // 😂
  "\u{1F62E}", // 😮
  "\u{1F389}", // 🎉
  "\u{1F64F}", // 🙏
];

interface MessageActionsProps {
  isOwn: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MessageActions({
  isOwn,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: MessageActionsProps) {
  const [showQuickReact, setShowQuickReact] = useState(false);
  const quickReactRef = useRef<HTMLDivElement>(null);

  // Close quick react on outside click
  useEffect(() => {
    if (!showQuickReact) return;
    const handler = (e: MouseEvent) => {
      if (
        quickReactRef.current &&
        !quickReactRef.current.contains(e.target as Node)
      ) {
        setShowQuickReact(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showQuickReact]);

  const handleReact = (emoji: string) => {
    setShowQuickReact(false);
    onReact(emoji);
  };

  return (
    <div
      className="absolute -top-3 right-4 flex items-center gap-0.5 px-1 py-0.5 rounded-md border border-border bg-card shadow-sm z-20"
      role="toolbar"
      aria-label="Message actions"
    >
      {/* Quick react */}
      <div className="relative" ref={quickReactRef}>
        <ActionButton
          icon={<SmilePlus className="w-3.5 h-3.5" />}
          tooltip="React"
          onClick={() => setShowQuickReact((v) => !v)}
        />
        {showQuickReact && (
          <div className="absolute bottom-full right-0 mb-1 flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-border bg-card shadow-lg z-30">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-1 rounded hover:bg-accent text-base transition-colors hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <ActionButton
        icon={<MessageSquareReply className="w-3.5 h-3.5" />}
        tooltip="Reply in thread"
        onClick={onReply}
      />
      {isOwn && (
        <>
          <ActionButton
            icon={<Pencil className="w-3.5 h-3.5" />}
            tooltip="Edit"
            onClick={onEdit}
          />
          <ActionButton
            icon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
            tooltip="Delete"
            onClick={onDelete}
          />
        </>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
    </button>
  );
}
