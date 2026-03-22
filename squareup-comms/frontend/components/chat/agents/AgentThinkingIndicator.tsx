"use client";

import { cn } from "@/lib/utils";
import { Bot, Sparkles } from "lucide-react";

interface AgentThinkingIndicatorProps {
  agentName: string;
  agentIcon?: string;
  statusDescription?: string;
}

export function AgentThinkingIndicator({
  agentName,
  agentIcon,
  statusDescription,
}: AgentThinkingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-2 animate-fade-in-up">
      {/* Agent avatar */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-sq-agent/10 ring-1 ring-sq-agent/20">
        {agentIcon ? (
          <span className="text-sm">{agentIcon}</span>
        ) : (
          <Bot className="w-4 h-4 text-sq-agent" />
        )}
      </div>

      {/* Thinking bubble */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sq-agent/[0.06] border border-sq-agent/15">
        <Sparkles className="w-3.5 h-3.5 text-sq-agent animate-spin-slow" />
        <span className="text-xs text-sq-agent font-medium">{agentName}</span>
        <span className="text-xs text-muted-foreground">{statusDescription || "is thinking"}</span>
        <div className="flex gap-0.5 ml-1">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full bg-sq-agent/60",
              "animate-bounce"
            )}
            style={{ animationDelay: "0ms", animationDuration: "600ms" }}
          />
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full bg-sq-agent/60",
              "animate-bounce"
            )}
            style={{ animationDelay: "150ms", animationDuration: "600ms" }}
          />
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full bg-sq-agent/60",
              "animate-bounce"
            )}
            style={{ animationDelay: "300ms", animationDuration: "600ms" }}
          />
        </div>
      </div>
    </div>
  );
}
