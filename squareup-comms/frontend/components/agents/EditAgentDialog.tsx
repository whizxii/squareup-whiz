"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bot,
  Save,
  AlertCircle,
  Loader2,
  Shield,
  Thermometer,
  Repeat,
  DollarSign,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Agent, useAgentStore } from "@/lib/stores/agent-store";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ICON_OPTIONS = [
  "🤖", "📊", "📅", "🐙", "⏰", "🔍", "📝", "💬", "📧",
  "🎯", "🧠", "⚡", "🛠️", "💡", "🚀", "🔒",
] as const;

const MODEL_OPTIONS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Free tier — fastest response" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "Best balance of speed and quality" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", desc: "Maximum reasoning depth" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Fast and cost-effective" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "Open source via Groq" },
] as const;

const TRIGGER_MODES = [
  { id: "mention" as const, label: "When @mentioned", desc: "Responds when mentioned in a message" },
  { id: "auto" as const, label: "Auto-respond", desc: "Monitors channel and responds automatically" },
  { id: "scheduled" as const, label: "Scheduled", desc: "Runs on a cron schedule" },
  { id: "webhook" as const, label: "Webhook", desc: "Triggered via external webhook" },
] as const;

const AUTONOMY_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: "Ask before all actions", desc: "Requests confirmation for every tool call" },
  2: { label: "Ask for writes", desc: "Auto-execute reads, confirm writes/mutations" },
  3: { label: "Ask for destructive", desc: "Auto-execute most actions, confirm destructive ones" },
  4: { label: "Full auto", desc: "Executes all tools without confirmation" },
};

/* ------------------------------------------------------------------ */
/*  Form Data                                                          */
/* ------------------------------------------------------------------ */

interface EditFormData {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly systemPrompt: string;
  readonly model: string;
  readonly triggerMode: "mention" | "auto" | "scheduled" | "webhook";
  readonly scheduleCron: string;
  readonly temperature: number;
  readonly maxIterations: number;
  readonly autonomyLevel: number;
  readonly monthlyBudgetUsd: string;
  readonly dailyExecutionLimit: string;
}

function agentToForm(agent: Agent): EditFormData {
  return {
    name: agent.name,
    description: agent.description ?? "",
    icon: agent.office_station_icon ?? "🤖",
    systemPrompt: agent.system_prompt,
    model: agent.model,
    triggerMode: agent.trigger_mode,
    scheduleCron: agent.schedule_cron ?? "",
    temperature: agent.temperature,
    maxIterations: agent.max_iterations,
    autonomyLevel: agent.autonomy_level,
    monthlyBudgetUsd: agent.monthly_budget_usd != null ? String(agent.monthly_budget_usd) : "",
    dailyExecutionLimit: agent.daily_execution_limit != null ? String(agent.daily_execution_limit) : "",
  };
}

/* ------------------------------------------------------------------ */
/*  Section Components                                                 */
/* ------------------------------------------------------------------ */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dialog                                                        */
/* ------------------------------------------------------------------ */

export default function EditAgentDialog({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const persistAgentUpdate = useAgentStore((s) => s.persistAgentUpdate);

  const [form, setForm] = useState<EditFormData>(() => agentToForm(agent));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateForm = useCallback((updates: Partial<EditFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Agent name is required");
      return;
    }

    setSaving(true);
    try {
      await persistAgentUpdate(agent.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        office_station_icon: form.icon,
        system_prompt: form.systemPrompt,
        model: form.model,
        trigger_mode: form.triggerMode,
        schedule_cron: form.scheduleCron || undefined,
        temperature: form.temperature,
        max_iterations: form.maxIterations,
        autonomy_level: form.autonomyLevel,
        monthly_budget_usd: form.monthlyBudgetUsd ? parseFloat(form.monthlyBudgetUsd) : undefined,
        daily_execution_limit: form.dailyExecutionLimit ? parseInt(form.dailyExecutionLimit, 10) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sq-agent/10 flex items-center justify-center text-xl">
              {form.icon}
            </div>
            <div>
              <h3 className="font-display font-bold text-base">Edit Agent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {agent.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin space-y-6">
          {/* Identity Section */}
          <div>
            <SectionHeader title="Identity" />
            <div className="space-y-4">
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
                      onClick={() => updateForm({ icon: ic })}
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                        form.icon === ic
                          ? "bg-sq-agent/10 ring-2 ring-sq-agent scale-110"
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
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="Agent name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
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
                  onChange={(e) => updateForm({ description: e.target.value })}
                  placeholder="What does this agent do?"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
                />
              </div>
            </div>
          </div>

          {/* Behavior Section */}
          <div>
            <SectionHeader title="Behavior" subtitle="Configure how the agent thinks and acts" />
            <div className="space-y-4">
              {/* System Prompt */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  System Prompt
                </label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => updateForm({ systemPrompt: e.target.value })}
                  placeholder="Instructions for the agent..."
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30 resize-none font-mono"
                />
              </div>

              {/* Model */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateForm({ model: m.id })}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg border transition-colors",
                        form.model === m.id
                          ? "border-sq-agent bg-sq-agent/5 text-sq-agent"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <p className="text-xs font-medium">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Mode */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Trigger Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_MODES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateForm({ triggerMode: t.id })}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg border transition-colors",
                        form.triggerMode === t.id
                          ? "border-sq-agent bg-sq-agent/5 text-sq-agent"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <p className="text-xs font-medium">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule cron (shown only for scheduled) */}
              {form.triggerMode === "scheduled" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" />
                    Cron Schedule
                  </label>
                  <input
                    type="text"
                    value={form.scheduleCron}
                    onChange={(e) => updateForm({ scheduleCron: e.target.value })}
                    placeholder="0 9 * * 1-5 (weekdays at 9am)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
                  />
                </div>
              )}

              {/* Autonomy Level */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Autonomy Level — {AUTONOMY_LABELS[form.autonomyLevel]?.label}
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={form.autonomyLevel}
                  onChange={(e) => updateForm({ autonomyLevel: parseInt(e.target.value, 10) })}
                  className="w-full accent-sq-agent"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {AUTONOMY_LABELS[form.autonomyLevel]?.desc}
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  Temperature — {form.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => updateForm({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-sq-agent"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Max Iterations */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Max Iterations
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.maxIterations}
                  onChange={(e) => updateForm({ maxIterations: parseInt(e.target.value, 10) || 5 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20 focus:border-sq-agent/30"
                />
              </div>
            </div>
          </div>

          {/* Limits Section */}
          <div>
            <SectionHeader title="Cost Controls" subtitle="Prevent runaway spending. Leave blank for unlimited." />
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
                  onChange={(e) => updateForm({ monthlyBudgetUsd: e.target.value })}
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
                  onChange={(e) => updateForm({ dailyExecutionLimit: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
