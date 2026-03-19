"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Search,
  Bot,
  ChevronRight,
  AlertCircle,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Agent } from "@/lib/stores/agent-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: string;
  readonly system_prompt: string;
  readonly model: string;
  readonly tools: readonly string[];
  readonly trigger_mode: string;
  readonly personality: string;
  readonly max_iterations: number;
  readonly autonomy_level: number;
  readonly temperature: number;
}

/* ------------------------------------------------------------------ */
/*  Category Colors                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  sales: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  productivity: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  knowledge: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  support: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", border: "border-green-500/20" },
  hr: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
};

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
}

/* ------------------------------------------------------------------ */
/*  Template Card                                                      */
/* ------------------------------------------------------------------ */

function TemplateCard({
  template,
  onSelect,
}: {
  template: AgentTemplate;
  onSelect: () => void;
}) {
  const style = getCategoryStyle(template.category);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col p-4 rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-sq-agent/30 transition-all text-left"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-sq-agent/10 flex items-center justify-center text-lg shrink-0 ring-1 ring-sq-agent/20">
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {template.name}
          </p>
          <span
            className={cn(
              "inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize",
              style.bg,
              style.text,
            )}
          >
            {template.category}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {template.description}
      </p>

      {/* Tools count */}
      <div className="flex items-center gap-1.5 mt-auto">
        <Wrench className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          {template.tools.length} tool{template.tools.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[11px] text-muted-foreground ml-auto capitalize">
          {template.trigger_mode === "mention" ? "@mention" : template.trigger_mode}
        </span>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Detail / Preview                                          */
/* ------------------------------------------------------------------ */

function TemplatePreview({
  template,
  onDeploy,
  onBack,
  deploying,
}: {
  template: AgentTemplate;
  onDeploy: () => void;
  onBack: () => void;
  deploying: boolean;
}) {
  const style = getCategoryStyle(template.category);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <ChevronRight className="w-3 h-3 rotate-180" />
        Back to templates
      </button>

      {/* Header card */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-sq-agent/10 flex items-center justify-center text-xl ring-1 ring-sq-agent/20">
            {template.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {template.name}
            </h3>
            <span
              className={cn(
                "inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize",
                style.bg,
                style.text,
              )}
            >
              {template.category}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{template.description}</p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Model</p>
          <p className="text-xs font-medium text-foreground">{template.model}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trigger</p>
          <p className="text-xs font-medium text-foreground capitalize">
            {template.trigger_mode === "mention" ? "@mention" : template.trigger_mode}
          </p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Autonomy</p>
          <p className="text-xs font-medium text-foreground">Level {template.autonomy_level}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Max Iterations</p>
          <p className="text-xs font-medium text-foreground">{template.max_iterations}</p>
        </div>
      </div>

      {/* Tools */}
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Tools ({template.tools.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {template.tools.map((tool) => (
            <span
              key={tool}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sq-agent/10 text-sq-agent border border-sq-agent/20"
            >
              {tool.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      {/* System prompt */}
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          System Prompt
        </p>
        <p className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-6">
          {template.system_prompt}
        </p>
      </div>

      {/* Deploy button */}
      <button
        type="button"
        onClick={onDeploy}
        disabled={deploying}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sq-agent text-white text-sm font-medium hover:bg-sq-agent/90 transition-colors disabled:opacity-50"
      >
        {deploying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {deploying ? "Deploying..." : "Deploy Agent"}
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentTemplates({
  onDeploy,
  onClose,
}: {
  onDeploy: (agent: Agent) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<readonly AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [deploying, setDeploying] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/templates`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load templates";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ["all", ...Array.from(cats).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (selectedCategory !== "all" && t.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleDeploy = useCallback(async (template: AgentTemplate) => {
    setDeploying(true);
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: template.name,
      description: template.description,
      system_prompt: template.system_prompt,
      model: template.model,
      tools: [...template.tools],
      mcp_servers: [],
      custom_tools: [],
      trigger_mode: template.trigger_mode as Agent["trigger_mode"],
      personality: template.personality,
      max_iterations: template.max_iterations,
      autonomy_level: template.autonomy_level,
      temperature: template.temperature,
      office_station_icon: template.icon,
      status: "idle",
      active: true,
      total_executions: 0,
      total_cost_usd: 0,
      cost_this_month: 0,
      success_rate: 100,
      created_by: getCurrentUserId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onDeploy(newAgent);
    setDeploying(false);
  }, [onDeploy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sq-agent" />
            <h3 className="font-display font-bold text-base">Agent Templates</h3>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {templates.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <AnimatePresence mode="wait">
            {selectedTemplate ? (
              <TemplatePreview
                key="preview"
                template={selectedTemplate}
                onDeploy={() => handleDeploy(selectedTemplate)}
                onBack={() => setSelectedTemplate(null)}
                deploying={deploying}
              />
            ) : (
              <motion.div
                key="gallery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Search + filter */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sq-agent/20"
                    />
                  </div>
                </div>

                {/* Category pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors",
                        selectedCategory === cat
                          ? "bg-sq-agent/10 text-sq-agent"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Loading */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No templates match your search.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => setSelectedTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
