"use client";

import { useAgentStore } from "@/lib/stores/agent-store";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface AgentPresenceIndicatorProps {
  /** Only show agents that are actively "thinking" or "working" */
  activeOnly?: boolean;
  className?: string;
}

export function AgentPresenceIndicator({
  activeOnly = false,
  className,
}: AgentPresenceIndicatorProps) {
  const agents = useAgentStore((s) => s.agents);

  const visibleAgents = activeOnly
    ? agents.filter((a) => a.status === "thinking" || a.status === "working")
    : agents.filter((a) => a.active);

  if (visibleAgents.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {visibleAgents.slice(0, 4).map((agent) => (
        <div
          key={agent.id}
          title={`${agent.name}${agent.status !== "idle" ? ` (${agent.status})` : ""}`}
          className={cn(
            "relative w-6 h-6 rounded-md flex items-center justify-center shrink-0",
            "bg-sq-agent/10 ring-1 ring-sq-agent/20",
            "transition-all duration-200"
          )}
        >
          {agent.office_station_icon ? (
            <span className="text-xs">{agent.office_station_icon}</span>
          ) : (
            <Bot className="w-3 h-3 text-sq-agent" />
          )}

          {/* Status dot */}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card",
              agent.status === "thinking" && "bg-amber-400 animate-pulse",
              agent.status === "working" && "bg-sq-agent animate-pulse",
              agent.status === "idle" && "bg-emerald-400",
              agent.status === "error" && "bg-destructive",
              agent.status === "offline" && "bg-muted-foreground/40"
            )}
          />
        </div>
      ))}
      {visibleAgents.length > 4 && (
        <span className="text-[10px] text-muted-foreground font-medium">
          +{visibleAgents.length - 4}
        </span>
      )}
    </div>
  );
}
