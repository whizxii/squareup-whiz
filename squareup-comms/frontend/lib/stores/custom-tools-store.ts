import { create } from "zustand";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CustomTool {
  readonly id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description: string;
  readonly tool_type: "http" | "webhook" | "openapi";
  readonly category: string;
  readonly input_schema: Record<string, unknown>;
  readonly config: Record<string, unknown>;
  readonly requires_confirmation: boolean;
  readonly is_shared: boolean;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CustomToolFormData {
  readonly name: string;
  readonly display_name: string;
  readonly description: string;
  readonly tool_type: "http" | "webhook" | "openapi";
  readonly category: string;
  readonly input_schema: string; // JSON string
  readonly config: string; // JSON string
  readonly requires_confirmation: boolean;
  readonly is_shared: boolean;
}

export interface MCPServer {
  readonly id: string;
  readonly url: string;
  readonly name: string;
  readonly status: "connected" | "error" | "disconnected";
  readonly tools: readonly MCPTool[];
  readonly connected_at?: string;
  readonly error?: string;
}

export interface MCPTool {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
}

export interface TestResult {
  readonly success: boolean;
  readonly output?: unknown;
  readonly error?: string;
  readonly status_code?: number;
}

export interface OpenAPIImportRequest {
  readonly url?: string;
  readonly spec?: Record<string, unknown>;
  readonly base_url_override?: string;
  readonly auth_header?: Record<string, string>;
  readonly category?: string;
  readonly filter_tags?: readonly string[];
  readonly max_tools?: number;
}

export interface OpenAPIImportResult {
  readonly imported: number;
  readonly tools?: readonly { id: string; name: string; display_name: string; description: string }[];
  readonly skipped?: readonly string[];
  readonly errors?: readonly string[];
  readonly api_title?: string;
  readonly api_version?: string;
  readonly base_url?: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface CustomToolsState {
  // Custom tools
  tools: readonly CustomTool[];
  toolsLoading: boolean;
  toolsError: string | null;

  // MCP servers
  mcpServers: readonly MCPServer[];
  mcpLoading: boolean;
  mcpError: string | null;

  // Test state
  testResult: TestResult | null;
  testLoading: boolean;

  // Custom tool actions
  fetchTools: () => Promise<void>;
  createTool: (data: CustomToolFormData) => Promise<CustomTool | null>;
  updateTool: (id: string, data: Partial<CustomToolFormData>) => Promise<boolean>;
  deleteTool: (id: string) => Promise<boolean>;
  testTool: (config: Record<string, unknown>) => Promise<TestResult>;
  clearTestResult: () => void;

  // OpenAPI import
  importOpenAPI: (req: OpenAPIImportRequest) => Promise<OpenAPIImportResult | null>;
  importLoading: boolean;

  // MCP server actions
  fetchMCPServers: () => Promise<void>;
  connectMCPServer: (url: string, name: string, headers?: Record<string, string>) => Promise<MCPServer | null>;
  disconnectMCPServer: (serverId: string) => Promise<boolean>;
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  return { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };
}

export const useCustomToolsStore = create<CustomToolsState>((set) => ({
  tools: [],
  toolsLoading: false,
  toolsError: null,
  mcpServers: [],
  mcpLoading: false,
  mcpError: null,
  testResult: null,
  testLoading: false,
  importLoading: false,

  /* ---- Custom Tool CRUD ---- */

  fetchTools: async () => {
    set({ toolsLoading: true, toolsError: null });
    try {
      const res = await fetch(`${API_URL}/api/custom-tools/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch tools: ${res.status}`);
      const data = await res.json();
      const tools = data.data?.tools ?? data.tools ?? data ?? [];
      set({ tools, toolsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch tools";
      set({ toolsLoading: false, toolsError: message });
    }
  },

  createTool: async (data) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-tools/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          display_name: data.display_name,
          description: data.description,
          tool_type: data.tool_type,
          category: data.category,
          input_schema: data.input_schema,
          config: data.config,
          requires_confirmation: data.requires_confirmation,
          is_shared: data.is_shared,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Create failed" }));
        throw new Error(err.detail || `Create failed: ${res.status}`);
      }
      const result = await res.json();
      const tool = result.data?.tool ?? result.tool ?? result;
      set((s) => ({ tools: [...s.tools, tool] }));
      return tool;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create tool";
      set({ toolsError: message });
      return null;
    }
  },

  updateTool: async (id, data) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-tools/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      const result = await res.json();
      const updated = result.data?.tool ?? result.tool ?? result;
      set((s) => ({
        tools: s.tools.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update tool";
      set({ toolsError: message });
      return false;
    }
  },

  deleteTool: async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-tools/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      set((s) => ({ tools: s.tools.filter((t) => t.id !== id) }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete tool";
      set({ toolsError: message });
      return false;
    }
  },

  testTool: async (config) => {
    set({ testLoading: true, testResult: null });
    try {
      const res = await fetch(`${API_URL}/api/custom-tools/test`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      const result = await res.json();
      const testResult: TestResult = {
        success: result.data?.success ?? result.success ?? res.ok,
        output: result.data?.output ?? result.output,
        error: result.data?.error ?? result.error,
        status_code: result.data?.status_code ?? result.status_code,
      };
      set({ testResult, testLoading: false });
      return testResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      const testResult: TestResult = { success: false, error: message };
      set({ testResult, testLoading: false });
      return testResult;
    }
  },

  clearTestResult: () => set({ testResult: null }),

  /* ---- OpenAPI Import ---- */

  importOpenAPI: async (req) => {
    set({ importLoading: true, toolsError: null });
    try {
      const res = await fetch(`${API_URL}/api/custom-tools/import-openapi`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Import failed" }));
        throw new Error(err.detail || `Import failed: ${res.status}`);
      }
      const result = await res.json();
      const data: OpenAPIImportResult = result.data ?? result;
      // Refresh tool list after import
      if (data.imported > 0) {
        const refreshRes = await fetch(`${API_URL}/api/custom-tools/`, {
          headers: getAuthHeaders(),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const tools = refreshData.data?.tools ?? refreshData.tools ?? refreshData ?? [];
          set({ tools, importLoading: false });
        } else {
          set({ importLoading: false });
        }
      } else {
        set({ importLoading: false });
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      set({ importLoading: false, toolsError: message });
      return null;
    }
  },

  /* ---- MCP Server actions ---- */

  fetchMCPServers: async () => {
    set({ mcpLoading: true, mcpError: null });
    try {
      const res = await fetch(`${API_URL}/api/mcp/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch MCP servers: ${res.status}`);
      const data = await res.json();
      const servers = data.data?.servers ?? data.servers ?? data ?? [];
      set({ mcpServers: servers, mcpLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch MCP servers";
      set({ mcpLoading: false, mcpError: message });
    }
  },

  connectMCPServer: async (url, name, headers) => {
    set({ mcpLoading: true, mcpError: null });
    try {
      const res = await fetch(`${API_URL}/api/mcp/connect`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url, name, headers: headers ?? {} }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Connect failed" }));
        throw new Error(err.detail || `Connect failed: ${res.status}`);
      }
      const result = await res.json();
      const server = result.data ?? result;
      set((s) => ({ mcpServers: [...s.mcpServers, server], mcpLoading: false }));
      return server;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      set({ mcpLoading: false, mcpError: message });
      return null;
    }
  },

  disconnectMCPServer: async (serverId) => {
    try {
      const res = await fetch(`${API_URL}/api/mcp/${serverId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
      set((s) => ({
        mcpServers: s.mcpServers.filter((srv) => srv.id !== serverId),
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect";
      set({ mcpError: message });
      return false;
    }
  },
}));
