import { create } from "zustand";

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "dm" | "agent";
  description?: string;
  icon?: string;
  agent_id?: string;
  is_private?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_type: "user" | "agent";
  content?: string;
  content_html?: string;
  attachments?: Attachment[];
  thread_id?: string;
  reply_count: number;
  mentions?: Mention[];
  agent_execution_id?: string;
  tool_calls?: import("./agent-store").ToolCall[];
  edited: boolean;
  pinned: boolean;
  created_at: string;
  updated_at?: string;
  reactions?: Reaction[];
  effect_type?: "confetti" | "balloons" | "fireworks" | "sparkles";
  // Frontend-only fields
  sender_name?: string;
  pending?: boolean;
  failed?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Mention {
  type: "user" | "agent";
  id: string;
}

export interface Reaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

export interface TypingUser {
  user_id: string;
  display_name: string;
  timestamp: number;
}

interface ChatState {
  // Channels
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (id: string) => void;
  addChannel: (channel: Channel) => void;
  updateChannelUnread: (channelId: string, count: number) => void;

  // Messages
  messages: Record<string, Message[]>; // channelId -> messages
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;

  // Typing
  typingUsers: Record<string, TypingUser[]>; // channelId -> users
  setTyping: (channelId: string, user: TypingUser) => void;
  clearTyping: (channelId: string, userId: string) => void;

  // Thread
  activeThreadId: string | null;
  setActiveThread: (messageId: string | null) => void;

  // Unread tracking
  lastReadMessageId: Record<string, string>; // channelId -> messageId
  setLastRead: (channelId: string, messageId: string) => void;

  // UI
  contextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  channels: [],
  activeChannelId: null,
  messages: {},
  typingUsers: {},
  activeThreadId: null,
  lastReadMessageId: {},
  contextPanelOpen: false,

  setChannels: (channels) => set({ channels }),
  setActiveChannel: (id) => set({ activeChannelId: id }),
  addChannel: (channel) =>
    set((s) => ({ channels: [...s.channels, channel] })),
  updateChannelUnread: (channelId, count) =>
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId ? { ...c, unread_count: count } : c
      ),
    })),

  setMessages: (channelId, messages) =>
    set((s) => ({ messages: { ...s.messages, [channelId]: messages } })),
  addMessage: (channelId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: [...(s.messages[channelId] || []), message],
      },
    })),
  updateMessage: (channelId, messageId, updates) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),
  removeMessage: (channelId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] || []).filter(
          (m) => m.id !== messageId
        ),
      },
    })),
  prependMessages: (channelId, messages) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: [...messages, ...(s.messages[channelId] || [])],
      },
    })),

  setTyping: (channelId, user) =>
    set((s) => {
      const current = s.typingUsers[channelId] || [];
      const filtered = current.filter((u) => u.user_id !== user.user_id);
      return {
        typingUsers: {
          ...s.typingUsers,
          [channelId]: [...filtered, user],
        },
      };
    }),
  clearTyping: (channelId, userId) =>
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [channelId]: (s.typingUsers[channelId] || []).filter(
          (u) => u.user_id !== userId
        ),
      },
    })),

  setActiveThread: (messageId) => set({ activeThreadId: messageId }),
  setLastRead: (channelId, messageId) =>
    set((s) => ({
      lastReadMessageId: { ...s.lastReadMessageId, [channelId]: messageId },
    })),
  setContextPanelOpen: (open) => set({ contextPanelOpen: open }),
}));
