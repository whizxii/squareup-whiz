"use client";

import { useRef, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";

interface MessageEditFormProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function MessageEditForm({
  content,
  onChange,
  onSave,
  onCancel,
  loading,
}: MessageEditFormProps) {
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Focus and place cursor at end when mounted
  useEffect(() => {
    if (editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={editRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-lg border border-primary/30 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 scrollbar-thin"
        rows={Math.min(content.split("\n").length + 1, 6)}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={loading || !content.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs hover:bg-accent transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <span className="text-[10px] text-muted-foreground">
          Enter to save, Esc to cancel
        </span>
      </div>
    </div>
  );
}
