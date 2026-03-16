"use client";

import { useState, useCallback } from "react";
import { useAgentStore, Agent, AgentStatus } from "@/lib/stores/agent-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentChat } from "@/components/agents/AgentChat";
import {
  Bot,
  Plus,
  X,
  Search,
  LayoutGrid,
  List,
  Filter,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type FilterStatus = "all" | AgentStatus;

export default function AgentsPage() {
  const { agents, selectedAgentId, setSelectedAgent, addAgent } =
    useAgentStore();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Agent</span>
        </button>
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

function AgentListRow({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-accent/50 transition-colors text-left"
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
    </button>
  );
}

// ─── Create Agent Dialog ───────────────────────────────────────────
const TRIGGER_MODES = [
  { id: "mention", label: "When @mentioned" },
  { id: "auto", label: "Auto-respond in channel" },
  { id: "scheduled", label: "On a schedule" },
] as const;

const AVAILABLE_TOOLS = [
  { id: "crm_search", label: "CRM Search", category: "CRM" },
  { id: "crm_create_contact", label: "Create Contact", category: "CRM" },
  { id: "crm_update_contact", label: "Update Contact", category: "CRM" },
  { id: "crm_log_activity", label: "Log Activity", category: "CRM" },
  { id: "calendar_list_events", label: "List Events", category: "Calendar" },
  { id: "calendar_create_event", label: "Create Event", category: "Calendar" },
  { id: "calendar_find_free_time", label: "Find Free Time", category: "Calendar" },
  { id: "github_list_prs", label: "List PRs", category: "GitHub" },
  { id: "github_create_issue", label: "Create Issue", category: "GitHub" },
  { id: "reminder_create", label: "Create Reminder", category: "Scheduling" },
  { id: "team_availability", label: "Team Availability", category: "Scheduling" },
];

const ICON_OPTIONS = ["📊", "📅", "🐙", "⏰", "🔍", "📝", "🤖", "💬", "📧", "🎯"];

function CreateAgentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (agent: Agent) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [icon, setIcon] = useState("🤖");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [triggerMode, setTriggerMode] = useState<"mention" | "auto" | "scheduled">("mention");
  const [error, setError] = useState("");

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }
    if (!instructions.trim()) {
      setError("Instructions are required");
      return;
    }

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      system_prompt: instructions.trim(),
      model: "claude-sonnet-4-6",
      tools: selectedTools,
      mcp_servers: [],
      trigger_mode: triggerMode,
      personality: "",
      office_station_icon: icon,
      status: "idle",
      active: true,
      total_executions: 0,
      total_cost_usd: 0,
      success_rate: 100,
      created_by: getCurrentUserId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onCreate(newAgent);
  };

  // Group tools by category
  const toolsByCategory = AVAILABLE_TOOLS.reduce(
    (acc, tool) => {
      const cat = tool.category;
      return { ...acc, [cat]: [...(acc[cat] || []), tool] };
    },
    {} as Record<string, typeof AVAILABLE_TOOLS>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4 scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h3 className="font-display font-bold text-base">Create Agent</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Icon picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Icon
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                    icon === ic
                      ? "bg-sq-agent/10 ring-2 ring-sq-agent/40 scale-110"
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Research Agent"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Instructions *
            </label>
            <textarea
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                setError("");
              }}
              placeholder="Tell the agent how to behave, what it should do, and any important context..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
            />
          </div>

          {/* Trigger mode */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Trigger
            </label>
            <div className="flex items-center gap-2">
              {TRIGGER_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setTriggerMode(mode.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    triggerMode === mode.id
                      ? "bg-sq-agent/10 text-sq-agent border border-sq-agent/30"
                      : "border border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Tools ({selectedTools.length} selected)
            </label>
            <div className="space-y-3">
              {Object.entries(toolsByCategory).map(([category, tools]) => (
                <div key={category}>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs transition-colors",
                          selectedTools.includes(tool.id)
                            ? "bg-sq-agent/10 text-sq-agent border border-sq-agent/30"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-card rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors"
          >
            Create Agent
          </button>
        </div>
      </div>
    </div>
  );
}
