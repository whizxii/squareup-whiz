/**
 * Agent memory store — manages fetching, editing, and deleting
 * the memories an agent has stored about the current user.
 */

import { create } from "zustand";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useAuthStore } from "@/lib/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentMemoryEntry {
  readonly id: string;
  readonly agent_id: string;
  readonly user_id: string;
  readonly key: string;
  readonly value: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface MemoryState {
  /** Memories keyed by agent ID */
  readonly memoriesByAgent: Readonly<Record<string, readonly AgentMemoryEntry[]>>;
  readonly loading: boolean;
  readonly error: string | null;

  readonly fetchMemories: (agentId: string) => Promise<void>;
  readonly updateMemory: (
    agentId: string,
    memoryId: string,
    value: string,
  ) => Promise<void>;
  readonly deleteMemory: (agentId: string, memoryId: string) => Promise<void>;
  readonly clearMemories: (agentId: string) => Promise<number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API Error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMemoryStore = create<MemoryState>()((set, get) => ({
  memoriesByAgent: {},
  loading: false,
  error: null,

  fetchMemories: async (agentId) => {
    set({ loading: true, error: null });
    try {
      const data = await handleResponse<AgentMemoryEntry[]>(
        await fetch(`${API_URL}/api/agents/${agentId}/memories`, {
          headers: getHeaders(),
        }),
      );
      set((s) => ({
        memoriesByAgent: { ...s.memoriesByAgent, [agentId]: data },
        loading: false,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch memories";
      set({ error: message, loading: false });
    }
  },

  updateMemory: async (agentId, memoryId, value) => {
    // Optimistic update
    const prev = get().memoriesByAgent[agentId] ?? [];
    const optimistic = prev.map((m) =>
      m.id === memoryId ? { ...m, value, updated_at: new Date().toISOString() } : m,
    );
    set((s) => ({
      memoriesByAgent: { ...s.memoriesByAgent, [agentId]: optimistic },
    }));

    try {
      const updated = await handleResponse<AgentMemoryEntry>(
        await fetch(`${API_URL}/api/agents/${agentId}/memories/${memoryId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ value }),
        }),
      );
      // Replace with server response
      set((s) => ({
        memoriesByAgent: {
          ...s.memoriesByAgent,
          [agentId]: (s.memoriesByAgent[agentId] ?? []).map((m) =>
            m.id === updated.id ? updated : m,
          ),
        },
      }));
    } catch (err) {
      // Rollback
      set((s) => ({
        memoriesByAgent: { ...s.memoriesByAgent, [agentId]: prev },
        error: err instanceof Error ? err.message : "Failed to update memory",
      }));
    }
  },

  deleteMemory: async (agentId, memoryId) => {
    const prev = get().memoriesByAgent[agentId] ?? [];
    // Optimistic removal
    set((s) => ({
      memoriesByAgent: {
        ...s.memoriesByAgent,
        [agentId]: prev.filter((m) => m.id !== memoryId),
      },
    }));

    try {
      await handleResponse<{ detail: string }>(
        await fetch(`${API_URL}/api/agents/${agentId}/memories/${memoryId}`, {
          method: "DELETE",
          headers: getHeaders(),
        }),
      );
    } catch (err) {
      // Rollback
      set((s) => ({
        memoriesByAgent: { ...s.memoriesByAgent, [agentId]: prev },
        error: err instanceof Error ? err.message : "Failed to delete memory",
      }));
    }
  },

  clearMemories: async (agentId) => {
    const prev = get().memoriesByAgent[agentId] ?? [];
    // Optimistic clear
    set((s) => ({
      memoriesByAgent: { ...s.memoriesByAgent, [agentId]: [] },
    }));

    try {
      const result = await handleResponse<{ count: number }>(
        await fetch(`${API_URL}/api/agents/${agentId}/memories`, {
          method: "DELETE",
          headers: getHeaders(),
        }),
      );
      return result.count;
    } catch (err) {
      // Rollback
      set((s) => ({
        memoriesByAgent: { ...s.memoriesByAgent, [agentId]: prev },
        error: err instanceof Error ? err.message : "Failed to clear memories",
      }));
      return 0;
    }
  },
}));
