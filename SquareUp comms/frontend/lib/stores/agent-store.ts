import { create } from "zustand";
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
  trigger_mode: "mention" | "auto" | "scheduled" | "webhook";
  schedule_cron: string | null;
  personality: string | null;
  office_x: number | null;
  office_y: number | null;
  office_station_icon: string | null;
  status: string;
  current_task: string | null;
  active: boolean;
  total_executions: number;
  total_cost_usd: number;
  success_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentStatus = "idle" | "thinking" | "working" | "error" | "offline";

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
  trigger_mode: "mention" | "auto" | "scheduled" | "webhook";
  schedule_cron?: string;
  personality?: string;
  office_x?: number;
  office_y?: number;
  office_station_icon?: string;
  status: AgentStatus;
  current_task?: string;
  active: boolean;
  total_executions: number;
  total_cost_usd: number;
  success_rate: number;
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

// ─── Store ─────────────────────────────────────────────────────────
interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  chatMessages: Record<string, AgentChatMessage[]>;
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgent: (id: string | null) => void;
  addChatMessage: (agentId: string, message: AgentChatMessage) => void;
  setChatMessages: (agentId: string, messages: AgentChatMessage[]) => void;
  updateChatMessage: (agentId: string, messageId: string, updates: Partial<AgentChatMessage>) => void;
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
    trigger_mode: r.trigger_mode,
    schedule_cron: r.schedule_cron ?? undefined,
    personality: r.personality ?? undefined,
    office_x: r.office_x ?? undefined,
    office_y: r.office_y ?? undefined,
    office_station_icon: r.office_station_icon ?? undefined,
    status: (r.status as AgentStatus) || "idle",
    current_task: r.current_task ?? undefined,
    active: r.active,
    total_executions: r.total_executions,
    total_cost_usd: r.total_cost_usd,
    success_rate: r.success_rate,
    created_by: r.created_by ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgentId: null,
  chatMessages: {},
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
  addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
  updateAgent: (id, updates) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeAgent: (id) =>
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
    })),
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
}));
