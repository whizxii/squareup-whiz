"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Pencil,
  TestTube2,
  Globe,
  Webhook,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileJson2,
  Import,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCustomToolsStore,
  type CustomTool,
  type CustomToolFormData,
  type OpenAPIImportResult,
} from "@/lib/stores/custom-tools-store";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "general",
  "crm",
  "productivity",
  "communication",
  "analytics",
  "external",
] as const;

const EMPTY_HTTP_CONFIG = JSON.stringify(
  {
    url_template: "https://api.example.com/endpoint?q={query}",
    method: "GET",
    headers: {},
    body_template: null,
  },
  null,
  2
);

const EMPTY_WEBHOOK_CONFIG = JSON.stringify(
  {
    webhook_url: "https://your-n8n.com/webhook/abc123",
    secret_header: "X-Webhook-Secret",
    secret_value: "",
  },
  null,
  2
);

const EMPTY_INPUT_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
  },
  null,
  2
);

const INITIAL_FORM: CustomToolFormData = {
  name: "",
  display_name: "",
  description: "",
  tool_type: "http",
  category: "general",
  input_schema: EMPTY_INPUT_SCHEMA,
  config: EMPTY_HTTP_CONFIG,
  requires_confirmation: false,
  is_shared: false,
};

/* ------------------------------------------------------------------ */
/*  Tool Form                                                          */
/* ------------------------------------------------------------------ */

function ToolForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: CustomToolFormData;
  onSubmit: (data: CustomToolFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<CustomToolFormData>(initial);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const testTool = useCustomToolsStore((s) => s.testTool);
  const testResult = useCustomToolsStore((s) => s.testResult);
  const testLoading = useCustomToolsStore((s) => s.testLoading);
  const clearTestResult = useCustomToolsStore((s) => s.clearTestResult);

  const updateField = useCallback(
    <K extends keyof CustomToolFormData>(key: K, value: CustomToolFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleToolTypeChange = useCallback(
    (type: "http" | "webhook") => {
      const newConfig = type === "http" ? EMPTY_HTTP_CONFIG : EMPTY_WEBHOOK_CONFIG;
      setForm((prev) => ({ ...prev, tool_type: type, config: newConfig }));
    },
    []
  );

  const validateJson = (value: string, setter: (e: string | null) => void): boolean => {
    try {
      JSON.parse(value);
      setter(null);
      return true;
    } catch {
      setter("Invalid JSON");
      return false;
    }
  };

  const handleSubmit = () => {
    const schemaValid = validateJson(form.input_schema, setSchemaError);
    const configValid = validateJson(form.config, setConfigError);
    if (!schemaValid || !configValid) return;
    if (!form.name.trim() || !form.display_name.trim()) return;
    onSubmit(form);
  };

  const handleTest = async () => {
    if (!validateJson(form.config, setConfigError)) return;
    clearTestResult();
    await testTool(JSON.parse(form.config));
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-background/50">
      {/* Name + Display Name */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tool name (snake_case)
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) =>
              updateField(
                "name",
                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_")
              )
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="get_weather"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Display name
          </label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => updateField("display_name", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Get Weather"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Description (shown to the AI)
        </label>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder="Gets the current weather for a given city..."
        />
      </div>

      {/* Type + Category */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tool type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleToolTypeChange("http")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                form.tool_type === "http"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              HTTP Request
            </button>
            <button
              type="button"
              onClick={() => handleToolTypeChange("webhook")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                form.tool_type === "webhook"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Webhook className="w-3.5 h-3.5" />
              Webhook
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Config JSON */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {form.tool_type === "http" ? "HTTP Config" : "Webhook Config"} (JSON)
        </label>
        <textarea
          value={form.config}
          onChange={(e) => {
            updateField("config", e.target.value);
            if (configError) validateJson(e.target.value, setConfigError);
          }}
          rows={5}
          className={cn(
            "w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none",
            configError ? "border-red-400" : "border-border"
          )}
        />
        {configError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {configError}
          </p>
        )}
      </div>

      {/* Input Schema JSON */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Input schema (JSON Schema for tool parameters)
        </label>
        <textarea
          value={form.input_schema}
          onChange={(e) => {
            updateField("input_schema", e.target.value);
            if (schemaError) validateJson(e.target.value, setSchemaError);
          }}
          rows={5}
          className={cn(
            "w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none",
            schemaError ? "border-red-400" : "border-border"
          )}
        />
        {schemaError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {schemaError}
          </p>
        )}
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.requires_confirmation}
            onChange={(e) =>
              updateField("requires_confirmation", e.target.checked)
            }
            className="rounded border-border"
          />
          <span className="text-muted-foreground">Require confirmation</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_shared}
            onChange={(e) => updateField("is_shared", e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-muted-foreground">Shared with team</span>
        </label>
      </div>

      {/* Test Result */}
      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "p-3 rounded-lg border text-sm overflow-hidden",
              testResult.success
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {testResult.success ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">
                {testResult.success ? "Test passed" : "Test failed"}
              </span>
              {testResult.status_code && (
                <span className="text-xs text-muted-foreground">
                  HTTP {testResult.status_code}
                </span>
              )}
            </div>
            {testResult.error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {testResult.error}
              </p>
            )}
            {testResult.output != null && (
              <pre className="text-xs text-muted-foreground mt-1 max-h-24 overflow-auto">
                {typeof testResult.output === "string"
                  ? testResult.output
                  : JSON.stringify(testResult.output, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleTest}
          disabled={testLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {testLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <TestTube2 className="w-3.5 h-3.5" />
          )}
          Test
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!form.name.trim() || !form.display_name.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool Card                                                          */
/* ------------------------------------------------------------------ */

function ToolCard({
  tool,
  onEdit,
  onDelete,
}: {
  tool: CustomTool;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="p-3 rounded-xl border border-border bg-background/50 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            tool.tool_type === "http"
              ? "bg-blue-500/10 text-blue-500"
              : tool.tool_type === "openapi"
              ? "bg-purple-500/10 text-purple-500"
              : "bg-orange-500/10 text-orange-500"
          )}
        >
          {tool.tool_type === "http" ? (
            <Globe className="w-4 h-4" />
          ) : tool.tool_type === "openapi" ? (
            <FileJson2 className="w-4 h-4" />
          ) : (
            <Webhook className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {tool.display_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {tool.tool_type.toUpperCase()} &middot; {tool.category}
            {tool.is_shared && " \u00b7 Shared"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={async () => {
              setDeleting(true);
              await onDelete();
              setDeleting(false);
            }}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground">
                {tool.description}
              </p>
              <div className="text-xs">
                <span className="font-medium text-muted-foreground">
                  Tool name:{" "}
                </span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {tool.name}
                </code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OpenAPI Importer                                                   */
/* ------------------------------------------------------------------ */

function OpenAPIImporter({
  onImport,
  importResult,
  loading,
  onClose,
}: {
  onImport: (req: {
    url?: string;
    auth_header?: Record<string, string>;
    category?: string;
    max_tools?: number;
  }) => Promise<OpenAPIImportResult | null>;
  importResult: OpenAPIImportResult | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [specUrl, setSpecUrl] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [authValue, setAuthValue] = useState("");
  const [category, setCategory] = useState("external");
  const [maxTools, setMaxTools] = useState(50);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!specUrl.trim()) {
      setError("Please enter an OpenAPI spec URL");
      return;
    }
    setError(null);
    const authHeader =
      authKey.trim() && authValue.trim()
        ? { [authKey.trim()]: authValue.trim() }
        : undefined;
    const result = await onImport({
      url: specUrl.trim(),
      auth_header: authHeader,
      category,
      max_tools: maxTools,
    });
    if (!result) {
      setError("Import failed. Check the URL and try again.");
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
      <div className="flex items-center gap-2">
        <FileJson2 className="w-4 h-4 text-purple-500" />
        <p className="text-sm font-medium text-foreground">
          Import from OpenAPI Spec
        </p>
      </div>

      {/* Spec URL */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          OpenAPI Spec URL
        </label>
        <input
          type="url"
          value={specUrl}
          onChange={(e) => setSpecUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          placeholder="https://api.example.com/openapi.json"
        />
      </div>

      {/* Auth Header (optional) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Auth Header (optional)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            placeholder="Header name (e.g. Authorization)"
          />
          <input
            type="password"
            value={authValue}
            onChange={(e) => setAuthValue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            placeholder="Header value (e.g. Bearer xxx)"
          />
        </div>
      </div>

      {/* Category + Max Tools */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Max tools to import
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={maxTools}
            onChange={(e) =>
              setMaxTools(Math.max(1, Math.min(200, Number(e.target.value) || 50)))
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* Import Result */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "p-3 rounded-lg border text-sm",
                importResult.imported > 0
                  ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                  : "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {importResult.imported > 0 ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="font-medium">
                  {importResult.imported > 0
                    ? `Imported ${importResult.imported} tool${importResult.imported !== 1 ? "s" : ""}`
                    : "No tools imported"}
                </span>
              </div>
              {importResult.api_title && (
                <p className="text-xs text-muted-foreground mb-1">
                  API: {importResult.api_title}
                  {importResult.api_version
                    ? ` v${importResult.api_version}`
                    : ""}
                </p>
              )}
              {importResult.tools && importResult.tools.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
                  {importResult.tools.map((t) => (
                    <li key={t.id} className="flex items-center gap-1.5">
                      <FileJson2 className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="font-medium text-foreground">
                        {t.display_name}
                      </span>
                      <span className="truncate">{t.description}</span>
                    </li>
                  ))}
                </ul>
              )}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-red-600 mb-1">
                    Errors:
                  </p>
                  <ul className="text-xs text-red-500 space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importResult.skipped && importResult.skipped.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {importResult.skipped.length} operation
                  {importResult.skipped.length !== 1 ? "s" : ""} skipped
                  (filtered out)
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={loading || !specUrl.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Import className="w-3.5 h-3.5" />
          )}
          Import Tools
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CustomToolBuilder() {
  const tools = useCustomToolsStore((s) => s.tools);
  const toolsLoading = useCustomToolsStore((s) => s.toolsLoading);
  const fetchTools = useCustomToolsStore((s) => s.fetchTools);
  const createTool = useCustomToolsStore((s) => s.createTool);
  const updateTool = useCustomToolsStore((s) => s.updateTool);
  const deleteTool = useCustomToolsStore((s) => s.deleteTool);
  const importOpenAPI = useCustomToolsStore((s) => s.importOpenAPI);
  const importLoading = useCustomToolsStore((s) => s.importLoading);

  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [importResult, setImportResult] = useState<OpenAPIImportResult | null>(null);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleCreate = async (data: CustomToolFormData) => {
    const result = await createTool(data);
    if (result) setShowForm(false);
  };

  const handleUpdate = async (data: CustomToolFormData) => {
    if (!editingTool) return;
    const success = await updateTool(editingTool.id, data);
    if (success) setEditingTool(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTool(id);
  };

  const editFormData = editingTool
    ? {
        name: editingTool.name,
        display_name: editingTool.display_name,
        description: editingTool.description,
        tool_type: editingTool.tool_type,
        category: editingTool.category,
        input_schema: JSON.stringify(editingTool.input_schema, null, 2),
        config: JSON.stringify(editingTool.config, null, 2),
        requires_confirmation: editingTool.requires_confirmation,
        is_shared: editingTool.is_shared,
      }
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Custom Tools</p>
          <p className="text-xs text-muted-foreground">
            Create HTTP/webhook tools or import from OpenAPI specs
          </p>
        </div>
        {!showForm && !editingTool && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowImporter(!showImporter);
                setShowForm(false);
                setImportResult(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                showImporter
                  ? "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Import className="w-3.5 h-3.5" />
              Import OpenAPI
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setShowImporter(false);
                setImportResult(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Tool
            </button>
          </div>
        )}
      </div>

      {/* OpenAPI Importer */}
      <AnimatePresence>
        {showImporter && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <OpenAPIImporter
              onImport={async (req) => {
                const result = await importOpenAPI(req);
                setImportResult(result);
                return result;
              }}
              importResult={importResult}
              loading={importLoading}
              onClose={() => {
                setShowImporter(false);
                setImportResult(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ToolForm
              initial={INITIAL_FORM}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitLabel="Create Tool"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Form */}
      <AnimatePresence>
        {editingTool && editFormData && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ToolForm
              initial={editFormData}
              onSubmit={handleUpdate}
              onCancel={() => setEditingTool(null)}
              submitLabel="Update Tool"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool List */}
      {toolsLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : tools.length === 0 && !showForm ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            No custom tools yet. Create one to give your agents superpowers.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={() => {
                setShowForm(false);
                setEditingTool(tool);
              }}
              onDelete={() => handleDelete(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
