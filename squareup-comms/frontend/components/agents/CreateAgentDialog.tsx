"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bot,
  Wrench,
  Brain,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  Server,
  Shield,
  Thermometer,
  Repeat,
  Search,
  DollarSign,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Agent } from "@/lib/stores/agent-store";
import { useCustomToolsStore } from "@/lib/stores/custom-tools-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ToolDefinition {
  readonly name: string;
  readonly display_name: string;
  readonly description: string;
  readonly category: string;
  readonly source: string;
  readonly requires_confirmation: boolean;
}

interface WizardFormData {
  // Identity
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly personality: string;
  // Capabilities
  readonly selectedTools: readonly string[];
  readonly selectedCustomTools: readonly string[];
  readonly selectedMcpServers: readonly string[];
  // Behavior
  readonly systemPrompt: string;
  readonly triggerMode: "mention" | "auto" | "scheduled" | "webhook";
  readonly model: string;
  readonly autonomyLevel: number;
  readonly maxIterations: number;
  readonly temperature: number;
  readonly scheduleCron: string;
  readonly monthlyBudgetUsd: string;
  readonly dailyExecutionLimit: string;
}

const INITIAL_FORM: WizardFormData = {
  name: "",
  description: "",
  icon: "🤖",
  personality: "",
  selectedTools: [],
  selectedCustomTools: [],
  selectedMcpServers: [],
  systemPrompt: "",
  triggerMode: "mention",
  model: "claude-sonnet-4-6",
  autonomyLevel: 2,
  maxIterations: 5,
  temperature: 0.7,
  scheduleCron: "",
  monthlyBudgetUsd: "",
  dailyExecutionLimit: "",
};

const ICON_OPTIONS = [
  "🤖", "📊", "📅", "🐙", "⏰", "🔍", "📝", "💬", "📧",
  "🎯", "🧠", "⚡", "🛠️", "💡", "🚀", "🔒",
] as const;

const TRIGGER_MODES = [
  { id: "mention" as const, label: "When @mentioned", desc: "Agent responds when mentioned in a message" },
  { id: "auto" as const, label: "Auto-respond", desc: "Agent monitors channel and responds automatically" },
  { id: "scheduled" as const, label: "Scheduled", desc: "Agent runs on a cron schedule" },
  { id: "webhook" as const, label: "Webhook", desc: "Agent triggered via external webhook" },
] as const;

const MODEL_OPTIONS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Best balance of speed and quality" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", desc: "Maximum reasoning depth" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Fast and cost-effective" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "Open source via Groq" },
] as const;

const AUTONOMY_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: "Ask before all actions", desc: "Agent requests confirmation for every tool call" },
  2: { label: "Ask for writes", desc: "Auto-execute reads, confirm writes/mutations" },
  3: { label: "Ask for destructive", desc: "Auto-execute most actions, confirm destructive ones" },
  4: { label: "Full auto", desc: "Agent executes all tools without confirmation" },
};

const PERSONALITY_PRESETS = [
  { id: "professional", label: "Professional", prompt: "You are a professional and concise assistant. Be direct, clear, and action-oriented." },
  { id: "friendly", label: "Friendly", prompt: "You are a friendly and approachable assistant. Be warm, helpful, and conversational." },
  { id: "technical", label: "Technical", prompt: "You are a technical expert. Be precise, detailed, and use domain-specific terminology." },
  { id: "custom", label: "Custom", prompt: "" },
] as const;

const TAB_LABELS = ["Identity", "Capabilities", "Behavior", "Review"] as const;
const TAB_ICONS = [Bot, Wrench, Brain, CheckCircle2] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  return { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };
}

function generateSystemPrompt(form: WizardFormData, tools: readonly ToolDefinition[]): string {
  const selectedToolNames = tools
    .filter((t) => form.selectedTools.includes(t.name))
    .map((t) => t.display_name);

  const parts: string[] = [];

  if (form.personality) {
    parts.push(form.personality);
  } else {
    parts.push(`You are ${form.name}, an AI assistant.`);
  }

  if (form.description) {
    parts.push(`Your purpose: ${form.description}`);
  }

  if (selectedToolNames.length > 0) {
    parts.push(
      `You have access to these tools: ${selectedToolNames.join(", ")}. Use them proactively to help users.`
    );
  }

  parts.push(
    "Always be helpful, accurate, and concise. If you're unsure, say so rather than guessing."
  );

  return parts.join("\n\n");
}

