"use client";

import {
  Paperclip,
  Smile,
  Send,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  onAttach: () => void;
  onEmojiToggle: () => void;
  onSend: () => void;
  onVoiceToggle?: () => void;
  onFormatToggle?: () => void;
  showEmojiPicker: boolean;
  canSend: boolean;
  sending: boolean;
  isVoiceActive?: boolean;
  showFormatBar?: boolean;
  onBold?: () => void;
  onItalic?: () => void;
  onStrike?: () => void;
  onCode?: () => void;
  onBulletList?: () => void;
  onOrderedList?: () => void;
  onBlockquote?: () => void;
  formatState?: {
    bold: boolean;
    italic: boolean;
    strike: boolean;
    code: boolean;
    bulletList: boolean;
    orderedList: boolean;
    blockquote: boolean;
  };
}

export function EditorToolbar({
  onAttach,
  onEmojiToggle,
  onSend,
  onVoiceToggle,
  showEmojiPicker,
  canSend,
  sending,
  isVoiceActive = false,
  showFormatBar = false,
  onBold,
  onItalic,
  onStrike,
  onCode,
  onBulletList,
  onOrderedList,
  onBlockquote,
  formatState,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/50">
      <div className="flex items-center gap-0.5">
        {/* Attach */}
        <ToolbarButton
          icon={<Paperclip className="w-4 h-4" />}
          label="Attach file"
          onClick={onAttach}
        />

        {/* Emoji */}
        <ToolbarButton
          icon={<Smile className="w-4 h-4" />}
          label="Emoji"
          active={showEmojiPicker}
          onClick={onEmojiToggle}
        />

        {/* Voice */}
        {onVoiceToggle && (
          <ToolbarButton
            icon={<Mic className="w-4 h-4" />}
            label={isVoiceActive ? "Stop recording" : "Voice input"}
            active={isVoiceActive}
            activeColor="text-red-500"
            onClick={onVoiceToggle}
          />
        )}

        {/* Formatting divider */}
        {showFormatBar && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton
              icon={<Bold className="w-3.5 h-3.5" />}
              label="Bold"
              active={formatState?.bold}
              onClick={onBold}
            />
            <ToolbarButton
              icon={<Italic className="w-3.5 h-3.5" />}
              label="Italic"
              active={formatState?.italic}
              onClick={onItalic}
            />
            <ToolbarButton
              icon={<Strikethrough className="w-3.5 h-3.5" />}
              label="Strikethrough"
              active={formatState?.strike}
              onClick={onStrike}
            />
            <ToolbarButton
              icon={<Code className="w-3.5 h-3.5" />}
              label="Code"
              active={formatState?.code}
              onClick={onCode}
            />
            <ToolbarButton
              icon={<List className="w-3.5 h-3.5" />}
              label="Bullet list"
              active={formatState?.bulletList}
              onClick={onBulletList}
            />
            <ToolbarButton
              icon={<ListOrdered className="w-3.5 h-3.5" />}
              label="Numbered list"
              active={formatState?.orderedList}
              onClick={onOrderedList}
            />
            <ToolbarButton
              icon={<Quote className="w-3.5 h-3.5" />}
              label="Quote"
              active={formatState?.blockquote}
              onClick={onBlockquote}
            />
          </>
        )}
      </div>

      {/* Send */}
      <button
        onClick={onSend}
        disabled={!canSend || sending}
        className={cn(
          "p-2 rounded-lg transition-all duration-150",
          canSend && !sending
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            : "text-muted-foreground/40 cursor-not-allowed"
        )}
        title="Send message (Enter)"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  active = false,
  activeColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
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
          ? activeColor ?? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {icon}
    </button>
  );
}
