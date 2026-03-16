"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);

  // Redirect based on auth state — AuthProvider determines the destination
  useEffect(() => {
    if (authLoading || !user) return;
    if (needsOnboarding) {
      router.replace("/onboarding");
    } else {
      router.replace("/office");
    }
  }, [authLoading, user, needsOnboarding, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // AuthProvider will detect the auth state change and update the store.
      // The useEffect above will handle the redirect once verification completes.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand-glow">
            <span className="text-white font-display font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            SquareUp Comms
          </h1>
          <p className="text-sm text-muted-foreground">
            Your AI-native workspace
          </p>
        </div>

        {/* Sign in */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          {error && (
            <p className="text-xs text-center text-red-500">{error}</p>
          )}
          <p className="text-xs text-center text-muted-foreground/60">
            Only available for the SquareUp team
          </p>
        </div>
      </motion.div>
    </div>
  );
}
