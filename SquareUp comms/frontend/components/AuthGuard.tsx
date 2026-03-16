"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Protects workspace routes:
 * - Loading → spinner
 * - No user (and not dev mode) → redirect /login
 * - Needs onboarding → redirect /onboarding
 * - Otherwise → render children
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);

  const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true";

  useEffect(() => {
    if (loading) return;

    // In dev mode, skip auth checks entirely
    if (isDevMode) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [loading, user, needsOnboarding, isDevMode, router]);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center animate-pulse">
            <span className="text-white font-display font-bold text-lg">S</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // In dev mode, always render children
  if (isDevMode) {
    return <>{children}</>;
  }

  // Not signed in — will redirect in useEffect
  if (!user) return null;

  // Needs onboarding — will redirect in useEffect
  if (needsOnboarding) return null;

  return <>{children}</>;
}
