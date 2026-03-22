import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useAuthStore } from "@/lib/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AgentResponse {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_config: string | null;
  description: string | null;
  system_prompt: string;
  model: string;
  tools: string;
  mcp_servers: string;
  custom_tools: string | null;
  trigger_mode: "mention" | "auto" | "scheduled" | "webhook";
  schedule_cron: string | null;
  personality: string | null;
  max_iterations: number;
  autonomy_level: number;
  temperature: number;
  office_x: number | null;
  office_y: number | null;
  office_station_icon: string | null;
  status: string;
  current_task: string | null;
  active: boolean;
  total_executions: number;
  total_cost_usd: number;
  success_rate: number;
  monthly_budget_usd: number | null;
  daily_execution_limit: number | null;
  cost_this_month: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentStatus = "idle" | "thinking" | "working" | "tool_calling" | "awaiting_confirmation" | "error" | "offline";

export interface Agent {
  id: string;
  name: string;
  avatar_url?: string;
  avatar_config?: Record<string, unknown>;
  description?: string;
  system_prompt: string;
  model: string;
  tools: string[];
  mcp_servers: string[];
  custom_tools: string[];
  trigger_mode: "mention" | "auto" | "scheduled" | "webhook";
  schedule_cron?: string;
  personality?: string;
  max_iterations: number;
  autonomy_level: number;
  temperature: number;
  office_x?: number;
  office_y?: number;
  office_station_icon?: string;
  status: AgentStatus;
  current_task?: string;
  active: boolean;
  total_executions: number;
  total_cost_usd: number;
  success_rate: number;
  monthly_budget_usd?: number;
  daily_execution_limit?: number;
  cost_this_month: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  agent_id: string;
  trigger_message_id?: string;
  trigger_channel_id?: string;
  tools_called: ToolCall[];
  response_text?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  num_tool_calls: number;
  status: "success" | "error" | "timeout" | "cancelled";
  error_message?: string;
  created_at: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  duration_ms: number;
  success: boolean;
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: string;
  status?: "sending" | "thinking" | "done" | "error";
}

// ─── Streaming Types ──────────────────────────────────────────────

export type ActiveToolCallStatus = "running" | "success" | "error";

export interface ActiveToolCall {
  readonly toolName: string;
  readonly inputPreview: string;
  readonly status: ActiveToolCallStatus;
  readonly outputPreview?: string;
  readonly startedAt: string;
}

export interface StreamingMessage {
  readonly messageId: string;
  readonly agentId: string;
  readonly channelId: string;
  readonly text: string;
  readonly toolCalls: readonly ActiveToolCall[];
  readonly startedAt: string;
}

// ─── Progress Types ─────────────────────────────────────────────

export interface AgentProgress {
  readonly channelId: string;
  readonly agentId: string;
  readonly current: number;
  readonly total: number;
  readonly description?: string;
  readonly percent: number;
  readonly updatedAt: string;
}

// ─── Confirmation Types ──────────────────────────────────────────

export interface ConfirmationRequest {
  readonly requestId: string;
  readonly channelId: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly receivedAt: string;
}

// ─── Store ─────────────────────────────────────────────────────────
interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  chatMessages: Record<string, AgentChatMessage[]>;
  loading: boolean;
  error: string | null;

  // Streaming state — keyed by "channelId:agentId"
  streamingMessages: Record<string, StreamingMessage>;

  // Progress state — keyed by "channelId:agentId"
  agentProgress: Record<string, AgentProgress>;

  // Confirmation state — keyed by requestId
  pendingConfirmations: Record<string, ConfirmationRequest>;

  fetchAgents: () => Promise<void>;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  persistAgentUpdate: (id: string, updates: Partial<Agent>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  setSelectedAgent: (id: string | null) => void;
  addChatMessage: (agentId: string, message: AgentChatMessage) => void;
  setChatMessages: (agentId: string, messages: AgentChatMessage[]) => void;
  updateChatMessage: (agentId: string, messageId: string, updates: Partial<AgentChatMessage>) => void;

  // Streaming actions
  upsertStreamingDelta: (channelId: string, agentId: string, messageId: string, delta: string) => void;
  addActiveToolCall: (channelId: string, agentId: string, toolName: string, inputPreview: string) => void;
  resolveToolCall: (channelId: string, agentId: string, toolName: string, success: boolean, outputPreview: string) => void;
  finalizeStreamingMessage: (channelId: string, agentId: string) => void;
  clearStreamingMessage: (channelId: string, agentId: string) => void;

  // Progress actions
  updateProgress: (channelId: string, agentId: string, current: number, total: number, description?: string) => void;
  clearProgress: (channelId: string, agentId: string) => void;

  // Confirmation actions
  addConfirmation: (confirmation: ConfirmationRequest) => void;
  removeConfirmation: (requestId: string) => void;
  clearConfirmationsForAgent: (agentId: string) => void;
}

