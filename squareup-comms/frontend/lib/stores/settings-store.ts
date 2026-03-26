import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/lib/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type UserStatus = "online" | "away" | "busy" | "dnd";
export type FontSize = "Small" | "Medium" | "Large";

export type ChannelPrefs = { in_app: boolean; browser_push: boolean; email: boolean };
export type NotificationPrefs = Record<string, ChannelPrefs>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  mentions:          { in_app: true, browser_push: true,  email: false },
  dms:               { in_app: true, browser_push: true,  email: false },
  agent_updates:     { in_app: true, browser_push: false, email: false },
  channel_messages:  { in_app: true, browser_push: false, email: false },
  task_assigned:     { in_app: true, browser_push: true,  email: true },
  task_completed:    { in_app: true, browser_push: true,  email: false },
  task_commented:    { in_app: true, browser_push: false, email: false },
  task_mention:      { in_app: true, browser_push: true,  email: true },
  task_overdue:      { in_app: true, browser_push: true,  email: true },
};

interface SettingsState {
  // Profile
  displayName: string;
  status: UserStatus;
  statusMessage: string;
  statusEmoji: string;

  // Appearance
  fontSize: FontSize;

  // Notifications — structured per-channel prefs
  notificationPrefs: NotificationPrefs;
  soundEnabled: boolean;

  // Actions
  setDisplayName: (name: string) => void;
  setStatus: (status: UserStatus) => void;
  setStatusMessage: (message: string) => void;
  setStatusEmoji: (emoji: string) => void;
  setFontSize: (size: FontSize) => void;
  setNotificationPref: (type: string, channel: keyof ChannelPrefs, enabled: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  /** Hydrate profile fields from backend auth profile. */
  hydrateFromProfile: () => void;
}

/** Debounced sync to PUT /api/auth/me — avoids flooding on rapid changes. */
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function syncToBackend(fields: Record<string, unknown>) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) return;
      await fetch(`${API_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fields),
      });
    } catch {
      // Silent — localStorage already has the value; sync will retry on next change
    }
  }, 1000);
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Profile defaults
      displayName: "",
      status: "online",
      statusMessage: "",
      statusEmoji: "",

      // Appearance defaults
      fontSize: "Medium",

      // Notification defaults
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
      soundEnabled: true,

      // Actions (immutable — always return new state)
      setDisplayName: (displayName) => {
        set({ displayName });
        syncToBackend({ display_name: displayName });
      },
      setStatus: (status) => {
        set({ status });
        syncToBackend({ status });
      },
      setStatusMessage: (statusMessage) => {
        set({ statusMessage });
        syncToBackend({ status_message: statusMessage });
      },
      setStatusEmoji: (statusEmoji) => {
        set({ statusEmoji });
        syncToBackend({ status_emoji: statusEmoji });
      },
      setFontSize: (fontSize) => set({ fontSize }),
      setNotificationPref: (type, channel, enabled) => {
        const current = get().notificationPrefs;
        const typePrefs = current[type] ?? { in_app: true, browser_push: false, email: false };
        const updated: NotificationPrefs = {
          ...current,
          [type]: { ...typePrefs, [channel]: enabled },
        };
        set({ notificationPrefs: updated });
        syncToBackend({ notification_prefs: updated });
      },
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      hydrateFromProfile: () => {
        const profile = useAuthStore.getState().profile;
        if (!profile) return;
        set({
          displayName: profile.display_name || "",
          status: (profile.status as UserStatus) || "online",
          statusMessage: profile.status_message || "",
          statusEmoji: profile.status_emoji || "",
          ...(profile.notification_prefs
            ? { notificationPrefs: profile.notification_prefs as NotificationPrefs }
            : {}),
        });
      },
    }),
    {
      name: "squareup-settings",
      partialize: (state) => ({
        displayName: state.displayName,
        status: state.status,
        statusMessage: state.statusMessage,
        statusEmoji: state.statusEmoji,
        fontSize: state.fontSize,
        notificationPrefs: state.notificationPrefs,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
