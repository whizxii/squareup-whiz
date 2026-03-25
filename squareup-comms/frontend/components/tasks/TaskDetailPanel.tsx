"use client";

import { useCallback, useEffect, type KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { useTask, useUpdateTask } from "@/lib/hooks/use-tasks-queries";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { CommentThread } from "@/components/tasks/CommentThread";
import { ActivityTimeline } from "@/components/tasks/ActivityTimeline";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/format";
import {
  X,
  Calendar,
  Flag,
  User,
  Clock,
  Loader2,
  ListTodo,
  MessageCircle,
  Activity,
  ChevronDown,
} from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/lib/types/tasks";

// ─── Constants ───────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
};

// ─── Select Field ─────────────────────────────────────────────────

function SelectField<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="appearance-none w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 pr-7 outline-none focus:ring-2 focus:ring-ring/20 cursor-pointer disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>
    </div>
  );
}

// ─── TaskDetailPanel ──────────────────────────────────────────────

export function TaskDetailPanel() {
  const taskId = useTasksUIStore((s) => s.detailPanelTaskId);
  const closeDetailPanel = useTasksUIStore((s) => s.closeDetailPanel);
  const isOpen = taskId !== null;

  const { data: task, isLoading } = useTask(taskId ?? "");
  const updateTask = useUpdateTask();

  // Global Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeDetailPanel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeDetailPanel]);

  const handleUpdateField = useCallback(
    (field: string, value: string | number | null) => {
      if (!taskId) return;
      updateTask.mutate({ id: taskId, body: { [field]: value } });
    },
    [taskId, updateTask]
  );

  const handleTitleSave = useCallback(
    (newTitle: string) => {
      if (!newTitle.trim() || !taskId) return;
      handleUpdateField("title", newTitle.trim());
    },
    [taskId, handleUpdateField]
  );

  const handleDescriptionSave = useCallback(
    (newDesc: string) => {
      handleUpdateField("description", newDesc.trim() || null);
    },
    [handleUpdateField]
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) closeDetailPanel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 h-full w-full max-w-[480px] border-l border-border bg-card shadow-xl overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200"
          onEscapeKeyDown={() => closeDetailPanel()}
        >
          {/* Loading */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Content */}
          {!isLoading && task && (
            <>
              {/* Header */}
              <div className="flex items-start gap-3 p-5 pb-3 border-b border-border">
                <div className="flex-1 min-w-0">
                  {/* Status dot + Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${STATUS_COLOR[task.status]}`} />
                    <InlineEdit
                      value={task.title}
                      onSave={handleTitleSave}
                      className="text-base font-semibold"
                      inputClassName="w-full text-base font-semibold"
                      placeholder="Untitled task"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground ml-[18px]">
                    <span>Created {formatRelativeTime(task.created_at)}</span>
                    {task.completed_at && (
                      <>
                        <span>&middot;</span>
                        <span className="text-green-600">
                          Completed {formatRelativeTime(task.completed_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-auto p-5 space-y-6">
                {/* Metadata fields */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Status */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      Status
                    </label>
                    <SelectField
                      value={task.status}
                      options={STATUS_OPTIONS}
                      onChange={(val) => handleUpdateField("status", val)}
                      disabled={updateTask.isPending}
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Flag className="w-3 h-3" />
                      Priority
                    </label>
                    <SelectField
                      value={task.priority}
                      options={PRIORITY_OPTIONS}
                      onChange={(val) => handleUpdateField("priority", val)}
                      disabled={updateTask.isPending}
                    />
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <User className="w-3 h-3" />
                      Assignee
                    </label>
                    <div className="text-sm text-foreground bg-background border border-border rounded-md px-2.5 py-1.5">
                      {task.assigned_to}
                    </div>
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      Due date
                    </label>
                    <input
                      type="datetime-local"
                      value={task.due_date ?? ""}
                      onChange={(e) =>
                        handleUpdateField("due_date", e.target.value || null)
                      }
                      className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <SectionHeader
                    icon={<Activity className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Description"
                  />
                  <InlineEdit
                    value={task.description ?? ""}
                    onSave={handleDescriptionSave}
                    placeholder="Add a description..."
                    multiline
                    className="text-sm w-full"
                    inputClassName="w-full"
                  />
                </div>

                {/* Subtasks */}
                <div>
                  <SectionHeader
                    icon={<ListTodo className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Subtasks"
                  />
                  <SubtaskList taskId={task.id} />
                </div>

                {/* Comments */}
                <div>
                  <SectionHeader
                    icon={<MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Comments"
                  />
                  <CommentThread taskId={task.id} />
                </div>

                {/* Activity */}
                <div>
                  <SectionHeader
                    icon={<Activity className="w-3.5 h-3.5 text-muted-foreground" />}
                    label="Activity"
                  />
                  <ActivityTimeline taskId={task.id} />
                </div>
              </div>
            </>
          )}

          {/* Not found */}
          {!isLoading && !task && isOpen && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Task not found
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
