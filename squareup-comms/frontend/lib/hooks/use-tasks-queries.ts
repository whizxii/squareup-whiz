/**
 * React Query Hooks for Tasks & Reminders
 *
 * Follows the CRM hooks pattern from use-crm-queries.ts.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/tasks-api";
import type {
  TaskFilters,
  ReminderFilters,
  CreateTaskBody,
  UpdateTaskBody,
  CreateReminderBody,
  CreateCommentBody,
  ReorderBody,
  BulkUpdateBody,
} from "@/lib/types/tasks";

// ─── Query key factory ───────────────────────────────────────────

export const tasksKeys = {
  all: ["tasks"] as const,
  list: (filters?: TaskFilters) =>
    [...tasksKeys.all, "list", { filters }] as const,
  detail: (id: string) => [...tasksKeys.all, "detail", id] as const,
  subtasks: (taskId: string) =>
    [...tasksKeys.detail(taskId), "subtasks"] as const,
  comments: (taskId: string) =>
    [...tasksKeys.detail(taskId), "comments"] as const,
  activity: (taskId: string) =>
    [...tasksKeys.detail(taskId), "activity"] as const,
  search: (query: string) => [...tasksKeys.all, "search", query] as const,
  stats: () => [...tasksKeys.all, "stats"] as const,

  reminders: () => ["reminders"] as const,
  reminderList: (filters?: ReminderFilters) =>
    [...tasksKeys.reminders(), "list", { filters }] as const,
};

// ─── Task Queries ────────────────────────────────────────────────

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: tasksKeys.list(filters),
    queryFn: () => tasksApi.listTasks(filters),
    staleTime: 30_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: tasksKeys.detail(id),
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  });
}

export function useSearchTasks(query: string, limit?: number) {
  return useQuery({
    queryKey: tasksKeys.search(query),
    queryFn: () => tasksApi.searchTasks(query, limit),
    enabled: query.length > 0,
    staleTime: 10_000,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: tasksKeys.stats(),
    queryFn: () => tasksApi.getTaskStats(),
    staleTime: 60_000,
  });
}

// ─── Subtask Queries ────────────────────────────────────────────

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: tasksKeys.subtasks(taskId),
    queryFn: () => tasksApi.listSubtasks(taskId),
    enabled: !!taskId,
  });
}

// ─── Comment Queries ────────────────────────────────────────────

export function useComments(taskId: string) {
  return useQuery({
    queryKey: tasksKeys.comments(taskId),
    queryFn: () => tasksApi.listComments(taskId),
    enabled: !!taskId,
  });
}

// ─── Activity Queries ───────────────────────────────────────────

export function useTaskActivity(taskId: string) {
  return useQuery({
    queryKey: tasksKeys.activity(taskId),
    queryFn: () => tasksApi.listActivity(taskId),
    enabled: !!taskId,
  });
}

// ─── Task Mutations ──────────────────────────────────────────────

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskBody) => tasksApi.createTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTaskBody }) =>
      tasksApi.updateTask(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

// ─── Subtask Mutations ──────────────────────────────────────────

export function useCreateSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskBody) =>
      tasksApi.createSubtask(taskId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.subtasks(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(taskId),
      });
    },
  });
}

// ─── Comment Mutations ──────────────────────────────────────────

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentBody) =>
      tasksApi.createComment(taskId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.comments(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: tasksKeys.activity(taskId),
      });
    },
  });
}

export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => tasksApi.updateComment(taskId, commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.comments(taskId),
      });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      tasksApi.deleteComment(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.comments(taskId),
      });
    },
  });
}

// ─── Reorder & Bulk Mutations ───────────────────────────────────

export function useReorderTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderBody) => tasksApi.reorderTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkUpdateBody) => tasksApi.bulkUpdateTasks(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

// ─── Reminder Queries ────────────────────────────────────────────

export function useReminders(filters?: ReminderFilters) {
  return useQuery({
    queryKey: tasksKeys.reminderList(filters),
    queryFn: () => tasksApi.listReminders(filters),
    staleTime: 30_000,
  });
}

// ─── Reminder Mutations ──────────────────────────────────────────

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReminderBody) => tasksApi.createReminder(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.reminders() });
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.cancelReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.reminders() });
    },
  });
}
