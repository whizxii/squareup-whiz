"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Wrench,
  Zap,
  DollarSign,
  Timer,
  Hash,
  FileText,
  Ban,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ------------------------------------------------------------------ */
/*  Types (matching backend ExecutionResponse / PaginatedExecutions)   */
/* ------------------------------------------------------------------ */

interface ToolCallRecord {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly output: unknown;
  readonly duration_ms: number;
  readonly success: boolean;
}

interface ExecutionRecord {
  readonly id: string;
  readonly agent_id: string;
  readonly trigger_message_id: string | null;
  readonly trigger_channel_id: string | null;
  readonly tools_called: readonly ToolCallRecord[];
  readonly response_text: string | null;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly total_cost_usd: number | null;
  readonly duration_ms: number | null;
  readonly num_tool_calls: number;
  readonly status: "success" | "error" | "timeout" | "cancelled";
  readonly error_message: string | null;
  readonly created_at: string;
}

type StatusFilter = "all" | "success" | "error" | "timeout" | "cancelled";

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { icon: typeof Check; color: string; bg: string }> = {
  success: { icon: Check, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  error: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  timeout: { icon: Timer, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  cancelled: { icon: Ban, color: "text-muted-foreground", bg: "bg-muted" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.error;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatCost(cost: number | null): string {
  if (cost === null || cost === undefined) return "—";
  if (cost < 0.001) return "<$0.001";
  return `$${cost.toFixed(4)}`;
}

function formatTokens(input: number | null, output: number | null): string {
  if (input === null && output === null) return "—";
  const parts: string[] = [];
  if (input !== null) parts.push(`${input.toLocaleString()} in`);
  if (output !== null) parts.push(`${output.toLocaleString()} out`);
  return parts.join(" / ");
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Tool Call Detail Row                                               */
/* ------------------------------------------------------------------ */

function ToolCallDetail({ tool }: { tool: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
      >
        {tool.success ? (
          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
        ) : (
          <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
        )}
        <span className="text-xs font-mono font-medium text-foreground">
          {tool.name}
        </span>
        {tool.duration_ms > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {formatDuration(tool.duration_ms)}
          </span>
        )}
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 border-t border-border space-y-2">
              {/* Input */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Input
                </p>
                <pre className="text-[11px] font-mono text-foreground/80 bg-muted/50 rounded-md p-2 overflow-x-auto max-h-32 scrollbar-thin">
                  {JSON.stringify(tool.input, null, 2)}
                </pre>
              </div>

              {/* Output */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Output
                </p>
                <pre className="text-[11px] font-mono text-foreground/80 bg-muted/50 rounded-md p-2 overflow-x-auto max-h-32 scrollbar-thin">
                  {typeof tool.output === "string"
                    ? tool.output
                    : JSON.stringify(tool.output, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Execution Row                                               */
/* ------------------------------------------------------------------ */

function ExecutionRow({ execution }: { execution: ExecutionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const style = getStatusStyle(execution.status);
  const StatusIcon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl overflow-hidden bg-card"
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
      >
        {/* Status icon */}
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", style.bg)}>
          <StatusIcon className={cn("w-3.5 h-3.5", style.color)} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold capitalize text-foreground">
              {execution.status}
            </span>
            {execution.num_tool_calls > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Wrench className="w-2.5 h-2.5" />
                {execution.num_tool_calls} tool{execution.num_tool_calls !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {execution.response_text && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-md">
              {execution.response_text}
            </p>
          )}
          {execution.error_message && (
            <p className="text-[11px] text-red-500 truncate mt-0.5 max-w-md">
              {execution.error_message}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
          {execution.duration_ms !== null && (
            <span className="flex items-center gap-0.5">
              <Timer className="w-2.5 h-2.5" />
              {formatDuration(execution.duration_ms)}
            </span>
          )}
          {execution.total_cost_usd !== null && (
            <span className="flex items-center gap-0.5">
              <DollarSign className="w-2.5 h-2.5" />
              {formatCost(execution.total_cost_usd)}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatTimestamp(execution.created_at)}
        </span>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Duration</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {formatDuration(execution.duration_ms)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Cost</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {formatCost(execution.total_cost_usd)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Tokens</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {formatTokens(execution.input_tokens, execution.output_tokens)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Tool Calls</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {execution.num_tool_calls}
                  </p>
                </div>
              </div>

              {/* Response text */}
              {execution.response_text && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Response
                  </p>
                  <div className="text-xs text-foreground/80 whitespace-pre-wrap bg-muted/30 border border-border rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin">
                    {execution.response_text}
                  </div>
                </div>
              )}

              {/* Error message */}
              {execution.error_message && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-500 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Error
                  </p>
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                    {execution.error_message}
                  </div>
                </div>
              )}

              {/* Tool calls */}
              {execution.tools_called.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Tool Calls ({execution.tools_called.length})
                  </p>
                  <div className="space-y-1.5">
                    {execution.tools_called.map((tool, idx) => (
                      <ToolCallDetail key={`${tool.name}-${idx}`} tool={tool} />
                    ))}
                  </div>
                </div>
              )}

              {/* Execution ID */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 pt-1">
                <Hash className="w-2.5 h-2.5" />
                <span className="font-mono">{execution.id}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Parse backend response (tools_called is JSON string from backend) */
/* ------------------------------------------------------------------ */

function parseExecution(raw: Record<string, unknown>): ExecutionRecord {
  let toolsCalled: ToolCallRecord[] = [];
  const rawTools = raw.tools_called;
  if (typeof rawTools === "string") {
    try {
      const parsed = JSON.parse(rawTools);
      toolsCalled = Array.isArray(parsed) ? parsed : [];
    } catch {
      toolsCalled = [];
    }
  } else if (Array.isArray(rawTools)) {
    toolsCalled = rawTools as ToolCallRecord[];
  }

  return {
    id: raw.id as string,
    agent_id: raw.agent_id as string,
    trigger_message_id: (raw.trigger_message_id as string) ?? null,
    trigger_channel_id: (raw.trigger_channel_id as string) ?? null,
    tools_called: toolsCalled,
    response_text: (raw.response_text as string) ?? null,
    input_tokens: (raw.input_tokens as number) ?? null,
    output_tokens: (raw.output_tokens as number) ?? null,
    total_cost_usd: (raw.total_cost_usd as number) ?? null,
    duration_ms: (raw.duration_ms as number) ?? null,
    num_tool_calls: (raw.num_tool_calls as number) ?? 0,
    status: (raw.status as ExecutionRecord["status"]) ?? "error",
    error_message: (raw.error_message as string) ?? null,
    created_at: raw.created_at as string,
  };
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface AgentExecutionHistoryProps {
  agentId: string;
  className?: string;
}

export default function AgentExecutionHistory({
  agentId,
  className,
}: AgentExecutionHistoryProps) {
  const [executions, setExecutions] = useState<readonly ExecutionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const PAGE_SIZE = 20;

  const fetchExecutions = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const token = useAuthStore.getState().token;
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

        const res = await fetch(
          `${API_URL}/api/agents/${agentId}/executions?offset=${offset}&limit=${PAGE_SIZE}`,
          { headers }
        );

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errBody.detail || `API Error: ${res.status}`);
        }

        const data = await res.json();
        const items = ((data.items ?? []) as Record<string, unknown>[]).map(parseExecution);

        setTotal(data.total ?? 0);
        setExecutions((prev) => (append ? [...prev, ...items] : items));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load executions";
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [agentId]
  );

  useEffect(() => {
    fetchExecutions(0, false);
  }, [fetchExecutions]);

  const filteredExecutions = useMemo(
    () =>
      statusFilter === "all"
        ? executions
        : executions.filter((e) => e.status === statusFilter),
    [executions, statusFilter]
  );

  const hasMore = executions.length < total;

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchExecutions(executions.length, true);
    }
  }, [loadingMore, hasMore, executions.length, fetchExecutions]);

  const handleRefresh = useCallback(() => {
    fetchExecutions(0, false);
  }, [fetchExecutions]);

  // Count per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: executions.length };
    for (const e of executions) {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    }
    return counts;
  }, [executions]);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Execution History
          </h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {total}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {(["all", "success", "error", "timeout", "cancelled"] as StatusFilter[]).map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2 py-1 rounded-full text-[10px] font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {s}
              {(statusCounts[s] ?? 0) > 0 && (
                <span className="ml-1 opacity-60">{statusCounts[s]}</span>
              )}
            </button>
          )
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {statusFilter !== "all"
              ? `No ${statusFilter} executions found.`
              : "No executions yet. Invoke the agent to see history here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExecutions.map((execution) => (
            <ExecutionRow key={execution.id} execution={execution} />
          ))}

          {/* Load more */}
          {hasMore && statusFilter === "all" && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent/30 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {loadingMore ? "Loading..." : `Load more (${executions.length} of ${total})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
