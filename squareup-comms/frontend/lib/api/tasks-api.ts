/**
 * Tasks & Reminders API Client
 *
 * Follows the CRM API Client pattern from lib/api/crm-api.ts.
 * All task/reminder data flows through this client.
 */

import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import type {
  Task,
  Reminder,
  TaskFilters,
  ReminderFilters,
  CreateTaskBody,
  UpdateTaskBody,
  CreateReminderBody,
  TaskComment,
  CreateCommentBody,
  TaskActivity,
  ReorderBody,
  BulkUpdateBody,
  PaginationMeta,
} from "@/lib/types/tasks";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Query parameter builder ─────────────────────────────────────

function buildParams(
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

// ─── Tasks API Client ────────────────────────────────────────────

class TasksApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return { "X-User-Id": getCurrentUserId() };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.error || error.detail || `API Error: ${res.status}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const json = await res.json();

    // Backend wraps responses in { success, data } envelope — unwrap
    if (json && typeof json === "object" && "success" in json && "data" in json) {
      return json.data as T;
    }

    return json as T;
  }

  /** Like request() but returns { data, meta } for paginated endpoints. */
  private async requestWithMeta<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; meta: PaginationMeta }> {
    const res = await fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.error || error.detail || `API Error: ${res.status}`);
    }

    const json = await res.json();
    return {
      data: json.data as T,
      meta: json.meta as PaginationMeta,
    };
  }

  // ─── Tasks ──────────────────────────────────────────────────

  async listTasks(
    filters?: TaskFilters
  ): Promise<{ data: Task[]; meta: PaginationMeta }> {
    const params = buildParams({
      status: filters?.status,
      priority: filters?.priority,
      cursor: filters?.cursor,
      limit: filters?.limit,
    });
    return this.requestWithMeta(`/api/tasks${params}`);
  }

  async getTask(id: string): Promise<Task> {
    return this.request(`/api/tasks/${id}`);
  }

  async createTask(body: CreateTaskBody): Promise<Task> {
    return this.request("/api/tasks/", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateTask(id: string, body: UpdateTaskBody): Promise<Task> {
    return this.request(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.request(`/api/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // ─── Search & Stats ───────────────────────────────────────────

  async searchTasks(query: string, limit = 20): Promise<Task[]> {
    const params = buildParams({ q: query, limit });
    return this.request(`/api/tasks/search${params}`);
  }

  async getTaskStats(): Promise<Record<string, number>> {
    return this.request("/api/tasks/stats");
  }

  // ─── Subtasks ─────────────────────────────────────────────────

  async listSubtasks(taskId: string): Promise<Task[]> {
    return this.request(`/api/tasks/${taskId}/subtasks`);
  }

  async createSubtask(taskId: string, body: CreateTaskBody): Promise<Task> {
    return this.request(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ─── Comments ─────────────────────────────────────────────────

  async listComments(taskId: string, cursor?: string): Promise<TaskComment[]> {
    const params = buildParams({ cursor });
    return this.request(`/api/tasks/${taskId}/comments${params}`);
  }

  async createComment(
    taskId: string,
    body: CreateCommentBody
  ): Promise<TaskComment> {
    return this.request(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateComment(
    taskId: string,
    commentId: string,
    body: { content: string }
  ): Promise<TaskComment> {
    return this.request(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    return this.request(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  // ─── Activity ─────────────────────────────────────────────────

  async listActivity(taskId: string, cursor?: string): Promise<TaskActivity[]> {
    const params = buildParams({ cursor });
    return this.request(`/api/tasks/${taskId}/activity${params}`);
  }

  // ─── Reorder & Bulk ───────────────────────────────────────────

  async reorderTask(body: ReorderBody): Promise<Task> {
    return this.request("/api/tasks/reorder", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async bulkUpdateTasks(body: BulkUpdateBody): Promise<Task[]> {
    return this.request("/api/tasks/bulk", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // ─── Reminders ──────────────────────────────────────────────

  async listReminders(filters?: ReminderFilters): Promise<Reminder[]> {
    const params = buildParams({
      status: filters?.status,
      limit: filters?.limit,
    });
    return this.request(`/api/reminders${params}`);
  }

  async createReminder(body: CreateReminderBody): Promise<Reminder> {
    return this.request("/api/reminders", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async cancelReminder(id: string): Promise<void> {
    return this.request(`/api/reminders/${id}`, {
      method: "DELETE",
    });
  }
}

export const tasksApi = new TasksApiClient();
