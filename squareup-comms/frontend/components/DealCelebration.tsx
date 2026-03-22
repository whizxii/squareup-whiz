"use client";

/**
 * DealCelebration — Global overlay that triggers confetti + a banner
 * whenever a `crm.deal_celebration` WebSocket event fires.
 * Mounted once in the workspace layout.
 */

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWebSocket } from "@/hooks/use-websocket";
import { MessageEffects } from "@/components/chat/effects/MessageEffects";
import type { EffectType } from "@/components/chat/effects/MessageEffects";

interface CelebrationData {
  readonly dealName: string;
  readonly value: number | null;
  readonly currency: string;
}

function formatDealValue(value: number, currency: string): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ${currency}`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K ${currency}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DealCelebration() {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [effect, setEffect] = useState<EffectType | null>(null);

  const token = useAuthStore((s) => s.token);
  const { on: wsOn } = useWebSocket(token);

  // Listen for deal celebration events
  useEffect(() => {
    if (!wsOn) return;

    return wsOn("crm.deal_celebration", (data) => {
      const dealName = (data.deal_name as string) || "A deal";
      const value = (data.value as number) ?? null;
      const currency = (data.currency as string) || "USD";

      setCelebration({ dealName, value, currency });
      setEffect("confetti");
    });
  }, [wsOn]);

  // Auto-dismiss banner after 6 seconds
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 6000);
    return () => clearTimeout(timer);
  }, [celebration]);

  const handleEffectComplete = useCallback(() => {
    setEffect(null);
  }, []);

  return (
    <>
      {/* Confetti canvas */}
      <MessageEffects effect={effect} onComplete={handleEffectComplete} />

      {/* Celebration banner */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
          >
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500/90 to-yellow-500/90 text-white shadow-2xl shadow-amber-500/30 backdrop-blur-sm border border-amber-400/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                  Deal Won!
                </span>
                <span className="text-lg font-bold leading-tight">
                  {celebration.dealName}
                </span>
                {celebration.value != null && celebration.value > 0 && (
                  <span className="text-sm font-medium opacity-90">
                    {formatDealValue(celebration.value, celebration.currency)}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
