/**
 * Shared task UI configuration — priority badges, status sections, etc.
 * Imported by TasksListView, TaskBoardView, and other task components.
 */

import type { TaskPriority } from "@/lib/types/tasks";

// ─── Priority badge config ───────────────────────────────────────

export const PRIORITY_VARIANT: Record<TaskPriority, "danger" | "warning" | "primary" | "default"> = {
  urgent: "danger",
  high: "warning",
  medium: "primary",
  low: "default",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};
