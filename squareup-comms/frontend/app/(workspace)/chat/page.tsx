"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useWebSocket } from "@/hooks/use-websocket";
import { api } from "@/lib/api";
import { ChannelList } from "@/components/chat/ChannelList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { CreateChannelDialog } from "@/components/chat/CreateChannelDialog";
import { Hash, Menu, X, WifiOff, Search, Pin, Bookmark } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { AgentPresenceIndicator } from "@/components/chat/agents/AgentPresenceIndicator";
import { ThreadPanel } from "@/components/chat/thread/ThreadPanel";
import { CommandPalette } from "@/components/chat/command/CommandPalette";
import { SearchPanel } from "@/components/chat/search/SearchPanel";
import { PinnedMessages } from "@/components/chat/PinnedMessages";
import { BookmarkedMessages } from "@/components/chat/BookmarkedMessages";
import { MessageEffects, type EffectType } from "@/components/chat/effects/MessageEffects";
import { useKeyboardShortcuts, type ShortcutAction } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/chat/KeyboardShortcutsDialog";
import { ChannelSettingsSidebar } from "@/components/chat/ChannelSettingsSidebar";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Settings } from "lucide-react";

export default function ChatPage() {
  const currentUserId = useCurrentUserId();
  const token = useAuthStore((s) => s.token);
  const channels = useChatStore((s) => s.channels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setChannels = useChatStore((s) => s.setChannels);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const clearTyping = useChatStore((s) => s.clearTyping);
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const setActiveThread = useChatStore((s) => s.setActiveThread);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [activeEffect, setActiveEffect] = useState<EffectType | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // ─── Keyboard shortcuts (Linear-quality) ───────────────────────────
  const shortcuts = useMemo<ShortcutAction[]>(
    () => [
      {
        key: "k",
        meta: true,
        description: "Open command palette",
        category: "General",
        action: () => setCommandPaletteOpen((v) => !v),
      },
      {
        key: "/",
        meta: true,
        description: "Show keyboard shortcuts",
        category: "General",
        action: () => setShortcutsOpen((v) => !v),
      },
      {
        key: "Escape",
        description: "Close panel / dialog",
        category: "General",
        action: () => {
          if (shortcutsOpen) { setShortcutsOpen(false); return; }
          if (commandPaletteOpen) { setCommandPaletteOpen(false); return; }
          if (searchOpen) { setSearchOpen(false); return; }
          if (pinnedOpen) { setPinnedOpen(false); return; }
          if (bookmarksOpen) { setBookmarksOpen(false); return; }
          if (activeThreadId) { setActiveThread(null); return; }
          if (mobileSidebarOpen) { setMobileSidebarOpen(false); return; }
        },
      },
      {
        key: "m",
        meta: true,
        shift: true,
        description: "Toggle sidebar",
        category: "Navigation",
        action: () => setMobileSidebarOpen((v) => !v),
      },
      {
        key: "f",
        meta: true,
        shift: true,
        description: "Search messages",
        category: "Navigation",
        action: () => setSearchOpen((v) => !v),
      },
      {
        key: "t",
        meta: true,
        shift: true,
        description: "Toggle thread panel",
        category: "Navigation",
        action: () => {
          if (activeThreadId) {
            setActiveThread(null);
          }
        },
      },
      {
        key: "g c",
        description: "Go to chat",
        category: "Navigation",
        action: () => {
          // Focus the first channel if none selected
          const state = useChatStore.getState();
          if (state.channels.length > 0 && !state.activeChannelId) {
            state.setActiveChannel(state.channels[0].id);
          }
        },
      },
    ],
    [
      shortcutsOpen,
      commandPaletteOpen,
      searchOpen,
      pinnedOpen,
      bookmarksOpen,
      activeThreadId,
      mobileSidebarOpen,
      setActiveThread,
    ]
  );

  useKeyboardShortcuts(shortcuts);

  // ─── WebSocket connection ──────────────────────────────────────────
  // The hook builds the URL from NEXT_PUBLIC_WS_URL and appends ?token=<value>.
  // We pass the user ID as the token so the backend can identify us.
  const { status: wsStatus, send: wsSend, on: wsOn } = useWebSocket(token);

  // Expose wsStatus for the disconnection banner
  const isWsConnected = wsStatus === "connected";

  // ─── Incoming WebSocket message handlers ───────────────────────────
  useEffect(() => {
    // chat.message — a new message was posted in a channel
    const offMessage = wsOn("chat.message", (data) => {
      const raw = data as Record<string, unknown>;
      // Support both flat and nested (handlers.py wraps under "message" key)
      const msg = (raw.message ?? raw) as Record<string, unknown>;
      const channelId = msg.channel_id as string;
      if (!channelId) return;

      // Don't duplicate messages we sent ourselves (already added optimistically via REST)
      const senderId = msg.sender_id as string;
      if (senderId === currentUserId) return;

      addMessage(channelId, {
        id: (msg.id ?? msg.message_id) as string,
        channel_id: channelId,
        sender_id: senderId,
        sender_type: ((msg.sender_type as string) || "user") as "user" | "agent",
        content: msg.content as string | undefined,
        content_html: msg.content_html as string | undefined,
        thread_id: msg.thread_id as string | undefined,
        reply_count: (msg.reply_count as number) || 0,
        edited: (msg.edited as boolean) || false,
        pinned: (msg.pinned as boolean) || false,
        created_at: (msg.created_at as string) || new Date().toISOString(),
        updated_at: msg.updated_at as string | undefined,
        reactions: [],
        attachments: [],
        mentions: [],
        sender_name: senderId,
      });
    });

    // chat.typing — someone started or stopped typing
    const offTyping = wsOn("chat.typing", (data) => {
      const channelId = data.channel_id as string;
      const userId = data.user_id as string;
      if (!channelId || !userId) return;

      // Ignore our own typing echoes
      if (userId === currentUserId) return;

      if (data.is_typing) {
        setTyping(channelId, {
          user_id: userId,
          display_name: (data.display_name as string) || userId,
          timestamp: Date.now(),
        });
      } else {
        clearTyping(channelId, userId);
      }
    });

    // chat.reaction — a reaction was added or removed
    const offReaction = wsOn("chat.reaction", (data) => {
      const channelId = data.channel_id as string;
      const messageId = (data.message_id ?? data.id) as string;
      if (!channelId || !messageId) return;

      const emoji = data.emoji as string;
      const userId = data.user_id as string;
      const removed = data.removed as boolean | undefined;

      // Retrieve the current messages for this channel from the store
      const currentMessages = useChatStore.getState().messages[channelId] || [];
      const target = currentMessages.find((m) => m.id === messageId);
      if (!target) return;

      let updatedReactions = [...(target.reactions || [])];

      if (removed) {
        updatedReactions = updatedReactions.filter(
          (r) => !(r.emoji === emoji && r.user_id === userId)
        );
      } else {
        // Only add if not already present
        const exists = updatedReactions.some(
          (r) => r.emoji === emoji && r.user_id === userId
        );
        if (!exists) {
          updatedReactions.push({
            emoji,
            user_id: userId,
            created_at: (data.created_at as string) || new Date().toISOString(),
          });
        }
      }

      updateMessage(channelId, messageId, { reactions: updatedReactions });
    });

    // chat.edited — a message was edited
    const offEdited = wsOn("chat.edited", (data) => {
      const channelId = data.channel_id as string;
      const messageId = (data.message_id ?? data.id) as string;
      if (!channelId || !messageId) return;

      updateMessage(channelId, messageId, {
        content: data.content as string | undefined,
        content_html: data.content_html as string | undefined,
        edited: true,
        updated_at: (data.updated_at as string) || new Date().toISOString(),
      });
    });

    // chat.deleted — a message was deleted
    const offDeleted = wsOn("chat.deleted", (data) => {
      const channelId = data.channel_id as string;
      const messageId = (data.message_id ?? data.id) as string;
      if (!channelId || !messageId) return;

      removeMessage(channelId, messageId);
    });

    return () => {
      offMessage();
      offTyping();
      offReaction();
      offEdited();
      offDeleted();
    };
  }, [wsOn, addMessage, updateMessage, removeMessage, setTyping, clearTyping, currentUserId]);

  // ─── Typing indicator broadcasting (debounced) ─────────────────────
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTypingRef = useRef(false);

  const handleTypingChange = useCallback(
    (typing: boolean) => {
      if (!activeChannelId) return;

      if (typing && !isTypingRef.current) {
        // User just started typing
        isTypingRef.current = true;
        wsSend({
          type: "chat.typing",
          channel_id: activeChannelId,
          user_id: currentUserId,
          is_typing: true,
        });
      }

      // Reset the "stop typing" debounce timer every time the user types
      clearTimeout(typingTimerRef.current);

      if (typing) {
        typingTimerRef.current = setTimeout(() => {
          // User stopped typing (2 s of inactivity)
          isTypingRef.current = false;
          wsSend({
            type: "chat.typing",
            channel_id: activeChannelId,
            user_id: currentUserId,
            is_typing: false,
          });
        }, 2000);
      } else {
        // Explicitly stopped (e.g. sent a message)
        isTypingRef.current = false;
        wsSend({
          type: "chat.typing",
          channel_id: activeChannelId,
          user_id: currentUserId,
          is_typing: false,
        });
      }
    },
    [activeChannelId, wsSend, currentUserId]
  );

  // Clean up typing timer on unmount or channel change
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      if (isTypingRef.current && activeChannelId) {
        wsSend({
          type: "chat.typing",
          channel_id: activeChannelId,
          user_id: currentUserId,
          is_typing: false,
        });
        isTypingRef.current = false;
      }
    };
  }, [activeChannelId, wsSend]);

  // ─── Message effect trigger ──────────────────────────────────────
  // Subscribe to message changes and play effects for new messages
  const prevMessageCountRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const unsubscribe = useChatStore.subscribe((state) => {
      const channelId = state.activeChannelId;
      if (!channelId) return;

      const messages = state.messages[channelId] || [];
      const prevCount = prevMessageCountRef.current[channelId] ?? 0;

      if (messages.length > prevCount && prevCount > 0) {
        const newest = messages[messages.length - 1];
        if (newest?.effect_type) {
          setActiveEffect(newest.effect_type);
        }
      }

      prevMessageCountRef.current = {
        ...prevMessageCountRef.current,
        [channelId]: messages.length,
      };
    });
    return unsubscribe;
  }, []);

  // ─── Stale typing indicator cleanup ────────────────────────────────
  // Clear remote typing indicators that are older than 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useChatStore.getState();
      const now = Date.now();
      for (const [channelId, users] of Object.entries(state.typingUsers)) {
        for (const user of users) {
          if (now - user.timestamp > 5000) {
            clearTyping(channelId, user.user_id);
          }
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [clearTyping]);

  // ─── Fetch channels once token is ready (auth-gated) ──────────────
  useEffect(() => {
    if (!token) {
      // Auth not yet ready — don't spin forever, just show empty state
      setLoading(false);
      return;
    }
    const fetchChannels = async () => {
      setLoading(true);
      try {
        const data = await api.getChannels();
        const mapped = data.map((c) => ({
          ...c,
          type: c.type as "public" | "private" | "dm" | "agent",
          unread_count: 0,
        }));
        setChannels(mapped);

        // Auto-select first channel
        if (mapped.length > 0 && !activeChannelId) {
          setActiveChannel(mapped[0].id);
        }
      } catch {
        // API not available yet — show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch messages when active channel changes (REST) ─────────────
  useEffect(() => {
    if (!activeChannelId) return;

    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const data = await api.getMessages(activeChannelId);
        const rawMessages = data.messages ?? [];
        const messages = rawMessages.map((m) => ({
          id: m.id,
          channel_id: m.channel_id,
          sender_id: m.sender_id,
          sender_type: (m.sender_type || "user") as "user" | "agent",
          content: m.content,
          content_html: m.content_html,
          thread_id: m.thread_id,
          reply_count: m.reply_count || 0,
          edited: m.edited || false,
          pinned: m.pinned || false,
          created_at: m.created_at,
          updated_at: m.updated_at,
          reactions: [],
          attachments: [],
          mentions: [],
          sender_name: m.sender_id === currentUserId ? "You" : m.sender_id,
        }));
        // Backend returns newest-first; reverse for oldest-first display
        setMessages(activeChannelId, [...messages].reverse());
      } catch {
        // API not available
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchMessages();
  }, [activeChannelId, setMessages]);

  return (
    <div className="flex h-full">
      {/* Channel sidebar — desktop */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card shrink-0">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-display font-bold text-sm">Messages</h2>
        </div>
        <ChannelList onCreateChannel={() => setShowCreateChannel(true)} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Channel sidebar">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border animate-slide-in-right shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-display font-bold text-sm">Messages</h2>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded hover:bg-accent transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ChannelList
              onCreateChannel={() => {
                setMobileSidebarOpen(false);
                setShowCreateChannel(true);
              }}
            />
          </aside>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* WebSocket disconnection banner */}
        {!isWsConnected && (
          <div
            className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/90 text-amber-950 text-xs font-medium shrink-0 animate-fade-in-up"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {wsStatus === "reconnecting"
                ? "Connection lost. Reconnecting..."
                : wsStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected. Messages may be delayed."}
            </span>
          </div>
        )}

        {/* Channel header */}
        <div className="h-12 flex items-center gap-3 px-4 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-1 rounded hover:bg-accent transition-colors"
            aria-label="Open channel list"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          {activeChannel ? (
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-sm truncate">
                {activeChannel.name}
              </span>
              {activeChannel.description && (
                <span className="hidden sm:block text-xs text-muted-foreground truncate">
                  — {activeChannel.description}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {loading ? "Loading..." : "Select a channel"}
            </span>
          )}
          {/* Agent presence: show active agents in this channel */}
          <div className="ml-auto flex items-center gap-2">
            <AgentPresenceIndicator activeOnly className="gap-1.5" />
            {activeChannel && (
              <>
                <button
                  onClick={() => setPinnedOpen((v) => !v)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                  aria-label="Pinned messages"
                >
                  <Pin className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setBookmarksOpen((v) => !v)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                  aria-label="Bookmarked messages"
                >
                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                  aria-label="Search messages"
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                </button>
                {activeChannel.type !== "agent" && activeChannel.type !== "dm" && (
                  <button
                    onClick={() => setSettingsOpen((v) => !v)}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors"
                    aria-label="Channel Settings"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <MessageList loading={messagesLoading} />

        {/* Composer */}
        <MessageComposer onTypingChange={handleTypingChange} />
      </div>

      {/* Thread panel */}
      <AnimatePresence>
        {activeThreadId && (
          <ThreadPanel
            parentMessageId={activeThreadId}
            onClose={() => setActiveThread(null)}
          />
        )}
      </AnimatePresence>

      {/* Settings panel */}
      {settingsOpen && activeChannel && (
        <ChannelSettingsSidebar
          channel={activeChannel}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Search panel */}
      <AnimatePresence>
        {searchOpen && (
          <SearchPanel onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>

      {/* Pinned messages panel */}
      <AnimatePresence>
        {pinnedOpen && (
          <PinnedMessages onClose={() => setPinnedOpen(false)} />
        )}
      </AnimatePresence>

      {/* Bookmarked messages panel */}
      <AnimatePresence>
        {bookmarksOpen && (
          <BookmarkedMessages onClose={() => setBookmarksOpen(false)} />
        )}
      </AnimatePresence>

      {/* Create channel dialog */}
      <CreateChannelDialog
        open={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
      />

      {/* Command palette (Cmd+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Keyboard shortcuts dialog (Cmd+/) */}
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Message effects overlay */}
      <MessageEffects
        effect={activeEffect}
        onComplete={() => setActiveEffect(null)}
      />
    </div>
  );
}
