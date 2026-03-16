"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Subscribes to Firebase auth state changes and syncs with the backend.
 *
 * Place this high in the component tree (root layout) so every page
 * has access to the auth store.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // In dev mode, auth is null (Firebase not initialized).
    // Use getState() to batch all updates in one shot — avoids re-render loops.
    if (!auth) {
      useAuthStore.setState({
        user: null,
        token: null,
        needsOnboarding: false,
        loading: false,
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
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

      // Block redirects while we verify with the backend
      useAuthStore.setState({ loading: true });

      try {
        const idToken = await firebaseUser.getIdToken();
        // Atomic update — prevents intermediate renders where user is set but loading is false
        useAuthStore.setState({ user: firebaseUser, token: idToken });

        // Set session cookie so Next.js middleware can detect auth state
        document.cookie = "__session=1; path=/; max-age=86400; SameSite=Lax";

        // Verify with backend and check onboarding status
        // Uses retry to handle Render free-tier cold starts (503 without CORS)
        const res = await fetchWithRetry(`${API_URL}/api/auth/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Auth verify failed: ${res.status}`);
        }

        const data = await res.json();

        if (data.needs_onboarding) {
          useAuthStore.setState({ needsOnboarding: true, profile: null });
        } else {
          useAuthStore.setState({ needsOnboarding: false, profile: data.profile });
          // Hydrate settings store from backend profile
          useSettingsStore.getState().hydrateFromProfile();
        }
      } catch (err) {
        console.error("Auth verification failed:", err);
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
        useAuthStore.setState({
          user: null,
          token: null,
          profile: null,
          needsOnboarding: false,
        });
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // Stable — Zustand setState/getState never change

  return <>{children}</>;
}
