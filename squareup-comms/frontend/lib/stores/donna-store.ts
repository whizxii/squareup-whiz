import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────

export interface DonnaChatMessage {
  readonly id: string;
  readonly role: "user" | "agent";
  readonly content: string;
  readonly toolCalls?: readonly DonnaToolCall[];
  readonly timestamp: string;
  readonly status?: "sending" | "thinking" | "done" | "error";
}

export interface DonnaToolCall {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly output: unknown;
  readonly duration_ms: number;
  readonly success: boolean;
}

// ─── Quick Actions ────────────────────────────────────────────────

export interface DonnaQuickAction {
  readonly label: string;
  readonly prompt: string;
  readonly icon: string;
}

const CRM_ACTIONS: readonly DonnaQuickAction[] = [
  { label: "Pipeline status", prompt: "Give me a quick pipeline summary", icon: "📊" },
  { label: "Stale deals", prompt: "Which deals haven't been updated in 7+ days?", icon: "⏳" },
  { label: "Add contact", prompt: "Help me add a new contact to CRM", icon: "➕" },
  { label: "Search CRM", prompt: "Search contacts for ", icon: "🔍" },
];

const TASKS_ACTIONS: readonly DonnaQuickAction[] = [
  { label: "Overdue tasks", prompt: "Show me all overdue tasks", icon: "🔴" },
  { label: "Create task", prompt: "Create a new task: ", icon: "➕" },
  { label: "My tasks today", prompt: "What tasks are due today?", icon: "📋" },
  { label: "Task summary", prompt: "Give me a summary of all open tasks", icon: "📊" },
];

const CHAT_ACTIONS: readonly DonnaQuickAction[] = [
  { label: "Summarize chat", prompt: "Summarize the recent conversation in this channel", icon: "📝" },
  { label: "Search messages", prompt: "Search messages for ", icon: "🔍" },
  { label: "Draft message", prompt: "Help me draft a message about ", icon: "✍️" },
];

const AGENTS_ACTIONS: readonly DonnaQuickAction[] = [
  { label: "Agent status", prompt: "Show me the status of all agents", icon: "🤖" },
  { label: "What can you do?", prompt: "What tools and capabilities do you have?", icon: "❓" },
];

const CALENDAR_ACTIONS: readonly DonnaQuickAction[] = [
  { label: "Today's meetings", prompt: "What meetings do I have today?", icon: "📅" },
  { label: "Schedule meeting", prompt: "Schedule a meeting with ", icon: "➕" },
  { label: "Check availability", prompt: "Check my availability for tomorrow", icon: "🕐" },
];

const DEFAULT_ACTIONS: readonly DonnaQuickAction[] = [
  { label: "Daily brief", prompt: "Give me a daily brief", icon: "☀️" },
  { label: "Prep me for tomorrow", prompt: "Give me an evening brief — what did I accomplish today and what should I focus on tomorrow?", icon: "🌙" },
  { label: "What's new?", prompt: "What happened since I was last active?", icon: "🔔" },
  { label: "Pipeline overview", prompt: "How does our pipeline look?", icon: "📊" },
  { label: "Overdue items", prompt: "Are there any overdue tasks or stale deals?", icon: "⚠️" },
];

const QUICK_ACTIONS_BY_PATH: Record<string, readonly DonnaQuickAction[]> = {
  "/crm": CRM_ACTIONS,
  "/tasks": TASKS_ACTIONS,
  "/chat": CHAT_ACTIONS,
  "/agents": AGENTS_ACTIONS,
  "/calendar": CALENDAR_ACTIONS,
};

export function getQuickActionsForPath(pathname: string): readonly DonnaQuickAction[] {
  for (const [prefix, actions] of Object.entries(QUICK_ACTIONS_BY_PATH)) {
    if (pathname.startsWith(prefix)) return actions;
  }
  return DEFAULT_ACTIONS;
}

// ─── Store ────────────────────────────────────────────────────────

interface DonnaState {
  readonly isOpen: boolean;
  readonly messages: DonnaChatMessage[];
  readonly isStreaming: boolean;
  readonly pendingPrompt: string | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  openWithPrompt: (prompt: string) => void;
  consumePendingPrompt: () => string | null;
  addMessage: (message: DonnaChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<DonnaChatMessage>) => void;
  setMessages: (messages: DonnaChatMessage[]) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
}

export const useDonnaStore = create<DonnaState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      isStreaming: false,
      pendingPrompt: null,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      openWithPrompt: (prompt) => set({ isOpen: true, pendingPrompt: prompt }),
      consumePendingPrompt: () => {
        const current = get().pendingPrompt;
        if (current) set({ pendingPrompt: null });
        return current;
      },

      addMessage: (message) =>
        set((s) => ({ messages: [...s.messages, message] })),

      updateMessage: (messageId, updates) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        })),

      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
    }),
    {
      name: "donna-sidebar",
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
);
