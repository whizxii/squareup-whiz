"use client";

import { useTasksUIStore } from "@/lib/stores/tasks-ui-store";
import { Search, Plus, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/lib/types/tasks";

// ─── Constants ───────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ─── Component ───────────────────────────────────────────────────

export function TasksHeader() {
  const activeTab = useTasksUIStore((s) => s.activeTab);
  const setActiveTab = useTasksUIStore((s) => s.setActiveTab);
  const searchQuery = useTasksUIStore((s) => s.searchQuery);
  const setSearchQuery = useTasksUIStore((s) => s.setSearchQuery);
  const statusFilter = useTasksUIStore((s) => s.statusFilter);
  const setStatusFilter = useTasksUIStore((s) => s.setStatusFilter);
  const priorityFilter = useTasksUIStore((s) => s.priorityFilter);
  const setPriorityFilter = useTasksUIStore((s) => s.setPriorityFilter);
  const viewMode = useTasksUIStore((s) => s.viewMode);
  const setViewMode = useTasksUIStore((s) => s.setViewMode);
  const openDialog = useTasksUIStore((s) => s.openDialog);

  const selectCls =
    "px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20";

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 bg-card/50">
      {/* Top row: tabs + create button */}
      <div className="flex items-center justify-between">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tasks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "reminders"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Reminders
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (tasks tab only) */}
          {activeTab === "tasks" && (
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("board")}
                title="Board view"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "board"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() =>
              openDialog(activeTab === "tasks" ? "create-task" : "create-reminder")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "tasks" ? "New Task" : "New Reminder"}
          </button>
        </div>
      </div>

      {/* Bottom row: search + filters */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "tasks" ? "Search tasks..." : "Search reminders..."
            }
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Filters (only for tasks tab) */}
        {activeTab === "tasks" && (
          <>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as TaskStatus | "all")
              }
              className={selectCls}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as TaskPriority | "all")
              }
              className={selectCls}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
