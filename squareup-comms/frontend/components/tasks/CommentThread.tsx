"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/lib/hooks/use-tasks-queries";
import { formatRelativeTime } from "@/lib/format";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import {
  MessageCircle,
  Send,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import type { TaskComment } from "@/lib/types/tasks";

// ─── Single Comment ──────────────────────────────────────────────

function CommentItem({
  comment,
  taskId,
}: {
  comment: TaskComment;
  taskId: string;
}) {
  const currentUserId = getCurrentUserId();
  const updateComment = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwn = comment.user_id === currentUserId;

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content) {
      setIsEditing(false);
      setEditContent(comment.content);
      return;
    }
    try {
      await updateComment.mutateAsync({
        commentId: comment.id,
        content: trimmed,
      });
      setIsEditing(false);
    } catch {
      // Error handled by React Query
    }
  }, [editContent, comment.content, comment.id, updateComment]);

  const handleDelete = useCallback(() => {
    deleteComment.mutate(comment.id);
  }, [comment.id, deleteComment]);

  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === "Escape") {
        setIsEditing(false);
        setEditContent(comment.content);
      }
    },
    [handleSaveEdit, comment.content]
  );

  return (
    <div className="group flex gap-2.5 py-2">
      {/* Avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
        {comment.user_id.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {comment.user_id}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.created_at)}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}

          {/* Actions — own comments only */}
          {isOwn && !isEditing && (
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Delete"
                disabled={deleteComment.isPending}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
              rows={2}
              className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={handleSaveEdit}
                disabled={updateComment.isPending}
                className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="px-2.5 py-1 text-xs rounded text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        )}

        {/* Mentions */}
        {comment.mentions.length > 0 && !isEditing && (
          <div className="flex flex-wrap gap-1 mt-1">
            {comment.mentions.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center text-xs text-primary bg-primary/10 rounded px-1.5 py-0.5"
              >
                @{m.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CommentThread ───────────────────────────────────────────────

interface CommentThreadProps {
  taskId: string;
}

export function CommentThread({ taskId }: CommentThreadProps) {
  const { data: comments, isLoading } = useComments(taskId);
  const createComment = useCreateComment(taskId);
  const [content, setContent] = useState("");

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      await createComment.mutateAsync({ content: trimmed });
      setContent("");
    } catch {
      // Error handled by React Query
    }
  }, [content, createComment]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading comments...
      </div>
    );
  }

  return (
    <div>
      {/* Comment list */}
      {comments && comments.length > 0 ? (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} taskId={taskId} />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
          <MessageCircle className="w-4 h-4" />
          No comments yet
        </div>
      )}

      {/* New comment input */}
      <div className="mt-3 flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... (Enter to send)"
          rows={2}
          className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-ring/20 resize-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSubmit}
          disabled={createComment.isPending || !content.trim()}
          className="self-end p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          title="Send comment"
        >
          {createComment.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
