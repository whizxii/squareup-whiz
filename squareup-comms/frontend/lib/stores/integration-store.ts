import { create } from "zustand";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntegrationState {
  // Google Calendar
  calendarConnected: boolean;
  calendarEmail: string | null;
  calendarLastSynced: string | null;
  calendarLoading: boolean;
  calendarError: string | null;

  // Actions
  checkCalendarStatus: () => Promise<void>;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
}

function getAuthHeaders(): Record<string, string> {
  // Lazy import to avoid circular deps
  const { useAuthStore } = require("@/lib/stores/auth-store");
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return { "X-User-Id": getCurrentUserId() };
}

export const useIntegrationStore = create<IntegrationState>()((set) => ({
  calendarConnected: false,
  calendarEmail: null,
  calendarLastSynced: null,
  calendarLoading: false,
  calendarError: null,

  checkCalendarStatus: async () => {
    set({ calendarLoading: true, calendarError: null });
    try {
      const res = await fetch(`${API_URL}/api/calendar/status`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
      const data = await res.json();
      set({
        calendarConnected: data.connected,
        calendarEmail: data.email ?? null,
        calendarLastSynced: data.last_synced ?? null,
        calendarLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check status";
      set({ calendarLoading: false, calendarError: message });
    }
  },

  connectCalendar: async () => {
    set({ calendarLoading: true, calendarError: null });
    try {
      const res = await fetch(`${API_URL}/api/calendar/connect`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Connect failed: ${res.status}`);
      const data = await res.json();
      // Open the OAuth URL in a new window
      window.open(data.auth_url, "_blank", "width=600,height=700");
      set({ calendarLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      set({ calendarLoading: false, calendarError: message });
    }
  },

  disconnectCalendar: async () => {
    set({ calendarLoading: true, calendarError: null });
    try {
      const res = await fetch(`${API_URL}/api/calendar/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
      set({
        calendarConnected: false,
        calendarEmail: null,
        calendarLastSynced: null,
        calendarLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect";
      set({ calendarLoading: false, calendarError: message });
    }
  },
}));
