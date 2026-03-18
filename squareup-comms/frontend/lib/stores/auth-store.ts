import { create } from "zustand";

/** Lightweight user info extracted from Supabase session. */
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

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
  /** Authenticated user info (null when signed out). */
  user: AuthUser | null;
  /** Supabase access token for API calls. */
  token: string | null;
  /** Backend profile (null until fetched). */
  profile: UserProfile | null;
  /** True while auth state is being determined. */
  loading: boolean;
  /** True when authenticated but no backend profile yet. */
  needsOnboarding: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
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
