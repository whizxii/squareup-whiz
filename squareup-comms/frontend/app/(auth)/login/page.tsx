"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";
import { warmUpBackend, isBackendReady } from "@/lib/fetch-with-retry";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverWaking, setServerWaking] = useState(false);
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);

  // Wake up Render backend as soon as the login page loads
  useEffect(() => {
    if (isBackendReady()) return;
    setServerWaking(true);
    warmUpBackend().then(() => setServerWaking(false));
  }, []);

  // Redirect based on auth state — AuthProvider determines the destination
  useEffect(() => {
    if (authLoading || !user) return;
    if (needsOnboarding) {
      router.replace("/onboarding");
    } else {
      router.replace("/office");
    }
  }, [authLoading, user, needsOnboarding, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      // AuthProvider will detect the auth state change and update the store.
      // The useEffect above will handle the redirect once verification completes.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      if (message.includes("Invalid login credentials")) {
        setError("Invalid email or password.");
      } else {
        setError(message);
      }
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

        {/* Sign in form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-150 disabled:opacity-50"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-150 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-brand text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:brightness-110"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Server waking indicator */}
          {serverWaking && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Waking up server... this may take up to a minute
            </div>
          )}

          {error && (
            <p className="text-xs text-center text-red-500">{error}</p>
          )}
          <p className="text-xs text-center text-muted-foreground/60">
            Only available for the SquareUp team
          </p>
        </form>
      </motion.div>
    </div>
  );
}
