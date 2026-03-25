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

  // View mode
  viewMode: "list" | "board";
  setViewMode: (mode: "list" | "board") => void;

  // Selection
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Bulk selection
  selectedTaskIds: ReadonlySet<string>;
  toggleTaskSelection: (id: string) => void;
  selectAllTasks: (ids: string[]) => void;
  clearSelection: () => void;

  // Detail panel
  detailPanelTaskId: string | null;
  openDetailPanel: (taskId: string) => void;
  closeDetailPanel: () => void;

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

  // View mode
  viewMode: "list",
  setViewMode: (mode) => set({ viewMode: mode }),

  // Selection
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  // Bulk selection
  selectedTaskIds: new Set<string>(),
  toggleTaskSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedTaskIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedTaskIds: next };
    }),
  selectAllTasks: (ids) => set({ selectedTaskIds: new Set(ids) }),
  clearSelection: () => set({ selectedTaskIds: new Set<string>() }),

  // Detail panel
  detailPanelTaskId: null,
  openDetailPanel: (taskId) => set({ detailPanelTaskId: taskId }),
  closeDetailPanel: () => set({ detailPanelTaskId: null }),

  // Dialogs
  dialog: { type: null },
  openDialog: (type, data) => set({ dialog: { type, data } }),
  closeDialog: () => set({ dialog: { type: null } }),
}));
