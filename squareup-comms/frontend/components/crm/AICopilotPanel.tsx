"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAICopilot } from "@/lib/hooks/use-crm-queries";
import {
  slideInRight,
  SPRING_STANDARD,
  backdropFade,
} from "@/lib/animations/crm-variants";
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
  Search,
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

// ─── Markdown classes ────────────────────────────────────────────

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-1">{children}</h3>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.startsWith("language-");
    return isBlock ? (
      <pre className="bg-muted rounded-md p-2 overflow-x-auto text-xs mb-2">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
    );
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border px-2 py-1 bg-muted/50 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
} as Record<string, React.ComponentType<Record<string, unknown>>>;

// ─── Typewriter Hook ─────────────────────────────────────────────

function useTypewriter(text: string, enabled: boolean, speed = 12) {
  const [displayed, setDisplayed] = useState(enabled ? "" : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);
    let index = 0;

    const tick = () => {
      if (index >= text.length) {
        setDone(true);
        return;
      }
      // Reveal in small chunks (2-4 chars) for natural feel
      const chunk = Math.min(text.length - index, Math.ceil(Math.random() * 3) + 1);
      index += chunk;
      setDisplayed(text.slice(0, index));
      timer = window.setTimeout(tick, speed);
    };

    let timer = window.setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [text, enabled, speed]);

  return { displayed, done };
}

// ─── Message Bubble ──────────────────────────────────────────────

function MessageBubble({
  message,
  animate = false,
}: {
  message: CopilotMessage;
  animate?: boolean;
}) {
  const isUser = message.role === "user";
  const { displayed, done } = useTypewriter(
    message.content,
    animate && !isUser,
  );
  const content = isUser ? message.content : displayed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
    >
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
        {message.type && !isUser && message.type !== "answer" && (
          <span className="inline-block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            {message.type}
          </span>
        )}
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
            {!done && (
              <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
            )}
          </>
        )}
      </div>
    </motion.div>
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

  // Build conversation history for the API (prior messages as context)
  const buildHistory = useMemo(() => {
    return (msgs: readonly CopilotMessage[]): Array<{ role: string; content: string }> =>
      msgs.map((m) => ({ role: m.role, content: m.content }));
  }, []);

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
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      scrollToBottom();

      try {
        const history = buildHistory(messages);
        const result = await copilotMutation.mutateAsync({ query: trimmed, history });
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
    [copilotMutation, scrollToBottom, messages, buildHistory]
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="copilot-backdrop"
            variants={backdropFade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="copilot-panel"
            variants={slideInRight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING_STANDARD}
            className="fixed inset-y-0 right-0 w-96 max-w-full bg-background border-l border-border shadow-xl z-50 flex flex-col"
          >
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
                      Ask anything — search contacts, view deals, create records, get insights.
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
                messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    message={msg}
                    animate={i === messages.length - 1 && msg.role === "assistant"}
                  />
                ))
              )}

              {copilotMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center text-xs text-muted-foreground"
                >
                  <Search className="w-3.5 h-3.5 animate-pulse" />
                  Searching CRM...
                </motion.div>
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