/* ------------------------------------------------------------------ */
/*  Tab 1 — Identity                                                   */
/* ------------------------------------------------------------------ */

function IdentityTab({
  form,
  onChange,
}: {
  form: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}) {
  const [personalityPreset, setPersonalityPreset] = useState<string>(
    form.personality ? "custom" : "professional"
  );

  const handlePreset = (presetId: string) => {
    setPersonalityPreset(presetId);
    const preset = PERSONALITY_PRESETS.find((p) => p.id === presetId);
    if (preset && presetId !== "custom") {
      onChange({ personality: preset.prompt });
    }
  };

  return (
    <div className="space-y-5">
      {/* Icon picker */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Agent Icon
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ICON_OPTIONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => onChange({ icon: ic })}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
                form.icon === ic
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
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Sales Assistant, Task Manager, Research Agent"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Description
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What does this agent do? (helps with auto-generated system prompt)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
        />
      </div>

      {/* Personality */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Personality
        </label>
        <div className="flex items-center gap-2 mb-3">
          {PERSONALITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                personalityPreset === preset.id
                  ? "bg-sq-agent/10 text-sq-agent border border-sq-agent/30"
                  : "border border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          value={form.personality}
          onChange={(e) => {
            onChange({ personality: e.target.value });
            if (personalityPreset !== "custom") setPersonalityPreset("custom");
          }}
          placeholder="Describe how the agent should communicate..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2 — Capabilities                                               */
/* ------------------------------------------------------------------ */

function CapabilitiesTab({
  form,
  onChange,
  builtinTools,
  toolsLoading,
}: {
  form: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  builtinTools: readonly ToolDefinition[];
  toolsLoading: boolean;
}) {
  const [toolSearch, setToolSearch] = useState("");
  const customTools = useCustomToolsStore((s) => s.tools);
  const mcpServers = useCustomToolsStore((s) => s.mcpServers);

  // Group built-in tools by category
  const toolsByCategory = useMemo(() => {
    const filtered = toolSearch
      ? builtinTools.filter(
          (t) =>
            t.display_name.toLowerCase().includes(toolSearch.toLowerCase()) ||
            t.description.toLowerCase().includes(toolSearch.toLowerCase()) ||
            t.category.toLowerCase().includes(toolSearch.toLowerCase())
        )
      : builtinTools;

    return filtered.reduce<Record<string, readonly ToolDefinition[]>>((acc, tool) => {
      const cat = tool.category;
      return { ...acc, [cat]: [...(acc[cat] || []), tool] };
    }, {});
  }, [builtinTools, toolSearch]);

  const toggleTool = (name: string) => {
    const updated = form.selectedTools.includes(name)
      ? form.selectedTools.filter((t) => t !== name)
      : [...form.selectedTools, name];
    onChange({ selectedTools: updated });
  };

  const toggleCustomTool = (id: string) => {
    const updated = form.selectedCustomTools.includes(id)
      ? form.selectedCustomTools.filter((t) => t !== id)
      : [...form.selectedCustomTools, id];
    onChange({ selectedCustomTools: updated });
  };

  const toggleMcpServer = (id: string) => {
    const updated = form.selectedMcpServers.includes(id)
      ? form.selectedMcpServers.filter((s) => s !== id)
      : [...form.selectedMcpServers, id];
    onChange({ selectedMcpServers: updated });
  };

  const selectAllInCategory = (category: string) => {
    const catTools = toolsByCategory[category] || [];
    const catNames = catTools.map((t) => t.name);
    const allSelected = catNames.every((n) => form.selectedTools.includes(n));
    if (allSelected) {
      onChange({ selectedTools: form.selectedTools.filter((t) => !catNames.includes(t)) });
    } else {
      const merged = [...new Set([...form.selectedTools, ...catNames])];
      onChange({ selectedTools: merged });
    }
  };

  const totalSelected =
    form.selectedTools.length + form.selectedCustomTools.length + form.selectedMcpServers.length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-sq-agent/5 border border-sq-agent/20">
        <Sparkles className="w-4 h-4 text-sq-agent shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{totalSelected} tools</span> selected.
          Tools give your agent the ability to take real actions.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={toolSearch}
          onChange={(e) => setToolSearch(e.target.value)}
          placeholder="Search tools..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
        />
      </div>

      {/* Built-in tools */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-sq-agent" />
          Built-in Tools
        </h4>

        {toolsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(toolsByCategory).length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {toolSearch ? "No tools match your search." : "No built-in tools available."}
          </p>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {Object.entries(toolsByCategory).map(([category, tools]) => {
              const catNames = tools.map((t) => t.name);
              const allSelected = catNames.every((n) => form.selectedTools.includes(n));
              const someSelected = catNames.some((n) => form.selectedTools.includes(n));

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {category}
                    </p>
                    <button
                      type="button"
                      onClick={() => selectAllInCategory(category)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full transition-colors",
                        allSelected
                          ? "bg-sq-agent/10 text-sq-agent"
                          : someSelected
                            ? "bg-muted text-muted-foreground"
                            : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="grid gap-1.5">
                    {tools.map((tool) => {
                      const selected = form.selectedTools.includes(tool.name);
                      return (
                        <button
                          key={tool.name}
                          type="button"
                          onClick={() => toggleTool(tool.name)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg border transition-all",
                            selected
                              ? "border-sq-agent/30 bg-sq-agent/5"
                              : "border-border hover:border-sq-agent/20 hover:bg-accent/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                selected
                                  ? "bg-sq-agent border-sq-agent"
                                  : "border-border"
                              )}
                            >
                              {selected && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {tool.display_name}
                            </span>
                            {tool.requires_confirmation && (
                              <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 pl-6 line-clamp-1">
                            {tool.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom tools */}
      {customTools.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-indigo-500" />
            Custom Tools
          </h4>
          <div className="grid gap-1.5">
            {customTools.map((tool) => {
              const selected = form.selectedCustomTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleCustomTool(tool.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg border transition-all",
                    selected
                      ? "border-indigo-500/30 bg-indigo-500/5"
                      : "border-border hover:border-indigo-500/20 hover:bg-accent/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        selected
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-border"
                      )}
                    >
                      {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {tool.display_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {tool.tool_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 pl-6 line-clamp-1">
                    {tool.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MCP servers */}
      {mcpServers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-emerald-500" />
            MCP Servers
          </h4>
          <div className="grid gap-1.5">
            {mcpServers
              .filter((s) => s.status === "connected")
              .map((server) => {
                const selected = form.selectedMcpServers.includes(server.id);
                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => toggleMcpServer(server.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all",
                      selected
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border hover:border-emerald-500/20 hover:bg-accent/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          selected
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-border"
                        )}
                      >
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {server.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        {server.tools.length} tools
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3 — Behavior                                                   */
/* ------------------------------------------------------------------ */

function BehaviorTab({
  form,
  onChange,
  builtinTools,
}: {
  form: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  builtinTools: readonly ToolDefinition[];
}) {
  const autoPrompt = useMemo(
    () => generateSystemPrompt(form, builtinTools),
    [form, builtinTools]
  );

  return (
    <div className="space-y-5">
      {/* System prompt */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            System Prompt <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => onChange({ systemPrompt: autoPrompt })}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sq-agent/10 text-sq-agent hover:bg-sq-agent/20 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Auto-generate
          </button>
        </div>
        <textarea
          value={form.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="Instructions for the agent... Click 'Auto-generate' to create one based on your settings."
          rows={6}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30 font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Trigger mode */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Trigger Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TRIGGER_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange({ triggerMode: mode.id })}
              className={cn(
                "text-left p-3 rounded-lg border transition-all",
                form.triggerMode === mode.id
                  ? "border-sq-agent/30 bg-sq-agent/5"
                  : "border-border hover:border-sq-agent/20"
              )}
            >
              <p className="text-xs font-medium text-foreground">{mode.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
            </button>
          ))}
        </div>
        {form.triggerMode === "scheduled" && (
          <div className="mt-2">
            <input
              type="text"
              value={form.scheduleCron}
              onChange={(e) => onChange({ scheduleCron: e.target.value })}
              placeholder="Cron expression (e.g. 0 9 * * 1-5 for weekdays at 9am)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
            />
          </div>
        )}
      </div>

      {/* Model */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Model
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ model: m.id })}
              className={cn(
                "text-left p-2.5 rounded-lg border transition-all",
                form.model === m.id
                  ? "border-sq-agent/30 bg-sq-agent/5"
                  : "border-border hover:border-sq-agent/20"
              )}
            >
              <p className="text-xs font-medium text-foreground">{m.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Autonomy level */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Autonomy Level: {form.autonomyLevel}
        </label>
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={form.autonomyLevel}
          onChange={(e) => onChange({ autonomyLevel: parseInt(e.target.value) })}
          className="w-full accent-sq-agent"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">Cautious</span>
          <span className="text-[10px] text-muted-foreground">Full auto</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 p-2 rounded-lg bg-muted/50">
          <span className="font-medium text-foreground">
            {AUTONOMY_LABELS[form.autonomyLevel]?.label}
          </span>
          {" — "}
          {AUTONOMY_LABELS[form.autonomyLevel]?.desc}
        </p>
      </div>

      {/* Max iterations + Temperature */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" />
            Max Iterations: {form.maxIterations}
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={form.maxIterations}
            onChange={(e) => onChange({ maxIterations: parseInt(e.target.value) })}
            className="w-full accent-sq-agent"
          />
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">1</span>
            <span className="text-[10px] text-muted-foreground">20</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5" />
            Temperature: {form.temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={form.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-sq-agent"
          />
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">Precise</span>
            <span className="text-[10px] text-muted-foreground">Creative</span>
          </div>
        </div>
      </div>

      {/* Cost Controls */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Cost Controls
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Optional limits to prevent runaway spending. Leave blank for unlimited.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Monthly Budget (USD)
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.monthlyBudgetUsd}
              onChange={(e) => onChange({ monthlyBudgetUsd: e.target.value })}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              Daily Execution Limit
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.dailyExecutionLimit}
              onChange={(e) => onChange({ dailyExecutionLimit: e.target.value })}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4 — Review                                                     */
/* ------------------------------------------------------------------ */

function ReviewTab({
  form,
  builtinTools,
}: {
  form: WizardFormData;
  builtinTools: readonly ToolDefinition[];
}) {
  const customTools = useCustomToolsStore((s) => s.tools);
  const mcpServers = useCustomToolsStore((s) => s.mcpServers);

  const selectedBuiltinNames = builtinTools
    .filter((t) => form.selectedTools.includes(t.name))
    .map((t) => t.display_name);

  const selectedCustomNames = customTools
    .filter((t) => form.selectedCustomTools.includes(t.id))
    .map((t) => t.display_name);

  const selectedMcpNames = mcpServers
    .filter((s) => form.selectedMcpServers.includes(s.id))
    .map((s) => s.name);

  const totalTools =
    form.selectedTools.length + form.selectedCustomTools.length + form.selectedMcpServers.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-sq-agent/5 border border-sq-agent/20">
        <div className="w-12 h-12 rounded-xl bg-sq-agent/10 flex items-center justify-center text-2xl">
          {form.icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{form.name || "Unnamed Agent"}</h3>
          <p className="text-xs text-muted-foreground">
            {form.description || "No description"}
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-3">
        <ReviewRow label="Model" value={MODEL_OPTIONS.find((m) => m.id === form.model)?.label || form.model} />
        <ReviewRow
          label="Trigger"
          value={TRIGGER_MODES.find((m) => m.id === form.triggerMode)?.label || form.triggerMode}
        />
        <ReviewRow label="Autonomy" value={AUTONOMY_LABELS[form.autonomyLevel]?.label || `Level ${form.autonomyLevel}`} />
        <ReviewRow label="Max iterations" value={String(form.maxIterations)} />
        <ReviewRow label="Temperature" value={form.temperature.toFixed(1)} />
        <ReviewRow
          label="Monthly budget"
          value={form.monthlyBudgetUsd ? `$${form.monthlyBudgetUsd}` : "Unlimited"}
        />
        <ReviewRow
          label="Daily limit"
          value={form.dailyExecutionLimit ? `${form.dailyExecutionLimit} runs` : "Unlimited"}
        />
        <ReviewRow label="Total tools" value={String(totalTools)} />
      </div>

      {/* Tool lists */}
      {selectedBuiltinNames.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Built-in Tools ({selectedBuiltinNames.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedBuiltinNames.map((name) => (
              <span
                key={name}
                className="text-[10px] px-2 py-0.5 rounded-full bg-sq-agent/10 text-sq-agent"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedCustomNames.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Custom Tools ({selectedCustomNames.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedCustomNames.map((name) => (
              <span
                key={name}
                className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedMcpNames.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            MCP Servers ({selectedMcpNames.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedMcpNames.map((name) => (
              <span
                key={name}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* System prompt preview */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
          System Prompt Preview
        </p>
        <div className="p-3 rounded-lg bg-muted/50 border border-border max-h-32 overflow-y-auto scrollbar-thin">
          <p className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {form.systemPrompt || "(empty — will be auto-generated)"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dialog                                                        */
/* ------------------------------------------------------------------ */

export default function CreateAgentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (agent: Agent) => void;
}) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<WizardFormData>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch available tools from backend
  const [builtinTools, setBuiltinTools] = useState<readonly ToolDefinition[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  const fetchMCPServers = useCustomToolsStore((s) => s.fetchMCPServers);
  const fetchCustomTools = useCustomToolsStore((s) => s.fetchTools);

  useEffect(() => {
    const fetchTools = async () => {
      setToolsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/agents/tools`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setBuiltinTools(data.tools || []);
        }
      } catch {
        // Silently fail — tools list will just be empty
      } finally {
        setToolsLoading(false);
      }
    };

    fetchTools();
    fetchMCPServers();
    fetchCustomTools();
  }, [fetchMCPServers, fetchCustomTools]);

  const updateForm = useCallback((updates: Partial<WizardFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const validateTab = (): boolean => {
    if (tab === 0) {
      if (!form.name.trim()) {
        setError("Agent name is required");
        return false;
      }
    }
    if (tab === 2) {
      if (!form.systemPrompt.trim()) {
        // Auto-generate if empty
        const autoPrompt = generateSystemPrompt(form, builtinTools);
        updateForm({ systemPrompt: autoPrompt });
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateTab()) return;
    setTab((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setTab((prev) => Math.max(prev - 1, 0));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Agent name is required");
      setTab(0);
      return;
    }

    const systemPrompt = form.systemPrompt.trim() || generateSystemPrompt(form, builtinTools);

    setCreating(true);
    try {
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        system_prompt: systemPrompt,
        model: form.model,
        tools: [...form.selectedTools],
        mcp_servers: [...form.selectedMcpServers],
        custom_tools: [...form.selectedCustomTools],
        trigger_mode: form.triggerMode,
        schedule_cron: form.scheduleCron || undefined,
        personality: form.personality || undefined,
        max_iterations: form.maxIterations,
        autonomy_level: form.autonomyLevel,
        temperature: form.temperature,
        office_station_icon: form.icon,
        monthly_budget_usd: form.monthlyBudgetUsd ? parseFloat(form.monthlyBudgetUsd) : undefined,
        daily_execution_limit: form.dailyExecutionLimit ? parseInt(form.dailyExecutionLimit) : undefined,
        cost_this_month: 0,
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
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-display font-bold text-base">Create Agent</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {tab + 1} of 4 — {TAB_LABELS[tab]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-border shrink-0">
          {TAB_LABELS.map((label, i) => {
            const Icon = TAB_ICONS[i];
            const isActive = tab === i;
            const isCompleted = tab > i;

            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (i < tab || validateTab()) setTab(i);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-sq-agent/10 text-sq-agent"
                    : isCompleted
                      ? "text-sq-agent/70 hover:bg-sq-agent/5"
                      : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {isCompleted && !isActive && (
                  <CheckCircle2 className="w-3 h-3 text-sq-agent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mt-3"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 0 && <IdentityTab form={form} onChange={updateForm} />}
              {tab === 1 && (
                <CapabilitiesTab
                  form={form}
                  onChange={updateForm}
                  builtinTools={builtinTools}
                  toolsLoading={toolsLoading}
                />
              )}
              {tab === 2 && (
                <BehaviorTab
                  form={form}
                  onChange={updateForm}
                  builtinTools={builtinTools}
                />
              )}
              {tab === 3 && <ReviewTab form={form} builtinTools={builtinTools} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={tab === 0 ? onClose : handleBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            {tab === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </>
            )}
          </button>

          {tab < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Create Agent
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
