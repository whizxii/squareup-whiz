"use client";

import { useState, useCallback, useEffect } from "react";
import { useAgentStore, Agent, AgentStatus } from "@/lib/stores/agent-store";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentChat } from "@/components/agents/AgentChat";
import CreateAgentDialog from "@/components/agents/CreateAgentDialog";
import AgentTemplates from "@/components/agents/AgentTemplates";
import EditAgentDialog from "@/components/agents/EditAgentDialog";
import {
  Bot,
  Plus,
  Sparkles,
  Search,
  LayoutGrid,
  List,
  Filter,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type FilterStatus = "all" | AgentStatus;

export default function AgentsPage() {
  const { agents, selectedAgentId, setSelectedAgent, addAgent, fetchAgents, removeAgent } =
    useAgentStore();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Load agents from API on mount (prevents vanishing on refresh)
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const filteredAgents = agents.filter((a) => {
    if (!a.active) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.tools.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Aggregate stats
  const totalRuns = agents.reduce((sum, a) => sum + a.total_executions, 0);
  const totalCost = agents.reduce((sum, a) => sum + a.total_cost_usd, 0);
  const avgSuccess =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + a.success_rate, 0) / agents.length
      : 0;

  const handleCreateAgent = useCallback(
    (agent: Agent) => {
      addAgent(agent);
      setShowCreateDialog(false);
    },
    [addAgent]
  );

  const handleDeployTemplate = useCallback(
    (agent: Agent) => {
      addAgent(agent);
      setShowTemplates(false);
    },
    [addAgent]
  );

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent);
  }, []);

  const handleDeleteAgent = useCallback(
    (agent: Agent) => {
      removeAgent(agent.id);
    },
    [removeAgent]
  );

  // Show agent chat if an agent is selected
  if (selectedAgentId) {
    return <AgentChat onBack={() => setSelectedAgent(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-sm">AI Agents</h2>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {agents.filter((a) => a.active).length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sq-agent/30 text-sq-agent text-sm font-medium hover:bg-sq-agent/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Agent</span>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-4 py-2.5 border-b border-border bg-card/50 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{totalRuns}</span> total
          runs
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">
            ${totalCost.toFixed(2)}
          </span>{" "}
          spent
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">
            {avgSuccess.toFixed(1)}%
          </span>{" "}
          success
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {(["all", "idle", "working", "error"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-2 py-1 rounded-md text-xs capitalize transition-colors",
                filterStatus === s
                  ? "bg-sq-agent/10 text-sq-agent font-medium"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-sq-agent/10 text-sq-agent"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-sq-agent/10 text-sq-agent"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredAgents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-sq-agent/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-sq-agent" />
            </div>
            <h3 className="text-lg font-display font-bold">
              {searchQuery || filterStatus !== "all"
                ? "No agents match your filters"
                : "Meet your AI team"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters."
                : "Start with the pre-built agents — CRM, Meeting, GitHub, and Scheduler — or create your own from scratch."}
            </p>
            {!searchQuery && filterStatus === "all" && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Agent
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => setSelectedAgent(agent.id)}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-4xl">
            {filteredAgents.map((agent) => (
              <AgentListRow
                key={agent.id}
                agent={agent}
                onClick={() => setSelectedAgent(agent.id)}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Agent Dialog */}
      {showCreateDialog && (
        <CreateAgentDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateAgent}
        />
      )}

      {/* Edit Agent Dialog */}
      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}

      {/* Agent Templates Gallery */}
      {showTemplates && (
        <AgentTemplates
          onDeploy={handleDeployTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

// ─── List Row ──────────────────────────────────────────────────────
const statusDot: Record<string, string> = {
  idle: "bg-sq-online",
  thinking: "bg-sq-away animate-pulse",
  working: "bg-sq-away animate-pulse",
  error: "bg-sq-busy",
  offline: "bg-gray-400",
};

function AgentListRow({
  agent,
  onClick,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  onClick: () => void;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-accent/50 transition-colors text-left group"
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-sq-agent/10 flex items-center justify-center ring-1 ring-sq-agent/20">
          {agent.office_station_icon ? (
            <span className="text-lg">{agent.office_station_icon}</span>
          ) : (
            <Bot className="w-5 h-5 text-sq-agent" />
          )}
        </div>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
            statusDot[agent.status] || "bg-gray-400"
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{agent.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {agent.description}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {agent.total_executions}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />${agent.total_cost_usd.toFixed(2)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {agent.success_rate}%
        </span>
      </div>

      {agent.tools.length > 0 && (
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {agent.tools.slice(0, 2).map((tool) => (
            <span
              key={tool}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {tool}
            </span>
          ))}
          {agent.tools.length > 2 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{agent.tools.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Edit/Delete on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onEdit && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onEdit(agent); } }}
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
            onClick={(e) => { e.stopPropagation(); onDelete(agent); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(agent); } }}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-500 transition-colors"
            title="Delete agent"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}
