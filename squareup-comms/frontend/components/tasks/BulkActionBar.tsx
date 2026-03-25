"use client";

import { useState, useCallback } from "react";
import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { useBulkUpdateTasks, useDeleteTask } from "@/lib/hooks/use-tasks-queries";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, Clock, Circle, Trash2 } from "lucide-react";
import type { TaskStatus } from "@/lib/types/tasks";

// ─── Status options ──────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { value: "todo", label: "To Do", icon: <Circle className="w-3.5 h-3.5" /> },
  { value: "in_progress", label: "In Progress", icon: <Clock className="w-3.5 h-3.5 text-blue-500" /> },
  { value: "done", label: "Done", icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> },
];

// ─── BulkActionBar ───────────────────────────────────────────────

export function BulkActionBar() {
  const selectedTaskIds = useTasksUIStore((s) => s.selectedTaskIds);
  const clearSelection = useTasksUIStore((s) => s.clearSelection);
  const bulkUpdate = useBulkUpdateTasks();
  const deleteTask = useDeleteTask();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const count = selectedTaskIds.size;

  if (count === 0) return null;

  const ids = Array.from(selectedTaskIds);

  const handleStatusChange = (status: TaskStatus) => {
    bulkUpdate.mutate(
      { task_ids: ids, updates: { status } },
      { onSuccess: () => clearSelection() }
    );
  };

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await Promise.allSettled(
        ids.map((id) => deleteTask.mutateAsync(id))
      );
      clearSelection();
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  }, [ids, deleteTask, clearSelection]);

  const isPending = bulkUpdate.isPending || isDeleting;

  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 flex items-center gap-3 px-4 py-3",
        "bg-card border-t border-border shadow-lg",
        "animate-in slide-in-from-bottom-2 duration-200"
      )}
    >
      {/* Count + clear */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {count} selected
        </span>
        <button
          onClick={clearSelection}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Status actions */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Move to:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            disabled={isPending}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              "bg-muted/50 text-foreground hover:bg-muted",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Delete with confirmation */}
      {confirmingDelete ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-destructive font-medium">Delete {count}?</span>
          <button
            onClick={handleDeleteConfirm}
            disabled={isPending}
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium transition-colors",
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            disabled={isPending}
            className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
            "text-destructive hover:bg-destructive/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}
