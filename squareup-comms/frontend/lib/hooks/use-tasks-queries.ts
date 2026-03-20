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
  Task,
  Reminder,
  TaskFilters,
  ReminderFilters,
  CreateTaskBody,
  UpdateTaskBody,
  CreateReminderBody,
} from "@/lib/types/tasks";

// ─── Query key factory ───────────────────────────────────────────

export const tasksKeys = {
  all: ["tasks"] as const,
  list: (filters?: TaskFilters) =>
    [...tasksKeys.all, "list", { filters }] as const,
  detail: (id: string) => [...tasksKeys.all, "detail", id] as const,

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
