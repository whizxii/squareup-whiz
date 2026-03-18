"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { fetchWithRetry, warmUpBackend } from "@/lib/fetch-with-retry";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Subscribes to Supabase auth state changes and syncs with the backend.
 *
 * Place this high in the component tree (root layout) so every page
 * has access to the auth store.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // In dev mode, supabase is null (not initialized).
    if (!supabase) {
      useAuthStore.setState({
        user: null,
        token: null,
        needsOnboarding: false,
        loading: false,
      });
      return;
    }

    // Check for an existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      } else {
        useAuthStore.setState({ loading: false });
      }
    });

    // Subscribe to auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Clear session cookie so middleware redirects to login
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
        useAuthStore.setState({
          user: null,
          token: null,
          profile: null,
          needsOnboarding: false,
          loading: false,
        });
        return;
      }

      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []); // Stable — Zustand setState/getState never change

  return <>{children}</>;
}

async function handleSession(session: {
  access_token: string;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
}) {
  // Block redirects while we verify with the backend
  useAuthStore.setState({ loading: true });

  try {
    const { access_token, user: supabaseUser } = session;

    // Store user info and token
    useAuthStore.setState({
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email ?? null,
        displayName:
          (supabaseUser.user_metadata?.display_name as string) ?? null,
      },
      token: access_token,
    });

    // Set session cookie so Next.js middleware can detect auth state
    document.cookie = "__session=1; path=/; max-age=86400; SameSite=Lax";

    // Wait for backend to be warm before sending auth request
    await warmUpBackend();

    // Verify with backend and check onboarding status
    const res = await fetchWithRetry(`${API_URL}/api/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Auth verify failed: ${res.status}`);
    }

    const data = await res.json();

    if (data.needs_onboarding) {
      useAuthStore.setState({ needsOnboarding: true, profile: null });
    } else {
      useAuthStore.setState({
        needsOnboarding: false,
        profile: data.profile,
      });
      // Hydrate settings store from backend profile
      useSettingsStore.getState().hydrateFromProfile();
    }
  } catch (err) {
    console.error("Auth verification failed:", err);

    // Only clear session on explicit auth rejection (401).
    // Transient errors (cold start, network timeout) should NOT wipe the session.
    const is401 =
      err instanceof Error && err.message.includes("401");

    if (is401) {
      document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
      useAuthStore.setState({
        user: null,
        token: null,
        profile: null,
        needsOnboarding: false,
      });
    } else {
      // Transient failure — keep user/token intact so the app can retry.
      // Mark as needing onboarding only if we truly don't know yet.
      console.warn(
        "Auth verify failed (transient). Keeping session alive for retry.",
      );
    }
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}
