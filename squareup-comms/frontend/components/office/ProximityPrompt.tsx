/**
 * Floating "Press E to interact" hint above nearest entity.
 * Appears when a non-self entity is within range and nothing is selected.
 * Shows a "Start Call" button when near another user.
 */

"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCallStore } from "@/lib/stores/call-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { TILE } from "@/lib/office/office-renderer";
import { CHAR_W } from "@/lib/office/character-generator";

const INTERACT_RANGE = 3;

export default function ProximityPrompt() {
  const myUserId = useCurrentUserId();
  const myPosition = useOfficeStore((s) => s.myPosition);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const selectedEntity = useOfficeStore((s) => s.selectedEntity);
  const isInCall = useCallStore((s) => s.isInCall);
  const joinCall = useCallStore((s) => s.joinCall);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  // Find nearest entity within range
  const nearest = useMemo(() => {
    if (selectedEntity) return null; // Don't show when something is already selected

    let best: { x: number; y: number; dist: number; type: "user" | "agent"; id: string } | null = null;

    for (const u of users) {
      if (u.id === myUserId) continue;
      const dist = Math.sqrt(
        (myPosition.x - u.x) ** 2 + (myPosition.y - u.y) ** 2
      );
      if (dist <= INTERACT_RANGE && (!best || dist < best.dist)) {
        best = { x: u.x, y: u.y, dist, type: "user", id: u.id };
      }
    }
    for (const a of agents) {
      const dist = Math.sqrt(
        (myPosition.x - a.x) ** 2 + (myPosition.y - a.y) ** 2
      );
      if (dist <= INTERACT_RANGE && (!best || dist < best.dist)) {
        best = { x: a.x, y: a.y, dist, type: "agent", id: a.id };
      }
    }

    return best;
  }, [myPosition, users, agents, selectedEntity, myUserId]);

  const handleStartCall = useCallback(() => {
    if (!nearest || nearest.type !== "user") return;
    // Room name is a sorted pair of user IDs to ensure consistency
    const ids = [myUserId, nearest.id].sort();
    const roomName = `call-${ids[0]}-${ids[1]}`;
    joinCall(roomName);
  }, [nearest, myUserId, joinCall]);

  if (prefersReduced) return null;

  return (
    <AnimatePresence>
      {nearest && (
        <motion.div
          className="pointer-events-auto absolute flex flex-col items-center gap-1"
          style={{
            left: nearest.x * TILE + (TILE - CHAR_W) / 2 + CHAR_W / 2,
            top: nearest.y * TILE - 20,
            zIndex: 45,
            transform: "translateX(-50%)",
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
        >
          <span
            className="rounded-md px-2 py-1 text-[10px] font-semibold text-white shadow-md"
            style={{ backgroundColor: "rgba(30, 27, 24, 0.85)" }}
          >
            Press <kbd className="rounded bg-white/20 px-1 py-0.5 text-[9px]">E</kbd> to interact
          </span>

          {/* Start Call button — only for users, not agents */}
          {nearest.type === "user" && !isInCall && (
            <button
              onClick={handleStartCall}
              className="flex items-center gap-1 rounded-md bg-sq-online/90 px-2 py-1 text-[10px] font-semibold text-white shadow-md transition-colors hover:bg-sq-online"
            >
              <Phone className="h-3 w-3" />
              Start Call
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
