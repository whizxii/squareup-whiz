import { create } from "zustand";

export type NotificationType =
  | "mention" | "dm" | "agent_complete" | "agent_error" | "reminder" | "follow_up"
  | "task_assigned" | "task_completed" | "task_commented" | "task_mention" | "task_overdue"
  | (string & {}); // Allow any backend type without breaking
export type NotificationTier = "urgent" | "normal" | "low";

export interface Notification {
  id: string;
  type: NotificationType;
  tier: NotificationTier;
  title: string;
  body?: string;
  channel_id?: string;
  message_id?: string;
  agent_id?: string;
  contact_id?: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  isOpen: boolean;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setOpen: (open: boolean) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isOpen: false,
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((s) => ({ notifications: [notification, ...s.notifications].slice(0, 200) })),
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  setOpen: (open) => set({ isOpen: open }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
