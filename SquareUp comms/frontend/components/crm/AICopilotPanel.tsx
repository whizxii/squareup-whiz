"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAICopilot } from "@/lib/hooks/use-crm-queries";
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Zap,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface CopilotMessage {
  readonly role: "user" | "assistant";
  readonly type?: string;
  readonly content: string;
}

// ─── Quick prompts ───────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "Hot leads", query: "Who are my hottest leads?", icon: Zap },
  { label: "At-risk deals", query: "Which deals are at risk or stalled?", icon: AlertCircle },
  { label: "Priorities", query: "What should I prioritize today?", icon: Lightbulb },
  { label: "Pipeline summary", query: "Give me a summary of my pipeline", icon: MessageSquare },
] as const;

// ─── Message Bubble ──────────────────────────────────────────────

function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 border border-border"
        )}
      >
        {message.type && !isUser && (
          <span className="inline-block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            {message.type}
          </span>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────

interface AICopilotPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AICopilotPanel({ open, onClose }: AICopilotPanelProps) {
  const [messages, setMessages] = useState<readonly CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const copilotMutation = useAICopilot();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const handleSend = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || copilotMutation.isPending) return;

      const userMessage: CopilotMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      scrollToBottom();

      try {
        const result = await copilotMutation.mutateAsync(trimmed);
        const data = result as { type?: string; message?: string } | undefined;
        const assistantMessage: CopilotMessage = {
          role: "assistant",
          type: data?.type ?? "answer",
          content: data?.message ?? "I couldn't generate a response. Please try again.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        scrollToBottom();
      } catch {
        const errorMessage: CopilotMessage = {
          role: "assistant",
          type: "error",
          content: "Something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
        scrollToBottom();
      }
    },
    [copilotMutation, scrollToBottom]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [handleSend, input]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 max-w-full bg-background border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Copilot</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">CRM AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask about leads, deals, pipelines, or get action recommendations.
              </p>
            </div>

            {/* Quick prompts */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.query)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs hover:bg-muted/50 transition-colors text-left"
                >
                  <prompt.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}

        {copilotMutation.isPending && (
          <div className="flex gap-2 items-center text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your CRM..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={copilotMutation.isPending}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || copilotMutation.isPending}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Press Enter to send
        </p>
      </div>
    </div>
  );
}
