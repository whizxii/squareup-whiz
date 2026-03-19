/**
 * Call store — manages LiveKit call state, incoming call notifications,
 * and participant tracking. The actual Room connection is managed by
 * the <LiveKitRoom> component in CallOverlay.
 */

import { create } from "zustand";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallParticipant {
  readonly id: string;
  readonly name: string;
  readonly isMuted: boolean;
  readonly isVideoOff: boolean;
  readonly isSpeaking: boolean;
}

export interface IncomingCall {
  readonly fromUserId: string;
  readonly fromName: string;
  readonly roomName: string;
  readonly timestamp: number;
}

export interface CallState {
  // Connection
  readonly isInCall: boolean;
  readonly roomName: string | null;
  readonly token: string | null;
  readonly livekitUrl: string | null;
  readonly loading: boolean;
  readonly error: string | null;

  // Local controls
  readonly isMuted: boolean;
  readonly isVideoOff: boolean;
  readonly isScreenSharing: boolean;

  // Participants
  readonly participants: readonly CallParticipant[];

  // Incoming call notification
  readonly incomingCall: IncomingCall | null;

  // Actions
  readonly joinCall: (roomName: string, participantName?: string) => Promise<void>;
  readonly leaveCall: () => void;
  readonly toggleMute: () => void;
  readonly toggleVideo: () => void;
  readonly toggleScreenShare: () => void;
  readonly setParticipants: (participants: readonly CallParticipant[]) => void;
  readonly setIncomingCall: (call: IncomingCall | null) => void;
  readonly acceptIncomingCall: () => Promise<void>;
  readonly rejectIncomingCall: () => void;
  readonly clearError: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  return { "X-User-Id": getCurrentUserId(), "Content-Type": "application/json" };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCallStore = create<CallState>((set, get) => ({
  isInCall: false,
  roomName: null,
  token: null,
  livekitUrl: null,
  loading: false,
  error: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  participants: [],
  incomingCall: null,

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
        isScreenSharing: false,
        loading: false,
        incomingCall: null,
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
      isScreenSharing: false,
      participants: [],
    }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleVideo: () => set((s) => ({ isVideoOff: !s.isVideoOff })),
  toggleScreenShare: () => set((s) => ({ isScreenSharing: !s.isScreenSharing })),

  setParticipants: (participants) => set({ participants }),

  setIncomingCall: (call) => set({ incomingCall: call }),

  acceptIncomingCall: async () => {
    const incoming = get().incomingCall;
    if (!incoming) return;
    await get().joinCall(incoming.roomName);
  },

  rejectIncomingCall: () => set({ incomingCall: null }),

  clearError: () => set({ error: null }),
}));
