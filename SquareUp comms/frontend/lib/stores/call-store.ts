import { create } from "zustand";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CallState {
  isInCall: boolean;
  roomName: string | null;
  token: string | null;
  livekitUrl: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  loading: boolean;
  error: string | null;

  joinCall: (roomName: string, participantName?: string) => Promise<void>;
  leaveCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  return { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };
}

export const useCallStore = create<CallState>((set, get) => ({
  isInCall: false,
  roomName: null,
  token: null,
  livekitUrl: null,
  isMuted: false,
  isVideoOff: false,
  loading: false,
  error: null,

  joinCall: async (roomName: string, participantName?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/calls/token`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName, participant_name: participantName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API Error: ${res.status}`);
      }

      const data = await res.json();
      set({
        isInCall: true,
        roomName,
        token: data.token,
        livekitUrl: data.livekit_url,
        isMuted: false,
        isVideoOff: false,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join call";
      set({ error: message, loading: false });
    }
  },

  leaveCall: () =>
    set({
      isInCall: false,
      roomName: null,
      token: null,
      livekitUrl: null,
      isMuted: false,
      isVideoOff: false,
    }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleVideo: () => set((s) => ({ isVideoOff: !s.isVideoOff })),
}));
