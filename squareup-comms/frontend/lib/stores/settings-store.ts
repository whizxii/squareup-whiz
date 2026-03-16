import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Profile defaults
      displayName: "Kunj",
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
      setDisplayName: (displayName) => set({ displayName }),
      setStatus: (status) => set({ status }),
      setStatusMessage: (statusMessage) => set({ statusMessage }),
      setStatusEmoji: (statusEmoji) => set({ statusEmoji }),
      setFontSize: (fontSize) => set({ fontSize }),
      setNotifMentions: (notifMentions) => set({ notifMentions }),
      setNotifDMs: (notifDMs) => set({ notifDMs }),
      setNotifAgentUpdates: (notifAgentUpdates) => set({ notifAgentUpdates }),
      setNotifChannelMessages: (notifChannelMessages) =>
        set({ notifChannelMessages }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
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
