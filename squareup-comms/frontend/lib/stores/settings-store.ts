import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/lib/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type UserStatus = "online" | "away" | "busy" | "dnd";
export type FontSize = "Small" | "Medium" | "Large";

interface SettingsState {
  // Profile
  displayName: string;
  status: UserStatus;
  statusMessage: string;
  statusEmoji: string;

  // Appearance
  fontSize: FontSize;

  // Notifications
  notifMentions: boolean;
  notifDMs: boolean;
  notifAgentUpdates: boolean;
  notifChannelMessages: boolean;
  soundEnabled: boolean;

  // Actions
  setDisplayName: (name: string) => void;
  setStatus: (status: UserStatus) => void;
  setStatusMessage: (message: string) => void;
  setStatusEmoji: (emoji: string) => void;
  setFontSize: (size: FontSize) => void;
  setNotifMentions: (v: boolean) => void;
  setNotifDMs: (v: boolean) => void;
  setNotifAgentUpdates: (v: boolean) => void;
  setNotifChannelMessages: (v: boolean) => void;
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
    (set) => ({
      // Profile defaults
      displayName: "",
      status: "online",
      statusMessage: "",
      statusEmoji: "",

      // Appearance defaults
      fontSize: "Medium",

      // Notification defaults
      notifMentions: true,
      notifDMs: true,
      notifAgentUpdates: true,
      notifChannelMessages: false,
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
      setNotifMentions: (notifMentions) => set({ notifMentions }),
      setNotifDMs: (notifDMs) => set({ notifDMs }),
      setNotifAgentUpdates: (notifAgentUpdates) => set({ notifAgentUpdates }),
      setNotifChannelMessages: (notifChannelMessages) =>
        set({ notifChannelMessages }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      hydrateFromProfile: () => {
        const profile = useAuthStore.getState().profile;
        if (!profile) return;
        set({
          displayName: profile.display_name || "",
          status: (profile.status as UserStatus) || "online",
          statusMessage: profile.status_message || "",
          statusEmoji: profile.status_emoji || "",
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
        notifMentions: state.notifMentions,
        notifDMs: state.notifDMs,
        notifAgentUpdates: state.notifAgentUpdates,
        notifChannelMessages: state.notifChannelMessages,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
