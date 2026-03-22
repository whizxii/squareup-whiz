"use client";

import { Agent } from "@/lib/stores/agent-store";
import { cn } from "@/lib/utils";
import { Bot, Brain, MessageSquare, Zap, Clock, DollarSign, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onMemory?: (agent: Agent) => void;
}

const statusColors: Record<string, string> = {
  idle: "bg-sq-online",
  thinking: "bg-sq-away animate-pulse",
  working: "bg-sq-away animate-pulse",
  error: "bg-sq-busy",
  offline: "bg-gray-400",
};

export function AgentCard({ agent, onClick, onEdit, onDelete, onMemory }: AgentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(agent);
    },
    [agent, onEdit]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete) {
        onDelete?.(agent);
        setConfirmDelete(false);
      } else {
        setConfirmDelete(true);
      }
    },
    [agent, confirmDelete, onDelete]
  );

  // Reset confirm state when mouse leaves the card
  const handleMouseLeave = useCallback(() => {
    if (confirmDelete) setConfirmDelete(false);
  }, [confirmDelete]);

  return (
    <button
      onClick={onClick}
      onMouseLeave={handleMouseLeave}
      className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:shadow-md hover:border-sq-agent/30 transition-all duration-200 space-y-3 group relative"
    >
      {/* Action buttons — always visible when confirming, otherwise on hover */}
      <div className={cn(
        "absolute top-3 right-3 flex items-center gap-1 transition-opacity",
        confirmDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {onMemory && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onMemory(agent); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onMemory(agent); } }}
            className="p-1.5 rounded-lg hover:bg-sq-agent/10 text-muted-foreground hover:text-sq-agent transition-colors"
            title="View memory"
          >
            <Brain className="w-3.5 h-3.5" />
          </span>
        )}
        {onEdit && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleEdit}
            onKeyDown={(e) => { if (e.key === "Enter") handleEdit(e as unknown as React.MouseEvent); }}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Edit agent"
          >
            <Pencil className="w-3.5 h-3.5" />
          </span>
        )}
        {onDelete && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleDeleteClick}
            onKeyDown={(e) => { if (e.key === "Enter") handleDeleteClick(e as unknown as React.MouseEvent); }}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              confirmDelete
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                : "hover:bg-accent text-muted-foreground hover:text-red-500"
            )}
            title={confirmDelete ? "Click again to confirm" : "Delete agent"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-sq-agent/10 flex items-center justify-center ring-1 ring-sq-agent/20 group-hover:shadow-agent-glow transition-shadow">
            {agent.office_station_icon ? (
              <span className="text-xl">{agent.office_station_icon}</span>
            ) : (
              <Bot className="w-6 h-6 text-sq-agent" />
            )}
          </div>
          {/* Status dot */}
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
              statusColors[agent.status] || "bg-gray-400"
            )}
          />
        </div>

        <div className="flex-1 min-w-0 pr-14">
          <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {agent.description || "No description"}
          </p>
        </div>
      </div>

      {/* Current task */}
      {agent.current_task && (
        <div className="px-2.5 py-1.5 rounded-lg bg-sq-agent/5 border border-sq-agent/10">
          <p className="text-xs text-sq-agent truncate">
            {agent.status === "thinking" ? "Thinking..." : agent.current_task}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {agent.total_executions} runs
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          ${agent.total_cost_usd.toFixed(2)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {agent.success_rate}%
        </span>
      </div>

      {/* Tools */}
      {agent.tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.tools.slice(0, 4).map((tool) => (
            <span
              key={tool}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {tool}
            </span>
          ))}
          {agent.tools.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{agent.tools.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Chat CTA */}
      <div className="flex items-center gap-1.5 text-xs text-sq-agent opacity-0 group-hover:opacity-100 transition-opacity">
        <MessageSquare className="w-3.5 h-3.5" />
        Chat with {agent.name}
      </div>
    </button>
  );
}
