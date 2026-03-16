"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Code,
  Link as LinkIcon,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  editor: Editor;
  onLinkAdd: (url: string) => void;
}

export function FloatingToolbar({ editor, onLinkAdd }: FloatingToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const handleLinkSubmit = useCallback(() => {
    if (linkUrl.trim()) {
      const url = linkUrl.trim().startsWith("http")
        ? linkUrl.trim()
        : `https://${linkUrl.trim()}`;
      onLinkAdd(url);
      setLinkUrl("");
      setShowLinkInput(false);
    }
  }, [linkUrl, onLinkAdd]);

  const handleLinkKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLinkSubmit();
      }
      if (e.key === "Escape") {
        setShowLinkInput(false);
        setLinkUrl("");
      }
    },
    [handleLinkSubmit]
  );

  const toggleLink = useCallback(() => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
    } else {
      setShowLinkInput(true);
      setLinkUrl("");
    }
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-border bg-card shadow-lg z-50"
    >
      {showLinkInput ? (
        <div className="flex items-center gap-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="Paste URL..."
            className="w-44 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
            autoFocus
          />
          <button
            onClick={handleLinkSubmit}
            className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <FormatButton
            icon={<Bold className="w-3.5 h-3.5" />}
            label="Bold (Cmd+B)"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <FormatButton
            icon={<Italic className="w-3.5 h-3.5" />}
            label="Italic (Cmd+I)"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <FormatButton
            icon={<UnderlineIcon className="w-3.5 h-3.5" />}
            label="Underline (Cmd+U)"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <FormatButton
            icon={<Strikethrough className="w-3.5 h-3.5" />}
            label="Strikethrough"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <div className="w-px h-4 bg-border mx-0.5" />
          <FormatButton
            icon={<Code className="w-3.5 h-3.5" />}
            label="Code"
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />
          <FormatButton
            icon={<LinkIcon className="w-3.5 h-3.5" />}
            label="Link (Cmd+K)"
            active={editor.isActive("link")}
            onClick={toggleLink}
          />
        </>
      )}
    </BubbleMenu>
  );
}

function FormatButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {icon}
    </button>
  );
}
