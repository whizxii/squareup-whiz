"use client";

import { Message, useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatBytes, parseUtcDate } from "@/lib/format";
import { Bot, MessageSquareReply, Pin as PinIcon, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useCallback, useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import { useSwipeAction } from "@/hooks/use-swipe-action";

import { MessageActions } from "./MessageActions";
import { MessageEditForm } from "./MessageEditForm";
import { MessageReactions } from "./MessageReactions";
import { AgentResponseCard } from "./agents/AgentResponseCard";
import { MessageStatus, type DeliveryStatus } from "./status/MessageStatus";
import { LinkPreview, extractUrls } from "./embeds/LinkPreview";
import { addBookmark, removeBookmark, isBookmarked } from "./BookmarkedMessages";
import { ForwardDialog } from "./ForwardDialog";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  currentUserId: string;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  currentUserId,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [editContentHtml, setEditContentHtml] = useState(message.content_html || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(message.id));
  const [swipeProgress, setSwipeProgress] = useState(0);

  const setActiveThread = useChatStore((s) => s.setActiveThread);

  // Swipe-to-reply gesture (WhatsApp/Telegram pattern)
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeAction({
    threshold: 80,
    direction: "right",
    onSwipe: () => {
      setSwipeProgress(0);
      setActiveThread(message.id);
    },
    onProgress: setSwipeProgress,
    onCancel: () => setSwipeProgress(0),
  });
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const activeChannel = useChatStore((s) =>
    s.channels.find((c) => c.id === s.activeChannelId)
  );

  const isAgent = message.sender_type === "agent";
  const isPending = message.pending;
  const isFailed = message.failed;

  // Derive delivery status for own messages
  const deliveryStatus: DeliveryStatus = useMemo(() => {
    if (isFailed) return "pending";
    if (isPending) return "pending";
    return "sent";
  }, [isPending, isFailed]);

  // Extract URLs for link previews
  const messageUrls = useMemo(
    () => extractUrls(message.content || ""),
    [message.content]
  );

  const timeAgo = useMemo(
    () =>
      formatDistanceToNow(parseUtcDate(message.created_at), { addSuffix: true }),
    [message.created_at]
  );

  // Sanitize HTML content for rendering
  const sanitizedHtml = useMemo(() => {
    if (!message.content_html) return null;
    return DOMPurify.sanitize(message.content_html, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "del",
        "code", "pre", "blockquote",
        "ul", "ol", "li",
        "a", "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class", "data-mention-type", "data-type", "data-id"],
    });
  }, [message.content_html]);

  // Attempt to parse JSON widgets from Agent responses
  const parsedWidget = useMemo(() => {
    if (message.sender_type !== "agent" || !message.content) return null;

    try {
      if (message.content.trim().startsWith("{") && message.content.trim().endsWith("}")) {
        const data = JSON.parse(message.content);
        if (data.widget_type && data.data) {
          return data;
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }, [message.content, message.sender_type]);

  const handleEdit = useCallback(async () => {
    if (!editContent.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      await api.editMessage(message.id, editContent.trim(), editContentHtml || undefined);
      updateMessage(message.channel_id, message.id, {
        content: editContent.trim(),
        content_html: editContentHtml || undefined,
        edited: true,
        updated_at: new Date().toISOString(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message:", err);
    } finally {
      setActionLoading(false);
    }
  }, [editContent, editContentHtml, actionLoading, message.id, message.channel_id, updateMessage]);

  const handleDelete = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await api.deleteMessage(message.id);
      removeMessage(message.channel_id, message.id);
    } catch (err) {
      console.error("Failed to delete message:", err);
      setShowDeleteConfirm(false);
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, message.id, message.channel_id, removeMessage]);

  const handleReaction = useCallback(
    async (emoji: string) => {
      const existing = (message.reactions || []).find(
        (r) => r.emoji === emoji && r.user_id === currentUserId
      );

      // Optimistic update
      const updatedReactions = existing
        ? (message.reactions || []).filter(
          (r) => !(r.emoji === emoji && r.user_id === currentUserId)
        )
        : [
          ...(message.reactions || []),
          {
            emoji,
            user_id: currentUserId,
            created_at: new Date().toISOString(),
          },
        ];

      updateMessage(message.channel_id, message.id, {
        reactions: updatedReactions,
      });

      try {
        if (existing) {
          await api.removeReaction(message.id, emoji);
        } else {
          await api.addReaction(message.id, emoji);
        }
      } catch (err) {
        // Revert on failure
        updateMessage(message.channel_id, message.id, {
          reactions: message.reactions,
        });
        console.error("Failed to toggle reaction:", err);
      }
    },
    [message, currentUserId, updateMessage]
  );

  const handlePin = useCallback(() => {
    updateMessage(message.channel_id, message.id, {
      pinned: !message.pinned,
    });
    // TODO: Call api.pinMessage when backend endpoint is ready
  }, [message.channel_id, message.id, message.pinned, updateMessage]);

  const handleBookmark = useCallback(() => {
    if (bookmarked) {
      removeBookmark(message.id);
      setBookmarked(false);
    } else {
      addBookmark({
        id: message.id,
        channelId: message.channel_id,
        channelName: activeChannel?.name || "channel",
        senderId: message.sender_id,
        senderName: message.sender_name || message.sender_id,
        content: message.content || "",
        createdAt: message.created_at,
        bookmarkedAt: new Date().toISOString(),
      });
      setBookmarked(true);
    }
  }, [bookmarked, message, activeChannel?.name]);

  const handleForward = useCallback(
    (targetChannelId: string) => {
      // TODO: Call api.forwardMessage when backend endpoint is ready
      console.log(`Forward message ${message.id} to channel ${targetChannelId}`);
      setShowForwardDialog(false);
    },
    [message.id]
  );

  // Accessible label for screen readers: "Sender said: content, time ago"
  const ariaLabel = useMemo(() => {
    const sender = message.sender_name || message.sender_id;
    const content = message.content || "attachment";
    const status = isFailed ? ", failed to send" : isPending ? ", sending" : "";
    const edited = message.edited ? ", edited" : "";
    const pinned = message.pinned ? ", pinned" : "";
    return `${sender} said: ${content}, ${timeAgo}${edited}${pinned}${status}`;
  }, [message.sender_name, message.sender_id, message.content, message.edited, message.pinned, timeAgo, isPending, isFailed]);

  return (
    <article
      className={cn(
        "group relative flex gap-3 px-4 py-1.5 hover:bg-accent/30 transition-colors duration-100",
        isAgent && "bg-sq-agent/[0.03]",
        isPending && "opacity-60",
        isFailed && "bg-destructive/[0.03]",
        swipeProgress > 0 && "will-change-transform"
      )}
      style={swipeProgress > 0 ? { transform: `translateX(${swipeProgress * 60}px)` } : undefined}
      onMouseEnter={() => {
        hoverTimerRef.current = setTimeout(() => setShowActions(true), 50);
      }}
      onMouseLeave={() => {
        clearTimeout(hoverTimerRef.current);
        setShowActions(false);
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label={ariaLabel}
    >
      {/* Swipe-to-reply indicator */}
      {swipeProgress > 0 && (
        <div
          className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary transition-opacity"
          style={{ opacity: Math.min(swipeProgress * 1.5, 1) }}
          aria-hidden="true"
        >
          <MessageSquareReply className="w-4 h-4" />
        </div>
      )}

      {/* Avatar */}
      {showAvatar ? (
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            isAgent
              ? "bg-sq-agent/10 ring-1 ring-sq-agent/20"
              : "bg-gradient-brand"
          )}
        >
          {isAgent ? (
            <Bot className="w-4 h-4 text-sq-agent" />
          ) : (
            <span className="text-white text-xs font-bold">
              {(message.sender_name || message.sender_id)
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className={cn(
                "text-sm font-semibold",
                isAgent ? "text-sq-agent" : "text-foreground"
              )}
            >
              {message.sender_name || message.sender_id}
            </span>
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
            {message.edited && (
              <span className="text-[10px] text-muted-foreground">(edited)</span>
            )}
            {message.pinned && (
              <PinIcon className="w-3 h-3 text-primary/60" />
            )}
            {isOwn && (
              <MessageStatus status={deliveryStatus} className="ml-0.5" />
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-[10px] text-destructive">
                <AlertCircle className="w-3 h-3" />
                Failed
              </span>
            )}
          </div>
        )}

        {/* Message body */}
        {isEditing ? (
          <MessageEditForm
            content={editContent}
            contentHtml={editContentHtml}
            onChange={setEditContent}
            onChangeHtml={setEditContentHtml}
            onSave={handleEdit}
            onCancel={() => {
              setIsEditing(false);
              setEditContent(message.content || "");
              setEditContentHtml(message.content_html || "");
            }}
            loading={actionLoading}
          />
        ) : parsedWidget ? (
          <div className="mt-2 mb-1 p-4 rounded-xl border border-border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" /> Interactive Widget: {parsedWidget.widget_type.replace(/_/g, " ")}
            </div>
            {/* Fallback rendering of JSON data in a pretty format for now. A real app would have specific components per widget_type */}
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto text-foreground/80">
              {JSON.stringify(parsedWidget.data, null, 2)}
            </pre>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">Accept</button>
              <button className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors">Modify</button>
            </div>
          </div>
        ) : sanitizedHtml ? (
          <div
            className="text-sm text-foreground/90 leading-relaxed prose prose-sm max-w-none
              prose-p:my-0.5 prose-pre:my-1.5 prose-pre:rounded-lg prose-pre:bg-muted/80
              prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-mono
              prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground
              prose-a:text-primary prose-a:underline prose-a:underline-offset-2
              prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {/* Agent tool calls card */}
        {isAgent && message.tool_calls && message.tool_calls.length > 0 && (
          <AgentResponseCard toolCalls={message.tool_calls} />
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm transition-colors"
              >
                <span className="truncate max-w-[200px]">{att.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatBytes(att.size)}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Link previews */}
        {messageUrls.length > 0 && (
          <div className="space-y-1">
            {messageUrls.map((url) => (
              <LinkPreview key={url} url={url} />
            ))}
          </div>
        )}

        {/* Reactions */}
        <MessageReactions
          reactions={message.reactions || []}
          currentUserId={currentUserId}
          onToggleReaction={handleReaction}
        />

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20" role="alert">
            <span className="text-xs text-destructive">Delete this message?</span>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-40 transition-colors"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-0.5 rounded border border-border text-xs hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Thread indicator */}
        {message.reply_count > 0 && (
          <button
            onClick={() => setActiveThread(message.id)}
            className="sq-tap flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:underline transition-all"
            aria-label={`${message.reply_count} ${message.reply_count === 1 ? "reply" : "replies"}, open thread`}
          >
            <MessageSquareReply className="w-3.5 h-3.5" />
            {message.reply_count}{" "}
            {message.reply_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {showActions && !isEditing && !isPending && (
        <MessageActions
          isOwn={isOwn}
          isPinned={message.pinned}
          isBookmarked={bookmarked}
          onReact={handleReaction}
          onReply={() => setActiveThread(message.id)}
          onEdit={() => {
            setIsEditing(true);
            setEditContent(message.content || "");
            setEditContentHtml(message.content_html || "");
          }}
          onDelete={() => setShowDeleteConfirm(true)}
          onPin={handlePin}
          onBookmark={handleBookmark}
          onForward={() => setShowForwardDialog(true)}
        />
      )}

      {/* Forward dialog */}
      <ForwardDialog
        open={showForwardDialog}
        messageContent={message.content || ""}
        onClose={() => setShowForwardDialog(false)}
        onForward={handleForward}
      />
    </article>
  );
}
