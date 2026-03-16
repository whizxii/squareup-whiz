"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Wrench, Check, X } from "lucide-react";
import type { ToolCall } from "@/lib/stores/agent-store";

interface AgentResponseCardProps {
  toolCalls: ToolCall[];
  durationMs?: number;
}

export function AgentResponseCard({ toolCalls, durationMs }: AgentResponseCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  const successCount = toolCalls.filter((t) => t.success).length;
  const totalDuration = toolCalls.reduce((sum, t) => sum + t.duration_ms, 0);

  return (
    <div className="mt-2 rounded-lg border border-sq-agent/20 bg-sq-agent/[0.04] overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-sq-agent/[0.06] transition-colors"
      >
        <Wrench className="w-3.5 h-3.5 text-sq-agent shrink-0" />
        <span className="text-xs font-medium text-sq-agent">
          {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""} used
        </span>
        <span className="text-[10px] text-muted-foreground">
          {successCount}/{toolCalls.length} succeeded
          {totalDuration > 0 && ` · ${totalDuration}ms`}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Expanded tool details */}
      {expanded && (
        <div className="border-t border-sq-agent/10">
          {toolCalls.map((call, i) => (
            <ToolCallRow key={`${call.name}-${i}`} call={call} />
          ))}
        </div>
      )}

      {/* Footer */}
      {durationMs != null && durationMs > 0 && (
        <div className="px-3 py-1.5 border-t border-sq-agent/10 text-[10px] text-muted-foreground">
          Total execution: {durationMs}ms
        </div>
      )}
    </div>
  );
}

function ToolCallRow({ call }: { call: ToolCall }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border-b border-sq-agent/5 last:border-b-0">
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-sq-agent/[0.04] transition-colors"
      >
        {call.success ? (
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : (
          <X className="w-3 h-3 text-destructive shrink-0" />
        )}
        <code className="text-[11px] font-mono text-foreground/80">{call.name}</code>
        <span className="text-[10px] text-muted-foreground ml-auto">{call.duration_ms}ms</span>
      </button>

      {showDetails && (
        <div className="px-3 pb-2 space-y-1">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground">Input:</span>
            <pre className="text-[10px] font-mono bg-muted/50 rounded p-1.5 mt-0.5 overflow-x-auto">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          {call.output != null && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground">Output:</span>
              <pre className="text-[10px] font-mono bg-muted/50 rounded p-1.5 mt-0.5 overflow-x-auto">
                {JSON.stringify(call.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
