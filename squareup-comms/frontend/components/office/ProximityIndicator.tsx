/**
 * Animated proximity rings around the local player.
 * Inner ring (warm glow) for close range, outer ring (subtle pulse) for awareness range.
 * Themed via useOfficeTheme.
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { TILE } from "@/lib/office/office-renderer";

const INNER_RANGE = 2; // tiles
const OUTER_RANGE = 5; // tiles

export default function ProximityIndicator() {
  const { tokens } = useOfficeTheme();
  const myUserId = useCurrentUserId();
  const myPosition = useOfficeStore((s) => s.myPosition);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  const nearbyCount = useMemo(() => {
    const dist = (e: { x: number; y: number }) => {
      const dx = e.x - myPosition.x;
      const dy = e.y - myPosition.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const allEntities = [
      ...users.filter((u) => u.id !== myUserId),
      ...agents.filter((a) => a.status !== "offline"),
    ];

    return {
      inner: allEntities.filter((e) => dist(e) <= INNER_RANGE).length,
      outer: allEntities.filter(
        (e) => dist(e) > INNER_RANGE && dist(e) <= OUTER_RANGE
      ).length,
    };
  }, [myPosition.x, myPosition.y, users, agents, myUserId]);

  if (prefersReduced || (nearbyCount.inner === 0 && nearbyCount.outer === 0)) {
    return null;
  }

  const cx = myPosition.x * TILE + TILE / 2;
  const cy = myPosition.y * TILE + TILE / 2;
  const accent = tokens.accent;

  return (
    <AnimatePresence>
      {/* Outer awareness ring */}
      {nearbyCount.outer > 0 && (
        <motion.div
          key="outer"
          className="office-proximity-pulse absolute rounded-full"
          style={{
            left: cx - OUTER_RANGE * TILE,
            top: cy - OUTER_RANGE * TILE,
            width: OUTER_RANGE * 2 * TILE,
            height: OUTER_RANGE * 2 * TILE,
            border: `1px solid ${accent}25`,
            background: `${accent}08`,
            pointerEvents: "none",
            zIndex: 4,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4 }}
        />
      )}

      {/* Inner interaction ring */}
      {nearbyCount.inner > 0 && (
        <motion.div
          key="inner"
          className="absolute rounded-full"
          style={{
            left: cx - INNER_RANGE * TILE,
            top: cy - INNER_RANGE * TILE,
            width: INNER_RANGE * 2 * TILE,
            height: INNER_RANGE * 2 * TILE,
            background: `radial-gradient(circle, ${accent}20 0%, ${accent}08 60%, transparent 100%)`,
            border: `1px solid ${accent}40`,
            pointerEvents: "none",
            zIndex: 4,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </AnimatePresence>
  );
}
