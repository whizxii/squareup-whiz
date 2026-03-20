/**
 * Tasks & Reminders type definitions.
 * Matches backend response shapes from TaskResponse and ReminderResponse.
 */

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ReminderStatus = "pending" | "fired" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string | null;
  created_by_type: "user" | "agent";
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  channel_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  created_by_agent: string | null;
  message: string;
  remind_at: string;
  channel_id: string | null;
  recurrence: string | null;
  status: ReminderStatus;
  created_at: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  limit?: number;
}

export interface ReminderFilters {
  status?: ReminderStatus;
  limit?: number;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: TaskPriority;
  due_date?: string;
  tags?: string[];
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  due_date?: string | null;
  tags?: string[];
}

export interface CreateReminderBody {
  message: string;
  remind_at: string;
  channel_id?: string;
  recurrence?: string;
}
