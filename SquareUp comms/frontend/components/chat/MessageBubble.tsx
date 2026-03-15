"use client";

import { Message, useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { Bot, MessageSquareReply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useCallback } from "react";

import { MessageActions } from "./MessageActions";
import { MessageEditForm } from "./MessageEditForm";
import { MessageReactions } from "./MessageReactions";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);

  const isAgent = message.sender_type === "agent";

  const timeAgo = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  });

  const handleEdit = useCallback(async () => {
    if (!editContent.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      await api.editMessage(message.id, editContent.trim());
      updateMessage(message.channel_id, message.id, {
        content: editContent.trim(),
        edited: true,
        updated_at: new Date().toISOString(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message:", err);
    } finally {
      setActionLoading(false);
    }
  }, [editContent, actionLoading, message.id, message.channel_id, updateMessage]);

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

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-1.5 hover:bg-accent/30 transition-colors duration-100",
        isAgent && "bg-sq-agent/[0.03]"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
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
          </div>
        )}

        {/* Message body */}
        {isEditing ? (
          <MessageEditForm
            content={editContent}
            onChange={setEditContent}
            onSave={handleEdit}
            onCancel={() => {
              setIsEditing(false);
              setEditContent(message.content || "");
            }}
            loading={actionLoading}
          />
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
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

        {/* Reactions */}
        <MessageReactions
          reactions={message.reactions || []}
          currentUserId={currentUserId}
          onToggleReaction={handleReaction}
        />

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
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
            className="flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:underline"
          >
            <MessageSquareReply className="w-3.5 h-3.5" />
            {message.reply_count}{" "}
            {message.reply_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {showActions && !isEditing && (
        <MessageActions
          isOwn={isOwn}
          onReact={handleReaction}
          onReply={() => setActiveThread(message.id)}
          onEdit={() => {
            setIsEditing(true);
            setEditContent(message.content || "");
          }}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}
    </div>
  );
}
