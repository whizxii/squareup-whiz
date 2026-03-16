"use client";

import { useChatStore, type Message } from "@/lib/stores/chat-store";
import { useAgentStore } from "@/lib/stores/agent-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { X, MessageSquareReply } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import { ThreadMessage } from "./ThreadMessage";
import { TiptapEditor, type TiptapEditorHandle } from "../editor/TiptapEditor";
import type { MentionSuggestion } from "../mentions/MentionList";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

// Stable empty array
const EMPTY_MESSAGES: Message[] = [];

interface ThreadPanelProps {
  parentMessageId: string;
  onClose: () => void;
}

export function ThreadPanel({ parentMessageId, onClose }: ThreadPanelProps) {
  const currentUserId = useCurrentUserId();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const allMessages = useChatStore(
    (s) => (activeChannelId ? s.messages[activeChannelId] : null) ?? EMPTY_MESSAGES
  );
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const agents = useAgentStore((s) => s.agents);

  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);

  const editorRef = useRef<TiptapEditorHandle>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [hasContent, setHasContent] = useState(false);

  // Find the parent message
  const parentMessage = useMemo(
    () => allMessages.find((m) => m.id === parentMessageId),
    [allMessages, parentMessageId]
  );

  // Build mention suggestions
  const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
    const agentSuggestions: MentionSuggestion[] = agents
      .filter((a) => a.active)
      .map((a) => ({
        id: a.id,
        label: a.name,
        type: "agent" as const,
        icon: a.office_station_icon,
        description: a.description,
      }));

    const userSuggestions: MentionSuggestion[] = [
      { id: currentUserId, label: "You", type: "user" },
    ];

    return [...userSuggestions, ...agentSuggestions];
  }, [agents, currentUserId]);

  // Fetch thread replies
  useEffect(() => {
    const fetchReplies = async () => {
      setLoading(true);
      try {
        const threadReplies = await api.getThreadReplies(parentMessageId);
        setReplies(
          threadReplies.map((r) => ({
            ...r,
            sender_type: (r.sender_type || "user") as "user" | "agent",
            reply_count: r.reply_count || 0,
            edited: r.edited || false,
            pinned: r.pinned || false,
            reactions: [],
            attachments: [],
            mentions: [],
            sender_name: r.sender_id,
          }))
        );
      } catch {
        // API not available — use empty replies for dev
        setReplies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReplies();
  }, [parentMessageId]);

  // Scroll to bottom on new replies
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  const handleSend = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || editor.isEmpty() || sending || !activeChannelId) return;

    const text = editor.getText().trim();
    const html = editor.getHTML();
    if (!text) return;

    setSending(true);
    editor.clear();
    setHasContent(false);

    // Optimistic: add reply locally
    const tempId = `temp-thread-${Date.now()}`;
    const newReply: Message = {
      id: tempId,
      channel_id: activeChannelId,
      sender_id: currentUserId,
      sender_type: "user",
      content: text,
      content_html: html !== "<p></p>" ? html : undefined,
      thread_id: parentMessageId,
      reply_count: 0,
      edited: false,
      pinned: false,
      created_at: new Date().toISOString(),
      sender_name: "You",
      pending: true,
      reactions: [],
      attachments: [],
      mentions: [],
    };

    setReplies((prev) => [...prev, newReply]);

    // Also send to channel if checkbox is checked
    if (alsoSendToChannel) {
      addMessage(activeChannelId, {
        ...newReply,
        id: `${tempId}-channel`,
        thread_id: undefined,
      });
    }

    // Update parent reply count
    if (parentMessage) {
      updateMessage(activeChannelId, parentMessageId, {
        reply_count: parentMessage.reply_count + 1,
      });
    }

    try {
      const message = await api.sendMessage({
        channel_id: activeChannelId,
        content: text,
        content_html: html !== "<p></p>" ? html : undefined,
        thread_id: parentMessageId,
      });

      // Replace temp with server response — keep local fields, update id/timestamps from server
      setReplies((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? {
              ...r,
              id: message.id,
              created_at: message.created_at,
              updated_at: message.updated_at,
              pending: false,
            }
            : r
        )
      );
    } catch {
      // Mark as failed
      setReplies((prev) =>
        prev.map((r) => (r.id === tempId ? { ...r, pending: false, failed: true } : r))
      );
    } finally {
      setSending(false);
      editor.focus();
    }
  }, [
    sending,
    activeChannelId,
    parentMessageId,
    alsoSendToChannel,
    addMessage,
    updateMessage,
    parentMessage,
  ]);

  const handleEditorUpdate = useCallback((_html: string, text: string) => {
    setHasContent(!!text.trim());
  }, []);

  // Escape closes the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!parentMessage) return null;

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="w-[380px] max-w-full flex flex-col border-l border-border bg-card shrink-0 h-full"
      role="complementary"
      aria-label="Thread"
    >
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <MessageSquareReply className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold flex-1">Thread</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close thread"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable thread content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Parent message */}
        <div className="border-b border-border">
          <ThreadMessage
            message={parentMessage}
            isOwn={parentMessage.sender_id === currentUserId}
          />
        </div>

        {/* Reply count label */}
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-medium text-muted-foreground select-none">
            {loading
              ? "Loading replies..."
              : replies.length === 0
                ? "No replies yet"
                : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Replies */}
        {loading ? (
          <div className="space-y-3 px-4 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <ThreadSkeleton key={i} />
            ))}
          </div>
        ) : (
          replies.map((reply) => (
            <ThreadMessage
              key={reply.id}
              message={reply}
              isOwn={reply.sender_id === currentUserId}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Thread composer */}
      <div className="border-t border-border bg-card">
        <div className="mx-3 mt-2 mb-1 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
          <TiptapEditor
            ref={editorRef}
            placeholder="Reply in thread..."
            onUpdate={handleEditorUpdate}
            onSubmit={handleSend}
            compact
            mentionSuggestions={mentionSuggestions}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-1.5">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoSendToChannel}
              onChange={(e) => setAlsoSendToChannel(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary/30 w-3.5 h-3.5"
            />
            <span className="text-[11px] text-muted-foreground">
              Also send to channel
            </span>
          </label>

          <button
            onClick={handleSend}
            disabled={!hasContent || sending}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150",
              hasContent && !sending
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "text-muted-foreground/40 cursor-not-allowed bg-muted/30"
            )}
          >
            {sending ? "Sending..." : "Reply"}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex gap-2.5 py-1.5">
      <div className="w-7 h-7 rounded-lg skeleton shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-16 rounded skeleton" />
          <div className="h-2 w-10 rounded skeleton" />
        </div>
        <div className="h-2.5 w-3/4 rounded skeleton" />
      </div>
    </div>
  );
}
