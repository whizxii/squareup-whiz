"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCreateNote } from "@/lib/hooks/use-crm-queries";
import { formatRelativeTime } from "@/lib/format";
import type { ContactNote } from "@/lib/types/crm";
import {
  FileText,
  Pin,
  PinOff,
  Send,
  SortAsc,
} from "lucide-react";

// ─── Note Card ──────────────────────────────────────────────────

function NoteCard({
  note,
  onTogglePin,
}: {
  note: ContactNote;
  onTogglePin: (id: string, pinned: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-4 space-y-2 transition-colors",
        note.is_pinned && "border-primary/30 bg-primary/5"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {note.is_pinned && (
            <Pin className="w-3 h-3 text-primary shrink-0" />
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(note.created_at)}
          </span>
          {note.created_by && (
            <>
              <span className="text-[10px] text-muted-foreground/40">
                &middot;
              </span>
              <span className="text-[10px] text-muted-foreground">
                {note.created_by}
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => onTogglePin(note.id, !note.is_pinned)}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={note.is_pinned ? "Unpin" : "Pin to top"}
        >
          {note.is_pinned ? (
            <PinOff className="w-3 h-3" />
          ) : (
            <Pin className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Content */}
      <p className="text-xs leading-relaxed whitespace-pre-wrap">
        {note.content}
      </p>
    </div>
  );
}

// ─── Sort options ───────────────────────────────────────────────

type SortOption = "newest" | "pinned";

// ─── Notes Tab ──────────────────────────────────────────────────

interface NotesTabProps {
  notes: ContactNote[];
  contactId: string;
}

export function NotesTab({ notes, contactId }: NotesTabProps) {
  const [content, setContent] = useState("");
  const [sort, setSort] = useState<SortOption>("pinned");
  const createNote = useCreateNote();

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    createNote.mutate({
      contactId,
      data: { content: trimmed },
    });
    setContent("");
  }, [content, contactId, createNote]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleTogglePin = useCallback(
    (_noteId: string, _pinned: boolean) => {
      // TODO: wire up pin/unpin mutation when API is ready
    },
    []
  );

  const sorted = useMemo(() => {
    const copy = [...notes];
    if (sort === "pinned") {
      copy.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    } else {
      copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return copy;
  }, [notes, sort]);

  return (
    <div className="p-6 space-y-4">
      {/* New note form */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note... (Cmd+Enter to save)"
          className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/30"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {content.length > 0
              ? `${content.length} characters`
              : "Cmd+Enter to save"}
          </p>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || createNote.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3 h-3" />
            {createNote.isPending ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      {/* Sort toggle */}
      {notes.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Notes ({notes.length})
          </p>
          <button
            onClick={() =>
              setSort((s) => (s === "pinned" ? "newest" : "pinned"))
            }
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <SortAsc className="w-3 h-3" />
            {sort === "pinned" ? "Pinned first" : "Newest first"}
          </button>
        </div>
      )}

      {/* Notes list */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No notes yet"
          description="Add notes to keep track of important details about this contact."
          className="min-h-[200px]"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
