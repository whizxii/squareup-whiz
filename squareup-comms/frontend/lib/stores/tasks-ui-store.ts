/**
 * Tasks UI Store — UI-only state (no data).
 *
 * All task/reminder data lives in React Query. This store only tracks:
 * - Active tab, search query, filters, dialog state, selected task
 */

import { create } from "zustand";
import type { TaskStatus, TaskPriority } from "@/lib/types/tasks";

// ─── Dialog state ────────────────────────────────────────────────

export interface TaskDialogState {
  type: "create-task" | "edit-task" | "create-reminder" | null;
  data?: Record<string, unknown>;
}

// ─── Store interface ─────────────────────────────────────────────

interface TasksUIState {
  // Tab
  activeTab: "tasks" | "reminders";
  setActiveTab: (tab: "tasks" | "reminders") => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filters
  statusFilter: TaskStatus | "all";
  setStatusFilter: (status: TaskStatus | "all") => void;
  priorityFilter: TaskPriority | "all";
  setPriorityFilter: (priority: TaskPriority | "all") => void;

  // Selection
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Dialogs
  dialog: TaskDialogState;
  openDialog: (
    type: NonNullable<TaskDialogState["type"]>,
    data?: Record<string, unknown>
  ) => void;
  closeDialog: () => void;
}

// ─── Store ───────────────────────────────────────────────────────

export const useTasksUIStore = create<TasksUIState>((set) => ({
  // Tab
  activeTab: "tasks",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Filters
  statusFilter: "all",
  setStatusFilter: (status) => set({ statusFilter: status }),
  priorityFilter: "all",
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),

  // Selection
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  // Dialogs
  dialog: { type: null },
  openDialog: (type, data) => set({ dialog: { type, data } }),
  closeDialog: () => set({ dialog: { type: null } }),
}));
