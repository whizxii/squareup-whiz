"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Server,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCustomToolsStore,
  type MCPServer,
} from "@/lib/stores/custom-tools-store";

/* ------------------------------------------------------------------ */
/*  Add Server Form                                                    */
/* ------------------------------------------------------------------ */

interface ServerFormData {
  readonly url: string;
  readonly name: string;
  readonly headerKey: string;
  readonly headerValue: string;
}

const INITIAL_FORM: ServerFormData = {
  url: "",
  name: "",
  headerKey: "",
  headerValue: "",
};

function AddServerForm({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (url: string, name: string, headers?: Record<string, string>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ServerFormData>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof ServerFormData>(key: K, value: ServerFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = () => {
    if (!form.url.trim()) {
      setError("Server URL is required");
      return;
    }
    try {
      new URL(form.url);
    } catch {
      setError("Invalid URL format");
      return;
    }
    setError(null);

    const headers: Record<string, string> =
      form.headerKey.trim() && form.headerValue.trim()
        ? { [form.headerKey.trim()]: form.headerValue.trim() }
        : {};

    onSubmit(
      form.url.trim(),
      form.name.trim() || new URL(form.url.trim()).hostname,
      Object.keys(headers).length > 0 ? headers : undefined
    );
  };

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-background/50">
      {/* URL */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Server URL
        </label>
        <input
          type="url"
          value={form.url}
          onChange={(e) => updateField("url", e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20",
            error ? "border-red-400" : "border-border"
          )}
          placeholder="https://mcp-server.example.com/sse"
        />
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Display name (optional)
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="My GitHub MCP Server"
        />
      </div>

      {/* Optional Auth Header */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Auth header (optional)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={form.headerKey}
            onChange={(e) => updateField("headerKey", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Header name (e.g. Authorization)"
          />
          <input
            type="password"
            value={form.headerValue}
            onChange={(e) => updateField("headerValue", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Header value (e.g. Bearer token...)"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
          disabled={loading || !form.url.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Connect
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Server Card                                                        */
/* ------------------------------------------------------------------ */

function ServerCard({
  server,
  onDisconnect,
}: {
  server: MCPServer;
  onDisconnect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const statusColor =
    server.status === "connected"
      ? "text-green-500"
      : server.status === "error"
        ? "text-red-500"
        : "text-muted-foreground";

  const StatusIcon = server.status === "connected" ? Wifi : WifiOff;

  return (
    <div className="p-3 rounded-xl border border-border bg-background/50 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
          <Server className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {server.name}
          </p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <StatusIcon className={cn("w-3 h-3", statusColor)} />
            <span className={statusColor}>
              {server.status === "connected"
                ? `Connected \u00b7 ${server.tools.length} tool${server.tools.length !== 1 ? "s" : ""}`
                : server.status === "error"
                  ? "Connection error"
                  : "Disconnected"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {server.tools.length > 0 && (
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
          )}
          <button
            type="button"
            onClick={async () => {
              setDisconnecting(true);
              await onDisconnect();
              setDisconnecting(false);
            }}
            disabled={disconnecting}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
          >
            {disconnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {server.error && (
        <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <X className="w-3 h-3 shrink-0" />
            {server.error}
          </p>
        </div>
      )}

      {/* Expanded tools list */}
      <AnimatePresence>
        {expanded && server.tools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Discovered tools:
              </p>
              <div className="grid gap-1">
                {server.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Wrench className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {tool.name}
                      </p>
                      {tool.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function MCPServerManager() {
  const mcpServers = useCustomToolsStore((s) => s.mcpServers);
  const mcpLoading = useCustomToolsStore((s) => s.mcpLoading);
  const mcpError = useCustomToolsStore((s) => s.mcpError);
  const fetchMCPServers = useCustomToolsStore((s) => s.fetchMCPServers);
  const connectMCPServer = useCustomToolsStore((s) => s.connectMCPServer);
  const disconnectMCPServer = useCustomToolsStore((s) => s.disconnectMCPServer);

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMCPServers();
  }, [fetchMCPServers]);

  const handleConnect = async (
    url: string,
    name: string,
    headers?: Record<string, string>
  ) => {
    const result = await connectMCPServer(url, name, headers);
    if (result) setShowForm(false);
  };

  const handleDisconnect = async (serverId: string) => {
    await disconnectMCPServer(serverId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">MCP Servers</p>
          <p className="text-xs text-muted-foreground">
            Connect to Model Context Protocol servers for dynamic tool discovery
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Server
          </button>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {mcpError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
          >
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {mcpError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Server Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AddServerForm
              onSubmit={handleConnect}
              onCancel={() => setShowForm(false)}
              loading={mcpLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Server List */}
      {mcpLoading && mcpServers.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : mcpServers.length === 0 && !showForm ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            No MCP servers connected. Add one to extend your agents with
            external tools.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {mcpServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onDisconnect={() => handleDisconnect(server.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