function streamKey(channelId: string, agentId: string): string {
  return `${channelId}:${agentId}`;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapAgentResponse(r: AgentResponse): Agent {
  return {
    id: r.id,
    name: r.name,
    avatar_url: r.avatar_url ?? undefined,
    avatar_config: r.avatar_config ? JSON.parse(r.avatar_config) : undefined,
    description: r.description ?? undefined,
    system_prompt: r.system_prompt,
    model: r.model,
    tools: parseJsonArray(r.tools),
    mcp_servers: parseJsonArray(r.mcp_servers),
    custom_tools: parseJsonArray(r.custom_tools),
    trigger_mode: r.trigger_mode,
    schedule_cron: r.schedule_cron ?? undefined,
    personality: r.personality ?? undefined,
    max_iterations: r.max_iterations ?? 5,
    autonomy_level: r.autonomy_level ?? 2,
    temperature: r.temperature ?? 0.7,
    office_x: r.office_x ?? undefined,
    office_y: r.office_y ?? undefined,
    office_station_icon: r.office_station_icon ?? undefined,
    status: (r.status as AgentStatus) || "idle",
    current_task: r.current_task ?? undefined,
    active: r.active,
    total_executions: r.total_executions,
    total_cost_usd: r.total_cost_usd,
    success_rate: r.success_rate,
    monthly_budget_usd: r.monthly_budget_usd ?? undefined,
    daily_execution_limit: r.daily_execution_limit ?? undefined,
    cost_this_month: r.cost_this_month ?? 0,
    created_by: r.created_by ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
  agents: [],
  selectedAgentId: null,
  chatMessages: {},
  streamingMessages: {},
  agentProgress: {},
  pendingConfirmations: {},
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/`, { headers });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API Error: ${res.status}`);
      }

      const data: AgentResponse[] = await res.json();
      const agents = data.map(mapAgentResponse);
      set({ agents, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch agents";
      set({ error: message, loading: false });
    }
  },

  setAgents: (agents) => set({ agents }),
  addAgent: async (agent) => {
    // Persist to backend first, then update local state
    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          system_prompt: agent.system_prompt,
          model: agent.model,
          tools: agent.tools,
          mcp_servers: agent.mcp_servers,
          custom_tools: agent.custom_tools,
          trigger_mode: agent.trigger_mode,
          schedule_cron: agent.schedule_cron ?? null,
          max_iterations: agent.max_iterations,
          autonomy_level: agent.autonomy_level,
          temperature: agent.temperature,
          personality: agent.personality,
          office_x: agent.office_x,
          office_y: agent.office_y,
          office_station_icon: agent.office_station_icon,
          monthly_budget_usd: agent.monthly_budget_usd ?? null,
          daily_execution_limit: agent.daily_execution_limit ?? null,
        }),
      });

      if (res.ok) {
        const saved: AgentResponse = await res.json();
        set((s) => ({ agents: [...s.agents, mapAgentResponse(saved)] }));
      } else {
        // Fallback: add locally so UI isn't broken
        set((s) => ({ agents: [...s.agents, agent] }));
      }
    } catch {
      // Offline fallback — add locally
      set((s) => ({ agents: [...s.agents, agent] }));
    }
  },
  updateAgent: (id, updates) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  persistAgentUpdate: async (id, updates) => {
    // Optimistic local update, then persist to backend
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const saved: AgentResponse = await res.json();
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? mapAgentResponse(saved) : a)),
        }));
      }
    } catch {
      // Optimistic update already applied; backend sync will catch up on next fetch
    }
  },
  removeAgent: async (id) => {
    // Optimistic local removal, then persist to backend
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
    }));
    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };

      const res = await fetch(`${API_URL}/api/agents/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        // Delete failed on server — re-fetch to restore accurate state
        useAgentStore.getState().fetchAgents();
      }
    } catch {
      // Network error — re-fetch to restore accurate state
      useAgentStore.getState().fetchAgents();
    }
  },
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  addChatMessage: (agentId, message) =>
    set((s) => ({
      chatMessages: {
        ...s.chatMessages,
        [agentId]: [...(s.chatMessages[agentId] || []), message],
      },
    })),
  setChatMessages: (agentId, messages) =>
    set((s) => ({
      chatMessages: { ...s.chatMessages, [agentId]: messages },
    })),
  updateChatMessage: (agentId, messageId, updates) =>
    set((s) => {
      const msgs = s.chatMessages[agentId] || [];
      return {
        chatMessages: {
          ...s.chatMessages,
          [agentId]: msgs.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      };
    }),

  // ─── Streaming Actions ────────────────────────────────────────

  upsertStreamingDelta: (channelId, agentId, messageId, delta) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const existing = s.streamingMessages[key];
      const updated: StreamingMessage = existing
        ? { ...existing, text: existing.text + delta, messageId }
        : {
            messageId,
            agentId,
            channelId,
            text: delta,
            toolCalls: [],
            startedAt: new Date().toISOString(),
          };
      return {
        streamingMessages: { ...s.streamingMessages, [key]: updated },
      };
    }),

  addActiveToolCall: (channelId, agentId, toolName, inputPreview) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const existing = s.streamingMessages[key];
      if (!existing) return s;

      const newCall: ActiveToolCall = {
        toolName,
        inputPreview,
        status: "running",
        startedAt: new Date().toISOString(),
      };
      return {
        streamingMessages: {
          ...s.streamingMessages,
          [key]: {
            ...existing,
            toolCalls: [...existing.toolCalls, newCall],
          },
        },
      };
    }),

  resolveToolCall: (channelId, agentId, toolName, success, outputPreview) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const existing = s.streamingMessages[key];
      if (!existing) return s;

      // Find the last running call with this name and resolve it
      let resolved = false;
      const updatedCalls = [...existing.toolCalls].reverse().map((tc) => {
        if (!resolved && tc.toolName === toolName && tc.status === "running") {
          resolved = true;
          return {
            ...tc,
            status: (success ? "success" : "error") as ActiveToolCallStatus,
            outputPreview,
          };
        }
        return tc;
      }).reverse();

      return {
        streamingMessages: {
          ...s.streamingMessages,
          [key]: { ...existing, toolCalls: updatedCalls },
        },
      };
    }),

  finalizeStreamingMessage: (channelId, agentId) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const { [key]: _removed, ...restStreaming } = s.streamingMessages;
      const { [key]: _removedProgress, ...restProgress } = s.agentProgress;
      return { streamingMessages: restStreaming, agentProgress: restProgress };
    }),

  clearStreamingMessage: (channelId, agentId) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const { [key]: _removed, ...restStreaming } = s.streamingMessages;
      const { [key]: _removedProgress, ...restProgress } = s.agentProgress;
      return { streamingMessages: restStreaming, agentProgress: restProgress };
    }),

  // ─── Progress Actions ──────────────────────────────────────────

  updateProgress: (channelId, agentId, current, total, description) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const progress: AgentProgress = {
        channelId,
        agentId,
        current,
        total,
        description,
        percent: total > 0 ? Math.round((current / total) * 100) : 0,
        updatedAt: new Date().toISOString(),
      };
      return {
        agentProgress: { ...s.agentProgress, [key]: progress },
      };
    }),

  clearProgress: (channelId, agentId) =>
    set((s) => {
      const key = streamKey(channelId, agentId);
      const { [key]: _removed, ...rest } = s.agentProgress;
      return { agentProgress: rest };
    }),

  // ─── Confirmation Actions ──────────────────────────────────────

  addConfirmation: (confirmation) =>
    set((s) => ({
      pendingConfirmations: {
        ...s.pendingConfirmations,
        [confirmation.requestId]: confirmation,
      },
    })),

  removeConfirmation: (requestId) =>
    set((s) => {
      const { [requestId]: _removed, ...rest } = s.pendingConfirmations;
      return { pendingConfirmations: rest };
    }),

  clearConfirmationsForAgent: (agentId) =>
    set((s) => {
      const filtered = Object.fromEntries(
        Object.entries(s.pendingConfirmations).filter(
          ([, c]) => c.agentId !== agentId
        )
      );
      return { pendingConfirmations: filtered };
    }),
}),
    {
      name: "agent-chat-messages",
      partialize: (state) => ({ chatMessages: state.chatMessages }),
    },
  ),
);
