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
  parent_id: string | null;
  workspace_id: string | null;
  position: number;
  estimated_minutes: number | null;
  completed_at: string | null;
  is_deleted: boolean;
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
  cursor?: string;
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
  workspace_id?: string;
  estimated_minutes?: number;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  due_date?: string | null;
  tags?: string[];
  estimated_minutes?: number | null;
}

export interface CreateReminderBody {
  message: string;
  remind_at: string;
  channel_id?: string;
  recurrence?: string;
}

// ─── Comments ───────────────────────────────────────────────────

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: Array<{ id: string; label: string; type: string }>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentBody {
  content: string;
  mentions?: Array<{ id: string; label: string; type: string }>;
}

// ─── Activity ───────────────────────────────────────────────────

export type TaskActivityAction =
  | "created"
  | "updated"
  | "assigned"
  | "completed"
  | "commented"
  | "deleted";

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: TaskActivityAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// ─── Reorder & Bulk ─────────────────────────────────────────────

export interface ReorderBody {
  task_id: string;
  status: TaskStatus;
  position: number;
}

export interface BulkUpdateBody {
  task_ids: string[];
  updates: UpdateTaskBody;
}

// ─── Pagination ─────────────────────────────────────────────────

export interface PaginationMeta {
  next_cursor: string | null;
  has_more: boolean;
}

export interface PaginatedTasksResponse {
  data: Task[];
  meta: PaginationMeta;
}
