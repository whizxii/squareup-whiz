"use client";

import {
  useDonnaStore,
  getQuickActionsForPath,
  type DonnaChatMessage,
  type DonnaToolCall,
} from "@/lib/stores/donna-store";
import { useAgentStore, type AgentStatus } from "@/lib/stores/agent-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Loader2,
  Check,
  Wrench,
  AlertCircle,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// ─── Constants ────────────────────────────────────────────────────

const PANEL_SPRING = { type: "spring" as const, stiffness: 400, damping: 35 };

// ─── DonnaSidebar ─────────────────────────────────────────────────

export function DonnaSidebar() {
  const isOpen = useDonnaStore((s) => s.isOpen);
  const close = useDonnaStore((s) => s.close);
  const messages = useDonnaStore((s) => s.messages);
  const addMessage = useDonnaStore((s) => s.addMessage);
  const updateMessage = useDonnaStore((s) => s.updateMessage);
  const clearMessages = useDonnaStore((s) => s.clearMessages);
  const setStreaming = useDonnaStore((s) => s.setStreaming);
  const isStreaming = useDonnaStore((s) => s.isStreaming);
  const consumePendingPrompt = useDonnaStore((s) => s.consumePendingPrompt);

  const agents = useAgentStore((s) => s.agents);
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const pathname = usePathname();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Streaming accumulators
  const streamTextRef = useRef("");
  const streamToolsRef = useRef<DonnaToolCall[]>([]);
  const activeAgentMsgIdRef = useRef<string | null>(null);

  // Find Donna agent
  const donna = useMemo(
    () =>
      agents.find(
        (a) => a.active && a.name.toLowerCase().replace("@", "") === "donna"
      ),
    [agents],
  );

  // WebSocket setup
  const token = useAuthStore((s) => s.token);
  const { send: wsSend, on: wsOn, status: wsStatus } = useWebSocket(token);
  const userId = getCurrentUserId();

  // Use a separate synthetic channel for the sidebar to avoid conflicts with AgentChat
  const syntheticChannelId = donna ? `donna-sidebar:${donna.id}:${userId}` : "";

  // Join/leave the synthetic room
  useEffect(() => {
    if (!syntheticChannelId || wsStatus !== "connected" || !isOpen) return;
    wsSend({ type: "channel.join", channel_id: syntheticChannelId });
    return () => {
      wsSend({ type: "channel.leave", channel_id: syntheticChannelId });
    };
  }, [syntheticChannelId, wsStatus, wsSend, isOpen]);

  // Subscribe to agent streaming events
  useEffect(() => {
    if (!donna || !isOpen) return;
    const agentId = donna.id;

    const offTextDelta = wsOn("agent.text_delta", (data) => {
      const ch = data.channel_id as string;
      const aId = data.agent_id as string;
      const delta = data.delta as string;
      if (ch !== syntheticChannelId || aId !== agentId || !delta) return;

      streamTextRef.current += delta;
      const msgId = activeAgentMsgIdRef.current;
      if (msgId) {
        updateMessage(msgId, {
          content: streamTextRef.current,
          status: "thinking",
        });
      }
    });

    const offToolStart = wsOn("agent.tool_start", (data) => {
      const ch = data.channel_id as string;
      const aId = data.agent_id as string;
      const toolName = data.tool_name as string;
      if (ch !== syntheticChannelId || aId !== agentId || !toolName) return;

      const newTool: DonnaToolCall = {
        name: toolName,
        input: {},
        output: null,
        duration_ms: 0,
        success: false,
      };
      streamToolsRef.current = [...streamToolsRef.current, newTool];

      const msgId = activeAgentMsgIdRef.current;
      if (msgId) {
        updateMessage(msgId, {
          toolCalls: [...streamToolsRef.current],
        });
      }
    });

    const offToolResult = wsOn("agent.tool_result", (data) => {
      const ch = data.channel_id as string;
      const aId = data.agent_id as string;
      const toolName = data.tool_name as string;
      const success = data.success as boolean;
      const durationMs = (data.duration_ms as number) || 0;
      if (ch !== syntheticChannelId || aId !== agentId || !toolName) return;

      streamToolsRef.current = streamToolsRef.current.map((tc) =>
        tc.name === toolName && !tc.success && tc.duration_ms === 0
          ? { ...tc, success, duration_ms: durationMs }
          : tc
      );

      const msgId = activeAgentMsgIdRef.current;
      if (msgId) {
        updateMessage(msgId, {
          toolCalls: [...streamToolsRef.current],
        });
      }
    });

    const offComplete = wsOn("agent.complete", (data) => {
      const ch = data.channel_id as string;
      const aId = data.agent_id as string;
      if (ch !== syntheticChannelId || aId !== agentId) return;

      const msgId = activeAgentMsgIdRef.current;
      if (msgId) {
        updateMessage(msgId, {
          content: streamTextRef.current || "Done.",
          toolCalls: [...streamToolsRef.current],
          status: "done",
        });
      }
      updateAgent(agentId, { status: "idle", current_task: undefined });
      setStreaming(false);
      activeAgentMsgIdRef.current = null;
    });

    const offError = wsOn("agent.error", (data) => {
      const ch = data.channel_id as string;
      const aId = data.agent_id as string;
      const errorMsg = (data.error as string) || "Something went wrong.";
      if (ch !== syntheticChannelId || aId !== agentId) return;

      const msgId = activeAgentMsgIdRef.current;
      if (msgId) {
        updateMessage(msgId, {
          content: streamTextRef.current || errorMsg,
          status: "error",
        });
      }
      updateAgent(agentId, { status: "idle", current_task: undefined });
      setStreaming(false);
      activeAgentMsgIdRef.current = null;
    });

    const offStatus = wsOn("agent.status", (data) => {
      const aId = data.agent_id as string;
      const status = data.status as string;
      if (aId !== agentId) return;
      updateAgent(agentId, { status: status as AgentStatus });
    });

    const offProgress = wsOn("agent.progress", (data) => {
      const ch = data.channel_id as string;
      const aId = data.agent_id as string;
      const current = data.current as number;
      const total = data.total as number;
      const description = (data.description as string) || undefined;
      if (ch !== syntheticChannelId || aId !== agentId) return;
      useAgentStore.getState().updateProgress(ch, aId, current, total, description);
    });

    return () => {
      offTextDelta();
      offToolStart();
      offToolResult();
      offComplete();
      offError();
      offStatus();
      offProgress();
    };
  }, [donna, syntheticChannelId, wsOn, updateMessage, updateAgent, setStreaming, isOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // Escape key closes sidebar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  // Quick actions based on current page
  const quickActions = useMemo(
    () => getQuickActionsForPath(pathname),
    [pathname],
  );

  // Context-aware greeting
  const contextGreeting = useMemo(() => {
    if (pathname.startsWith("/crm")) return "Need anything for your CRM?";
    if (pathname.startsWith("/tasks")) return "Need help with tasks?";
    if (pathname.startsWith("/chat")) return "Need help with messages?";
    if (pathname.startsWith("/calendar")) return "Need anything for your calendar?";
    return "What do you need?";
  }, [pathname]);

  const handleSend = useCallback(
    (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isStreaming || !donna) return;
      setInput("");

      // Reset streaming accumulators
      streamTextRef.current = "";
      streamToolsRef.current = [];

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Add user message
      const userMsg: DonnaChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        status: "done",
      };
      addMessage(userMsg);

      // Add placeholder agent message (thinking)
      const agentMsgId = `donna-${Date.now()}`;
      activeAgentMsgIdRef.current = agentMsgId;
      addMessage({
        id: agentMsgId,
        role: "agent",
        content: "",
        timestamp: new Date().toISOString(),
        status: "thinking",
      });

      setStreaming(true);
      updateAgent(donna.id, { status: "thinking", current_task: content });

      // Send via WebSocket
      wsSend({
        type: "agent.invoke",
        agent_id: donna.id,
        content,
        channel_id: syntheticChannelId,
      });
    },
    [input, isStreaming, donna, addMessage, setStreaming, updateAgent, wsSend, syntheticChannelId],
  );

  // Consume pending prompt from command palette / external opener
  useEffect(() => {
    if (!isOpen || !donna || isStreaming) return;
    // Small delay so WebSocket room join completes first
    const timer = setTimeout(() => {
      const pending = consumePendingPrompt();
      if (pending) handleSend(pending);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, donna]);

  const donnaStatus = donna?.status ?? "idle";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="donna-sidebar"
          role="complementary"
          aria-label="Donna AI Assistant"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={PANEL_SPRING}
          className="w-[380px] max-w-full flex flex-col border-l border-border bg-card shrink-0 h-full z-30"
        >
          {/* Header */}
          <div className="flex items-center gap-3 h-14 px-4 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded-xl bg-sq-agent/10 flex items-center justify-center ring-1 ring-sq-agent/20">
              {donna?.office_station_icon ? (
                <span className="text-sm">{donna.office_station_icon}</span>
              ) : (
                <Bot className="w-4 h-4 text-sq-agent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Donna</p>
              <p className="text-[11px] text-muted-foreground">
                <DonnaStatusIndicator status={donnaStatus} isStreaming={isStreaming} />
              </p>
            </div>

            {/* Clear chat */}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 && (
              <EmptyState
                greeting={contextGreeting}
                quickActions={quickActions}
                onQuickAction={handleSend}
                donnaIcon={donna?.office_station_icon}
              />
            )}

            {messages.map((msg) => (
              <SidebarBubble
                key={msg.id}
                message={msg}
                donnaIcon={donna?.office_station_icon}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onInput={handleInput}
                placeholder="Ask Donna anything..."
                rows={1}
                disabled={!donna || isStreaming}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30 transition-all scrollbar-thin disabled:opacity-50"
                style={{ maxHeight: 120 }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming || !donna}
                className="p-2 rounded-xl bg-sq-agent text-white hover:bg-sq-agent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Status Indicator ─────────────────────────────────────────────

function DonnaStatusIndicator({
  status,
  isStreaming,
}: {
  status: AgentStatus;
  isStreaming: boolean;
}) {
  if (isStreaming || status === "thinking") {
    return (
      <span className="flex items-center gap-1 text-sq-agent">
        <Loader2 className="w-3 h-3 animate-spin" />
        Thinking...
      </span>
    );
  }
  if (status === "working" || status === "tool_calling") {
    return (
      <span className="flex items-center gap-1 text-sq-away">
        <Loader2 className="w-3 h-3 animate-spin" />
        Working...
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-sq-online inline-block" />
      Online
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyState({
  greeting,
  quickActions,
  onQuickAction,
  donnaIcon,
}: {
  greeting: string;
  quickActions: readonly { label: string; prompt: string; icon: string }[];
  onQuickAction: (text: string) => void;
  donnaIcon?: string;
}) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-[280px]">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-sq-agent/10 flex items-center justify-center ring-1 ring-sq-agent/20">
          {donnaIcon ? (
            <span className="text-xl">{donnaIcon}</span>
          ) : (
            <Bot className="w-6 h-6 text-sq-agent" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-display font-bold">Donna</h3>
          <p className="text-xs text-muted-foreground">{greeting}</p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onQuickAction(action.prompt)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs border border-border bg-background hover:border-sq-agent/30 hover:bg-sq-agent/5 transition-colors group"
            >
              <span className="text-sm shrink-0">{action.icon}</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {action.label}
              </span>
              <Sparkles className="w-3 h-3 ml-auto text-sq-agent/0 group-hover:text-sq-agent/60 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────

function SidebarBubble({
  message,
  donnaIcon,
}: {
  message: DonnaChatMessage;
  donnaIcon?: string;
}) {
  const isAgent = message.role === "agent";
  const isError = message.status === "error";
  const isThinking = message.status === "thinking" && !message.content;

  return (
    <div className={cn("flex gap-2.5", !isAgent && "justify-end")}>
      {/* Donna avatar */}
      {isAgent && (
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ring-1",
            isError
              ? "bg-red-500/10 ring-red-500/20"
              : "bg-sq-agent/10 ring-sq-agent/20"
          )}
        >
          {isError ? (
            <AlertCircle className="w-3 h-3 text-red-500" />
          ) : donnaIcon ? (
            <span className="text-[10px]">{donnaIcon}</span>
          ) : (
            <Bot className="w-3 h-3 text-sq-agent" />
          )}
        </div>
      )}

      <div className={cn("max-w-[85%] space-y-1.5", !isAgent && "items-end")}>
        {/* Message bubble */}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-[13px] leading-relaxed",
            isAgent
              ? isError
                ? "bg-red-500/5 border border-red-500/10 rounded-tl-md text-red-600 dark:text-red-400"
                : "bg-sq-agent/5 border border-sq-agent/10 rounded-tl-md"
              : "bg-primary text-primary-foreground rounded-tr-md"
          )}
        >
          {isThinking ? (
            <div className="flex items-center gap-2 text-sq-agent">
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-sq-agent animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs">Thinking...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{message.content || "Something went wrong."}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Tool calls (compact) */}
        {Array.isArray(message.toolCalls) && message.toolCalls.length > 0 && (
          <div className="space-y-0.5 pl-0.5">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-[10px] text-muted-foreground"
              >
                {tc.success ? (
                  <Check className="w-2.5 h-2.5 text-sq-online shrink-0" />
                ) : tc.duration_ms > 0 ? (
                  <AlertCircle className="w-2.5 h-2.5 text-red-400 shrink-0" />
                ) : (
                  <Wrench className="w-2.5 h-2.5 text-sq-busy animate-spin shrink-0" />
                )}
                <span className="font-mono truncate">{tc.name}</span>
                {tc.duration_ms > 0 && (
                  <span className="opacity-50">({tc.duration_ms}ms)</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={cn("text-[9px] text-muted-foreground/50", !isAgent && "text-right")}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
