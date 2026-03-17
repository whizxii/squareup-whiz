"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { fetchWithRetry, warmUpBackend, isBackendReady } from "@/lib/fetch-with-retry";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AvatarOption {
  id: string;
  name: string;
  theme: string;
  primary_color: string;
  secondary_color: string;
  icon: string;
}

const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "fox", name: "Fox", theme: "Clever & swift", primary_color: "#FF6B00", secondary_color: "#FFD700", icon: "\u{1F98A}" },
  { id: "cat", name: "Cat", theme: "Independent & curious", primary_color: "#8B5CF6", secondary_color: "#D8B4FE", icon: "\u{1F431}" },
  { id: "bear", name: "Bear", theme: "Strong & reliable", primary_color: "#92400E", secondary_color: "#FCD34D", icon: "\u{1F43B}" },
  { id: "robot", name: "Robot", theme: "Precise & tireless", primary_color: "#3B82F6", secondary_color: "#93C5FD", icon: "\u{1F916}" },
  { id: "alien", name: "Alien", theme: "Creative & unique", primary_color: "#10B981", secondary_color: "#6EE7B7", icon: "\u{1F47E}" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);

  // Guard: must be authenticated AND need onboarding
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (!needsOnboarding) {
      router.replace("/office");
    }
  }, [authLoading, user, needsOnboarding, router]);

  // Wake up Render backend while user fills the form
  useEffect(() => {
    warmUpBackend();
  }, []);

  const [fullName, setFullName] = useState(user?.displayName ?? "");
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fullName.trim() || !selectedAvatar) return;

    setLoading(true);
    setError(null);

    try {
      // Ensure backend is warm before sending the request
      await warmUpBackend();

      // Get a fresh token (force refresh) — warmup may have taken a while
      const freshToken = user ? await user.getIdToken(true) : null;

      const res = await fetchWithRetry(`${API_URL}/api/auth/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}),
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          nickname: nickname.trim() || null,
          avatar_id: selectedAvatar,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Onboarding failed" }));
        throw new Error(data.detail || `Error: ${res.status}`);
      }

      const profile = await res.json();
      setProfile(profile);
      setNeedsOnboarding(false);
      router.replace("/office");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoading(false);
    }
  };

  // Show nothing while auth is loading or redirecting
  if (authLoading || !user || !needsOnboarding) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand-glow">
            <span className="text-white font-display font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome to SquareUp
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up your profile to get started
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-foreground">
              Nickname <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="How teammates call you"
              maxLength={50}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Pick your avatar
            </label>
            <div className="grid grid-cols-5 gap-3">
              {AVATAR_OPTIONS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md scale-105"
                        : "border-border bg-card hover:border-primary/30 hover:bg-accent"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${avatar.primary_color}, ${avatar.secondary_color})`,
                      }}
                    >
                      {avatar.icon}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {avatar.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedAvatar && (
              <p className="text-xs text-center text-muted-foreground">
                {AVATAR_OPTIONS.find((a) => a.id === selectedAvatar)?.theme}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-center text-red-500">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !fullName.trim() || !selectedAvatar}
            className="w-full px-4 py-3 rounded-xl bg-gradient-brand text-white font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-brand-glow"
          >
            {loading ? "Setting up..." : "Get Started"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
