/**
 * Glass-style corner minimap showing the entire office floor plan.
 * Orange dots = users, blue dots = agents, pulsing dot = you.
 * Click anywhere on minimap to pan camera.
 */

"use client";

import { useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Maximize2 } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";

const MAP_W = 160;
const MAP_H = 128;

export default function OfficeMiniMap() {
  const layout = useOfficeStore((s) => s.layout);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const zones = useOfficeStore((s) => s.zones);
  const minimapExpanded = useOfficeStore((s) => s.minimapExpanded);
  const setMinimapExpanded = useOfficeStore((s) => s.setMinimapExpanded);
  const setMyPosition = useOfficeStore((s) => s.setMyPosition);
  const moveUser = useOfficeStore((s) => s.moveUser);
  const myUserId = useCurrentUserId();

  const { gridCols, gridRows } = layout;
  const scaleX = MAP_W / gridCols;
  const scaleY = MAP_H / gridRows;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / scaleX);
      const y = Math.floor((e.clientY - rect.top) / scaleY);
      if (x >= 0 && x < gridCols && y >= 0 && y < gridRows) {
        moveUser(myUserId, x, y, "down");
        setMyPosition(x, y);
      }
    },
    [scaleX, scaleY, gridCols, gridRows, moveUser, setMyPosition, myUserId]
  );

  const zoneDots = useMemo(
    () =>
      zones.map((z) => ({
        id: z.id,
        x: z.x * scaleX,
        y: z.y * scaleY,
        w: z.width * scaleX,
        h: z.height * scaleY,
        color: z.color,
      })),
    [zones, scaleX, scaleY]
  );

  return (
    <div className="absolute bottom-4 right-4 z-40">
      {/* Collapse / expand toggle */}
      <button
        className="sq-tap absolute -top-8 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 backdrop-blur-md hover:bg-white/20"
        onClick={() => setMinimapExpanded(!minimapExpanded)}
        aria-label={minimapExpanded ? "Collapse minimap" : "Expand minimap"}
      >
        {minimapExpanded ? <Minus size={12} /> : <Maximize2 size={12} />}
      </button>

      <AnimatePresence>
        {minimapExpanded && (
          <motion.div
            className="cursor-crosshair overflow-hidden rounded-xl border border-white/10 shadow-lg"
            style={{
              width: MAP_W,
              height: MAP_H,
              backgroundColor: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(24px) saturate(180%)",
            }}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={handleClick}
          >
            {/* Zone areas */}
            {zoneDots.map((z) => (
              <div
                key={z.id}
                className="absolute rounded-sm"
                style={{
                  left: z.x,
                  top: z.y,
                  width: z.w,
                  height: z.h,
                  backgroundColor: `${z.color}30`,
                }}
              />
            ))}

            {/* Agent dots */}
            {agents
              .filter((a) => a.status !== "offline")
              .map((a) => (
                <div
                  key={a.id}
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    left: a.x * scaleX - 4,
                    top: a.y * scaleY - 4,
                    backgroundColor: "#4a90d9",
                    opacity: 0.8,
                  }}
                />
              ))}

            {/* User dots */}
            {users.map((u) => (
              <div
                key={u.id}
                className={`absolute h-2.5 w-2.5 rounded-full ${
                  u.id === myUserId ? "office-minimap-pulse" : ""
                }`}
                style={{
                  left: u.x * scaleX - 5,
                  top: u.y * scaleY - 5,
                  backgroundColor: u.id === myUserId ? "#FF6B00" : "#22c55e",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
