"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trash2 } from "lucide-react";
import { useUpdateTask, useDeleteTask } from "@/lib/hooks/use-tasks-queries";
import type { TaskPriority, TaskStatus } from "@/lib/types/tasks";

// ─── Constants ───────────────────────────────────────────────────

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

// ─── Component ───────────────────────────────────────────────────

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Record<string, unknown> | undefined;
}

export function EditTaskDialog({ open, onOpenChange, data }: EditTaskDialogProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const taskId = (data?.task_id as string) ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");

  // Pre-fill when dialog opens with data
  useEffect(() => {
    if (open && data) {
      setTitle((data.title as string) ?? "");
      setDescription((data.description as string) ?? "");
      setPriority((data.priority as TaskPriority) ?? "medium");
      setStatus((data.status as TaskStatus) ?? "todo");
      setAssignedTo((data.assigned_to as string) ?? "");
      setTags(((data.tags as string[]) ?? []).join(", "));
      setError("");

      // Format due_date for datetime-local input
      const rawDate = data.due_date as string;
      if (rawDate) {
        const d = new Date(rawDate);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDueDate(local);
      } else {
        setDueDate("");
      }
    }
  }, [open, data]);

  const handleUpdate = async () => {
    if (!title.trim() || !taskId) return;
    setError("");

    try {
      await updateTask.mutateAsync({
        id: taskId,
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          assigned_to: assignedTo.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await deleteTask.mutateAsync(taskId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-y-auto max-h-[90vh]">
          <Dialog.Title className="text-lg font-display font-bold mb-4">
            Edit Task
          </Dialog.Title>

          <div className="space-y-3">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title *"
              className={inputCls}
              autoFocus
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className={inputCls}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                Due date
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Assign to */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                Assign to
              </label>
              <input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="User ID or name (optional)"
                className={inputCls}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1 pl-0.5">
                Tags (comma-separated)
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. follow-up, client, urgent"
                className={inputCls}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleDelete}
                disabled={deleteTask.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteTask.isPending ? "Deleting..." : "Delete"}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updateTask.isPending || !title.trim()}
                  className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-medium"
                >
                  {updateTask.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
