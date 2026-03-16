import { create } from "zustand";
import type { User } from "firebase/auth";

/** Backend user profile shape (mirrors ProfileResponse). */
export interface UserProfile {
  firebase_uid: string;
  display_name: string;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_config: {
    type: string;
    avatar_id: string;
    primary_color: string;
    secondary_color: string;
    icon: string;
  } | null;
  status: string;
  status_message: string | null;
  status_emoji: string | null;
  office_x: number;
  office_y: number;
  theme: string;
  last_seen_at: string;
  created_at: string;
}

interface AuthState {
  /** Firebase user object (null when signed out). */
  user: User | null;
  /** Firebase ID token for API calls. */
  token: string | null;
  /** Backend profile (null until fetched). */
  profile: UserProfile | null;
  /** True while auth state is being determined. */
  loading: boolean;
  /** True when Firebase user exists but no backend profile yet. */
  needsOnboarding: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsOnboarding: (needs: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  profile: null,
  loading: true,
  needsOnboarding: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setNeedsOnboarding: (needs) => set({ needsOnboarding: needs }),
  signOut: () =>
    set({
      user: null,
      token: null,
      profile: null,
      needsOnboarding: false,
    }),
}));
