"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import {
  useSubtasks,
  useCreateSubtask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks-queries";
import { CheckCircle2, Circle, Plus, Loader2 } from "lucide-react";
import type { Task } from "@/lib/types/tasks";

// ─── SubtaskItem ────────────────────────────────────────────────

function SubtaskItem({ subtask }: { subtask: Task }) {
  const updateTask = useUpdateTask();
  const isDone = subtask.status === "done";

  const toggleStatus = () => {
    updateTask.mutate({
      id: subtask.id,
      body: { status: isDone ? "todo" : "done" },
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 group">
      <button
        onClick={toggleStatus}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        disabled={updateTask.isPending}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>
      <span
        className={`text-sm flex-1 ${
          isDone ? "line-through text-muted-foreground" : "text-foreground"
        }`}
      >
        {subtask.title}
      </span>
    </div>
  );
}

// ─── SubtaskList ────────────────────────────────────────────────

interface SubtaskListProps {
  taskId: string;
}

export function SubtaskList({ taskId }: SubtaskListProps) {
  const { data: subtasks, isLoading } = useSubtasks(taskId);
  const createSubtask = useCreateSubtask(taskId);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      await createSubtask.mutateAsync({ title: trimmed });
      setNewTitle("");
    } catch {
      // Error handled by React Query
    }
  }, [newTitle, createSubtask]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
      if (e.key === "Escape") {
        setIsAdding(false);
        setNewTitle("");
      }
    },
    [handleAdd]
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading subtasks...
      </div>
    );
  }

  const completedCount = subtasks?.filter((s) => s.status === "done").length ?? 0;
  const totalCount = subtasks?.length ?? 0;

  return (
    <div>
      {/* Progress header */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-0.5">
        {subtasks?.map((subtask) => (
          <SubtaskItem key={subtask.id} subtask={subtask} />
        ))}
      </div>

      {/* Add subtask */}
      {isAdding ? (
        <div className="flex items-center gap-2 mt-1.5">
          <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newTitle.trim()) setIsAdding(false);
            }}
            placeholder="Subtask title..."
            autoFocus
            className="flex-1 text-sm bg-transparent border-b border-border py-1 outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          {createSubtask.isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1.5 py-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add subtask
        </button>
      )}
    </div>
  );
}
