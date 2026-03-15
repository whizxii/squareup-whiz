import { create } from "zustand";

export type NotificationType = "mention" | "dm" | "agent_complete" | "agent_error" | "reminder" | "follow_up";
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
  notifications: [
    // Sample notifications so it's not empty
    {
      id: "n1",
      type: "mention",
      tier: "urgent",
      title: "Kunj mentioned you in #general",
      body: "Hey, can you check the new design?",
      channel_id: "ch1",
      read: false,
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: "n2",
      type: "agent_complete",
      tier: "normal",
      title: "@crm-agent finished a task",
      body: "Updated contact John Smith with new phone number",
      agent_id: "agent1",
      read: false,
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: "n3",
      type: "follow_up",
      tier: "normal",
      title: "Follow-up reminder",
      body: "Follow up with Acme Corp about enterprise plan",
      contact_id: "c1",
      read: true,
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    },
  ],
  isOpen: false,
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((s) => ({ notifications: [notification, ...s.notifications] })),
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  setOpen: (open) => set({ isOpen: open }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
