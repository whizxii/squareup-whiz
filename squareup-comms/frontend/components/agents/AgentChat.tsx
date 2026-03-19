"use client";

import {
  useAgentStore,
  AgentChatMessage,
  ToolCall,
} from "@/lib/stores/agent-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { formatTime } from "@/lib/format";
import {
  Bot,
  Send,
  ArrowLeft,
  Wrench,
  Check,
  Loader2,
  AlertCircle,
  Trash2,
  RotateCcw,
  History,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import AgentExecutionHistory from "@/components/agents/AgentExecutionHistory";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Stable reference to avoid infinite re-render loops with React 19 + Zustand
const EMPTY_AGENT_MESSAGES: AgentChatMessage[] = [];

export function AgentChat({ onBack }: { onBack: () => void }) {
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const agents = useAgentStore((s) => s.agents);
  const chatMessages = useAgentStore(
    (s) => (selectedAgentId ? s.chatMessages[selectedAgentId] : null) ?? EMPTY_AGENT_MESSAGES
  );
  const addChatMessage = useAgentStore((s) => s.addChatMessage);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const updateChatMessage = useAgentStore((s) => s.updateChatMessage);
  const setChatMessages = useAgentStore((s) => s.setChatMessages);

  const agent = agents.find((a) => a.id === selectedAgentId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  if (!agent) return null;

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Add user message
    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      status: "done",
    };
    addChatMessage(agent.id, userMsg);

    // Add placeholder agent message (thinking state)
    const agentMsgId = `agent-${Date.now()}`;
    addChatMessage(agent.id, {
      id: agentMsgId,
      role: "agent",
      content: "",
      timestamp: new Date().toISOString(),
      status: "thinking",
    });

    updateAgent(agent.id, { status: "thinking", current_task: text });

    // Call the real backend API
    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/${agent.id}/invoke`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errBody.detail || `API Error: ${res.status}`);
      }

      const data = await res.json();
      // Backend returns tools_called as a JSON string — parse it safely
      let parsedTools: ToolCall[] = [];
      try {
        const raw = data.tools_called;
        const arr = Array.isArray(raw) ? raw : JSON.parse(raw || "[]");
        parsedTools = Array.isArray(arr) ? arr : [];
      } catch {
        parsedTools = [];
      }
      updateChatMessage(agent.id, agentMsgId, {
        content: data.response_text || (parsedTools.length > 0 ? "Completed." : "I couldn't generate a response. Please try again."),
        toolCalls: parsedTools,
        status: data.response_text ? "done" : "error",
      });
      updateAgent(agent.id, { status: "idle", current_task: undefined });
      setSending(false);
    } catch (err) {
      updateChatMessage(agent.id, agentMsgId, {
        content: "Failed to reach the agent. Make sure the backend is running.",
        status: "error",
      });
      updateAgent(agent.id, { status: "idle", current_task: undefined });
      setSending(false);
      return;
    }
  };

  const handleClearChat = () => {
    if (agent) {
      setChatMessages(agent.id, []);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          title="Back to agents"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-sq-agent/10 flex items-center justify-center ring-1 ring-sq-agent/20">
          {agent.office_station_icon ? (
            <span className="text-base">{agent.office_station_icon}</span>
          ) : (
            <Bot className="w-4.5 h-4.5 text-sq-agent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{agent.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {agent.status === "idle" ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sq-online inline-block" />
                Online
              </span>
            ) : agent.status === "thinking" ? (
              <span className="flex items-center gap-1 text-sq-agent">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </span>
            ) : agent.status === "working" ? (
              <span className="flex items-center gap-1 text-sq-away">
                <Loader2 className="w-3 h-3 animate-spin" />
                Working...
              </span>
            ) : (
              <span className="capitalize">{agent.status}</span>
            )}
          </p>
        </div>

        {/* Execution history toggle */}
        <button
          onClick={() => setShowHistory((p) => !p)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            showHistory
              ? "bg-sq-agent/10 text-sq-agent"
              : "hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
          title="Execution history"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Clear chat */}
        {chatMessages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content area: Messages or Execution History */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <AgentExecutionHistory agentId={agent.id} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {chatMessages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3 max-w-sm">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-sq-agent/10 flex items-center justify-center ring-1 ring-sq-agent/20">
                  {agent.office_station_icon ? (
                    <span className="text-2xl">{agent.office_station_icon}</span>
                  ) : (
                    <Bot className="w-7 h-7 text-sq-agent" />
                  )}
                </div>
                <h3 className="text-sm font-display font-bold">{agent.name}</h3>
                {agent.name?.trim().toLowerCase() === "donna" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      I'm Donna. What do you need?
                    </p>
                    <div className="text-[10px] text-muted-foreground/70 space-y-1">
                      <p>&quot;add Sarah, 555-1234, sarah@acme.com to CRM&quot;</p>
                      <p>&quot;how many contacts do we have?&quot;</p>
                      <p>&quot;schedule a meeting with Mike tomorrow at 3pm&quot;</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {agent.description || "Send a message to get started."}
                  </p>
                )}
                {agent.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-1">
                    {agent.tools.slice(0, 6).map((tool) => (
                      <span
                        key={tool}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-sq-agent/5 text-sq-agent border border-sq-agent/10"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {chatMessages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              agentIcon={agent.office_station_icon}
              agentName={agent.name}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
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
            placeholder={`Message @${agent.name}... (Shift+Enter for new line)`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30 transition-all scrollbar-thin"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-sq-agent text-white hover:bg-sq-agent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Bubble ───────────────────────────────────────────────────
function ChatBubble({
  message,
  agentIcon,
  agentName,
}: {
  message: AgentChatMessage;
  agentIcon?: string;
  agentName: string;
}) {
  const isAgent = message.role === "agent";
  const isError = message.status === "error";
  const isThinking = message.status === "thinking";

  return (
    <div className={cn("flex gap-3", !isAgent && "justify-end")}>
      {/* Agent avatar */}
      {isAgent && (
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ring-1",
            isError
              ? "bg-red-500/10 ring-red-500/20"
              : "bg-sq-agent/10 ring-sq-agent/20"
          )}
        >
          {isError ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          ) : agentIcon ? (
            <span className="text-xs">{agentIcon}</span>
          ) : (
            <Bot className="w-3.5 h-3.5 text-sq-agent" />
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isAgent ? "" : "items-end"
        )}
      >
        {/* Sender label */}
        <p className={cn("text-[11px] text-muted-foreground", !isAgent && "text-right")}>
          {isAgent ? agentName : "You"}
        </p>

        {/* Message bubble */}
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-2xl text-sm",
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
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{message.content || "Something went wrong."}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Tool calls */}
        {Array.isArray(message.toolCalls) && message.toolCalls.length > 0 && (
          <div className="space-y-1 pl-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                {tc.success ? (
                  <Check className="w-3 h-3 text-sq-online shrink-0" />
                ) : (
                  <Wrench className="w-3 h-3 text-sq-busy shrink-0" />
                )}
                <span className="font-mono">{tc.name}</span>
                {tc.duration_ms > 0 && (
                  <span className="opacity-60">({tc.duration_ms}ms)</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={cn("text-[10px] text-muted-foreground/60", !isAgent && "text-right")}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

