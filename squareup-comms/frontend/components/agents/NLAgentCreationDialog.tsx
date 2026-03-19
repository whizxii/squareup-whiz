"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Loader2,
  Bot,
  Wrench,
  Brain,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore, type Agent } from "@/lib/stores/agent-store";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GeneratedConfig {
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  tools: string[];
  trigger_mode: string;
  personality: string;
  max_iterations: number;
  autonomy_level: number;
  temperature: number;
}

type Step = "describe" | "generating" | "review" | "saving" | "done" | "error";

interface NLAgentCreationDialogProps {
  open: boolean;
  onClose: () => void;
  initialDescription?: string;
}

export function NLAgentCreationDialog({
  open,
  onClose,
  initialDescription = "",
}: NLAgentCreationDialogProps) {
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState(initialDescription);
  const [config, setConfig] = useState<GeneratedConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addAgent = useAgentStore((s) => s.addAgent);
  const router = useRouter();

  const reset = useCallback(() => {
    setStep("describe");
    setDescription(initialDescription);
    setConfig(null);
    setError(null);
    setShowAdvanced(false);
  }, [initialDescription]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim() || description.trim().length < 5) return;

    setStep("generating");
    setError(null);

    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ description: description.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Failed to generate: ${res.status}`);
      }

      const generated: GeneratedConfig = await res.json();
      setConfig(generated);
      setStep("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate agent config";
      setError(message);
      setStep("error");
    }
  }, [description]);

  const handleSave = useCallback(async () => {
    if (!config) return;

    setStep("saving");

    try {
      const agentPayload: Agent = {
        id: crypto.randomUUID(),
        name: config.name,
        description: config.description,
        system_prompt: config.system_prompt,
        model: config.model,
        tools: config.tools,
        mcp_servers: [],
        custom_tools: [],
        trigger_mode: config.trigger_mode as Agent["trigger_mode"],
        personality: config.personality,
        max_iterations: config.max_iterations,
        autonomy_level: config.autonomy_level,
        temperature: config.temperature,
        status: "idle",
        active: true,
        total_executions: 0,
        total_cost_usd: 0,
        success_rate: 100,
        cost_this_month: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await addAgent(agentPayload);
      setStep("done");

      // Navigate to agents page after a brief delay
      setTimeout(() => {
        handleClose();
        router.push("/agents");
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save agent";
      setError(message);
      setStep("error");
    }
  }, [config, addAgent, handleClose, router]);

  const updateConfig = useCallback(
    (field: keyof GeneratedConfig, value: GeneratedConfig[keyof GeneratedConfig]) => {
      if (!config) return;
      setConfig({ ...config, [field]: value });
    },
    [config],
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Create Agent with AI</h2>
                  <p className="text-[11px] text-muted-foreground">Describe what you need, we'll configure everything</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Step: Describe */}
              {(step === "describe" || step === "error") && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      What should this agent do?
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. An agent that manages our sales pipeline, finds stale deals, and drafts follow-up emails..."
                      className="w-full h-28 px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      autoFocus
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Be specific about the tasks, tools, and behavior you want.
                    </p>
                  </div>

                  {step === "error" && error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Example prompts */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground font-medium">Try these:</p>
                    {EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example}
                        onClick={() => setDescription(example)}
                        className="block w-full text-left px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors truncate"
                      >
                        &quot;{example}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step: Generating */}
              {step === "generating" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Generating agent config...</p>
                  <p className="text-xs text-muted-foreground">AI is selecting tools and writing the system prompt</p>
                </div>
              )}

              {/* Step: Review */}
              {step === "review" && config && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Name & Description */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Name</label>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => updateConfig("name", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Description</label>
                      <input
                        type="text"
                        value={config.description}
                        onChange={(e) => updateConfig("description", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  {/* Tools */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Tools ({config.tools.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {config.tools.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
                        >
                          {tool.replace(/_/g, " ")}
                        </span>
                      ))}
                      {config.tools.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">No tools selected</span>
                      )}
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-muted-foreground">System Prompt</span>
                    </div>
                    <textarea
                      value={config.system_prompt}
                      onChange={(e) => updateConfig("system_prompt", e.target.value)}
                      className="w-full h-24 px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Advanced Settings (collapsible) */}
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Advanced Settings
                  </button>

                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Model</label>
                          <select
                            value={config.model}
                            onChange={(e) => updateConfig("model", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                            <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Trigger</label>
                          <select
                            value={config.trigger_mode}
                            onChange={(e) => updateConfig("trigger_mode", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="mention">@mention</option>
                            <option value="auto">Auto-respond</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Autonomy Level ({config.autonomy_level})
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={4}
                            value={config.autonomy_level}
                            onChange={(e) => updateConfig("autonomy_level", parseInt(e.target.value))}
                            className="w-full accent-primary"
                          />
                          <div className="flex justify-between text-[9px] text-muted-foreground/60">
                            <span>Ask all</span>
                            <span>Full auto</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                            Temperature ({config.temperature})
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={Math.round(config.temperature * 10)}
                            onChange={(e) => updateConfig("temperature", parseInt(e.target.value) / 10)}
                            className="w-full accent-primary"
                          />
                          <div className="flex justify-between text-[9px] text-muted-foreground/60">
                            <span>Precise</span>
                            <span>Creative</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Max Iterations: {config.max_iterations}
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={20}
                          value={config.max_iterations}
                          onChange={(e) => updateConfig("max_iterations", parseInt(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step: Saving */}
              {step === "saving" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">Creating agent...</p>
                </div>
              )}

              {/* Step: Done */}
              {step === "done" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Agent created!</p>
                  <p className="text-xs text-muted-foreground">Redirecting to agents page...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {(step === "describe" || step === "error" || step === "review") && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
                <button
                  onClick={step === "review" ? () => setStep("describe") : handleClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {step === "review" ? "Back" : "Cancel"}
                </button>

                {(step === "describe" || step === "error") && (
                  <button
                    onClick={handleGenerate}
                    disabled={!description.trim() || description.trim().length < 5}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      description.trim().length >= 5
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </button>
                )}

                {step === "review" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                    >
                      <Bot className="w-3 h-3" />
                      Create Agent
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const EXAMPLE_PROMPTS = [
  "A sales assistant that tracks deals and drafts follow-up emails",
  "A task manager that creates tasks from chat messages and assigns them",
  "A daily standup bot that collects updates every morning",
  "A research agent that summarizes CRM interactions for any contact",
];
