"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  Check,
  X,
  Loader2,
} from "lucide-react";
import type { ActiveToolCall } from "@/lib/stores/agent-store";

interface ToolExecutionCardProps {
  toolCalls: readonly ActiveToolCall[];
}

const TOOL_ICONS: Record<string, string> = {
  crm_search_contacts: "search",
  crm_get_contact: "user",
  crm_create_contact: "user-plus",
  crm_update_contact: "user-check",
  crm_list_deals: "bar-chart",
  crm_create_deal: "plus-circle",
  search_messages: "search",
  list_channels: "hash",
  send_channel_message: "send",
  get_current_time: "clock",
};

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ToolExecutionCard({ toolCalls }: ToolExecutionCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (toolCalls.length === 0) return null;

  const runningCount = toolCalls.filter((t) => t.status === "running").length;
  const successCount = toolCalls.filter((t) => t.status === "success").length;
  const errorCount = toolCalls.filter((t) => t.status === "error").length;

  return (
    <div className="mt-2 rounded-lg border border-sq-agent/20 bg-sq-agent/[0.04] overflow-hidden animate-fade-in-up">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-sq-agent/[0.06] transition-colors"
      >
        <Wrench className="w-3.5 h-3.5 text-sq-agent shrink-0" />
        <span className="text-xs font-medium text-sq-agent">
          {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {runningCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              {runningCount} running
            </span>
          )}
          {successCount > 0 && ` · ${successCount} done`}
          {errorCount > 0 && ` · ${errorCount} failed`}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Tool call rows */}
      {expanded && (
        <div className="border-t border-sq-agent/10">
          {toolCalls.map((call, i) => (
            <LiveToolCallRow key={`${call.toolName}-${i}`} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveToolCallRow({ call }: { call: ActiveToolCall }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = call.inputPreview || call.outputPreview;

  return (
    <div className="border-b border-sq-agent/5 last:border-b-0">
      <button
        onClick={() => hasDetails && setShowDetails((v) => !v)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors",
          hasDetails && "hover:bg-sq-agent/[0.04] cursor-pointer",
          !hasDetails && "cursor-default"
        )}
      >
        {/* Status icon */}
        {call.status === "running" && (
          <Loader2 className="w-3 h-3 text-sq-agent animate-spin shrink-0" />
        )}
        {call.status === "success" && (
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        )}
        {call.status === "error" && (
          <X className="w-3 h-3 text-destructive shrink-0" />
        )}

        <code className="text-[11px] font-mono text-foreground/80">
          {formatToolName(call.toolName)}
        </code>

        {call.status === "running" && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            running...
          </span>
        )}

        {hasDetails && (
          <span className="ml-auto">
            {showDetails ? (
              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
            )}
          </span>
        )}
      </button>

      {/* Expandable details */}
      {showDetails && (
        <div className="px-3 pb-2 space-y-1">
          {call.inputPreview && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground">
                Input:
              </span>
              <pre className="text-[10px] font-mono bg-muted/50 rounded p-1.5 mt-0.5 overflow-x-auto max-h-24">
                {call.inputPreview}
              </pre>
            </div>
          )}
          {call.outputPreview && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground">
                Output:
              </span>
              <pre className="text-[10px] font-mono bg-muted/50 rounded p-1.5 mt-0.5 overflow-x-auto max-h-24">
                {call.outputPreview}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
