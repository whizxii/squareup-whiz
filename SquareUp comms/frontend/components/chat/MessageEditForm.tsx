"use client";

import { useRef, useCallback } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { TiptapEditor, type TiptapEditorHandle } from "./editor/TiptapEditor";

interface MessageEditFormProps {
  content: string;
  contentHtml?: string;
  onChange: (content: string) => void;
  onChangeHtml?: (html: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function MessageEditForm({
  content,
  contentHtml,
  onChange,
  onChangeHtml,
  onSave,
  onCancel,
  loading,
}: MessageEditFormProps) {
  const editorRef = useRef<TiptapEditorHandle>(null);

  const handleUpdate = useCallback(
    (html: string, text: string) => {
      onChange(text);
      onChangeHtml?.(html);
    },
    [onChange, onChangeHtml]
  );

  const handleSubmit = useCallback(() => {
    if (loading) return;
    const text = editorRef.current?.getText()?.trim();
    if (!text) return;
    onSave();
  }, [loading, onSave]);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-primary/30 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring/20">
        <TiptapEditor
          ref={editorRef}
          initialContent={contentHtml || content}
          onUpdate={handleUpdate}
          onSubmit={handleSubmit}
          compact
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
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
