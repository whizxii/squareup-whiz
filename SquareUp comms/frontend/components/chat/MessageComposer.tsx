"use client";

import { useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Smile } from "lucide-react";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface MessageComposerProps {
  onTypingChange?: (isTyping: boolean) => void;
}

export function MessageComposer({ onTypingChange }: MessageComposerProps = {}) {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const addMessage = useChatStore((s) => s.addMessage);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const handleSend = useCallback(async () => {
    if (!activeChannelId || !content.trim() || sending) return;

    const text = content.trim();
    setContent("");
    setSending(true);
    onTypingChange?.(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const message = await api.sendMessage({
        channel_id: activeChannelId,
        content: text,
      });

      addMessage(activeChannelId, {
        id: message.id,
        channel_id: message.channel_id,
        sender_id: message.sender_id,
        sender_type: (message.sender_type || "user") as "user" | "agent",
        content: message.content,
        content_html: message.content_html,
        thread_id: message.thread_id,
        created_at: message.created_at,
        updated_at: message.updated_at,
        sender_name: "You",
        reply_count: message.reply_count || 0,
        edited: message.edited || false,
        pinned: message.pinned || false,
        reactions: [],
        attachments: [],
        mentions: [],
      });
    } catch (err) {
      setContent(text);
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [activeChannelId, content, sending, addMessage, onTypingChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (e.target.value.length > 0) {
      onTypingChange?.(true);
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newContent =
        content.substring(0, start) + emoji.native + content.substring(end);
      setContent(newContent);
      // Restore cursor position after emoji
      requestAnimationFrame(() => {
        el.focus();
        const newPos = start + emoji.native.length;
        el.selectionStart = newPos;
        el.selectionEnd = newPos;
      });
    } else {
      setContent((prev) => prev + emoji.native);
    }
    setShowEmojiPicker(false);
  };

  if (!activeChannelId) return null;

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Attachment button */}
        <button
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-0.5 opacity-50 cursor-not-allowed"
          title="Attach file (coming soon)"
          aria-label="Attach file (coming soon)"
          aria-disabled="true"
          onClick={() => {
            // TODO: Wire file upload
          }}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message... (Shift+Enter for new line)"
            aria-label="Message input"
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all scrollbar-thin"
            style={{ maxHeight: 160 }}
          />
        </div>

        {/* Emoji picker */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={cn(
              "p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-0.5",
              showEmojiPicker && "bg-accent text-foreground"
            )}
            title="Emoji"
            aria-label="Toggle emoji picker"
            aria-expanded={showEmojiPicker}
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="auto"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={2}
              />
            </div>
          )}
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

