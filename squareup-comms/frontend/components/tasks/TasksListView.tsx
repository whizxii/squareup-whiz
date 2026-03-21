"use client";

import { useMemo } from "react";
import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { useTasks, useUpdateTask, useDeleteTask } from "@/lib/hooks/use-tasks-queries";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Bot,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types/tasks";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/format";

// ─── Priority badge config ───────────────────────────────────────

const PRIORITY_VARIANT: Record<TaskPriority, "danger" | "warning" | "primary" | "default"> = {
  urgent: "danger",
  high: "warning",
  medium: "primary",
  low: "default",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ─── Status section config ───────────────────────────────────────

const STATUS_SECTIONS: { status: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { status: "todo", label: "To Do", icon: <Circle className="w-4 h-4 text-muted-foreground" /> },
  { status: "in_progress", label: "In Progress", icon: <Clock className="w-4 h-4 text-blue-500" /> },
  { status: "done", label: "Done", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
];

// ─── Due date helpers ────────────────────────────────────────────

function formatDueDate(dateStr: string | null): { text: string; overdue: boolean } | null {
  if (!dateStr) return null;

  const due = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Overdue (${Math.abs(diffDays)}d)`, overdue: true };
  if (diffDays === 0) return { text: "Today", overdue: false };
  if (diffDays === 1) return { text: "Tomorrow", overdue: false };
  if (diffDays <= 7) return { text: `In ${diffDays} days`, overdue: false };

  return {
    text: due.toLocaleDateString(APP_LOCALE, { month: "short", day: "numeric", timeZone: APP_TIMEZONE }),
    overdue: false,
  };
}

// ─── Task Row ────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const openDialog = useTasksUIStore((s) => s.openDialog);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const dueInfo = formatDueDate(task.due_date);
  const isDone = task.status === "done";

  const toggleStatus = () => {
    const newStatus: TaskStatus = isDone ? "todo" : "done";
    updateTask.mutate({ id: task.id, body: { status: newStatus } });
  };

  const handleEdit = () => {
    openDialog("edit-task", {
      task_id: task.id,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? "",
      tags: task.tags,
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id);
  };

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 rounded-lg transition-colors">
      {/* Checkbox */}
      <button
        onClick={toggleStatus}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title={isDone ? "Mark as to do" : "Mark as done"}
      >
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {task.title}
          </span>
          {task.created_by_type === "agent" && (
            <span className="flex items-center gap-0.5 text-[10px] text-purple-500 font-medium">
              <Bot className="w-3 h-3" />
              Donna
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">
            {PRIORITY_LABEL[task.priority]}
          </Badge>

          {dueInfo && (
            <span
              className={`text-xs flex items-center gap-1 ${
                dueInfo.overdue ? "text-red-500 font-medium" : "text-muted-foreground"
              }`}
            >
              {dueInfo.overdue && <AlertTriangle className="w-3 h-3" />}
              {dueInfo.text}
            </span>
          )}

          {task.tags.map((tag) => (
            <Badge key={tag} variant="default" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Edit task"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Status Section ──────────────────────────────────────────────

function StatusSection({
  label,
  icon,
  tasks,
}: {
  label: string;
  icon: React.ReactNode;
  tasks: Task[];
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-4 py-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
      </div>
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function TasksListView() {
  const searchQuery = useTasksUIStore((s) => s.searchQuery);
  const statusFilter = useTasksUIStore((s) => s.statusFilter);
  const priorityFilter = useTasksUIStore((s) => s.priorityFilter);
  const openDialog = useTasksUIStore((s) => s.openDialog);

  // Build API filters
  const apiFilters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
    }),
    [statusFilter, priorityFilter]
  );

  const { data: tasks, isLoading } = useTasks(apiFilters);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  // Group by status
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of filtered) {
      map[task.status].push(task);
    }
    return map;
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading tasks...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<span className="text-2xl">&#x2705;</span>}
          title={searchQuery ? "No matching tasks" : "No tasks yet"}
          description={
            searchQuery
              ? "Try a different search term."
              : "Create a task or ask Donna to add one for you."
          }
          action={
            searchQuery
              ? undefined
              : { label: "Create your first task", onClick: () => openDialog("create-task") }
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-2">
      {STATUS_SECTIONS.map((section) => (
        <StatusSection
          key={section.status}
          label={section.label}
          icon={section.icon}
          tasks={grouped[section.status]}
        />
      ))}
    </div>
  );
}
