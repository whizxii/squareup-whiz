/**
 * Floating wave emoji animation when someone waves at an entity.
 * Reads waveTarget from store, animates upward + fade, then auto-clears.
 */

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOfficeStore } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";

export default function WaveEffect() {
  const waveTarget = useOfficeStore((s) => s.waveTarget);
  const clearWave = useOfficeStore((s) => s.clearWave);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);

  // Auto-clear wave after animation duration
  useEffect(() => {
    if (!waveTarget) return;
    const timer = setTimeout(clearWave, 1500);
    return () => clearTimeout(timer);
  }, [waveTarget, clearWave]);

  // Find target position
  const targetEntity = waveTarget
    ? waveTarget.type === "user"
      ? users.find((u) => u.id === waveTarget.id)
      : agents.find((a) => a.id === waveTarget.id)
    : null;

  return (
    <AnimatePresence>
      {targetEntity && (
        <motion.div
          key={`wave-${waveTarget!.id}-${Date.now()}`}
          className="pointer-events-none absolute text-2xl"
          style={{
            left: targetEntity.x * TILE + TILE / 2,
            top: targetEntity.y * TILE - 16,
            zIndex: 46,
            transform: "translateX(-50%)",
          }}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -30, scale: 1.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          {"👋"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
