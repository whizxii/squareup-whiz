/**
 * Glass-style corner minimap showing the entire office floor plan.
 * Themed dots for users and agents, pulsing dot = you.
 * Click anywhere on minimap to pan camera.
 * Fully themed via useOfficeTheme.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Maximize2 } from "lucide-react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";

const MAP_W = 200;
const MAP_H = 160;

export default function OfficeMiniMap() {
  const { tokens } = useOfficeTheme();
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

  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const zoneDots = useMemo(
    () =>
      zones.map((z) => ({
        id: z.id,
        name: z.name,
        icon: z.icon,
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
        className="sq-tap absolute -top-8 right-0 flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md"
        style={{
          backgroundColor: tokens.glass,
          color: tokens.textMuted,
        }}
        onClick={() => setMinimapExpanded(!minimapExpanded)}
        aria-label={minimapExpanded ? "Collapse minimap" : "Expand minimap"}
      >
        {minimapExpanded ? <Minus size={12} /> : <Maximize2 size={12} />}
      </button>

      <AnimatePresence>
        {minimapExpanded && (
          <motion.div
            className="cursor-crosshair overflow-hidden rounded-xl shadow-lg"
            style={{
              width: MAP_W,
              height: MAP_H,
              backgroundColor: tokens.glass,
              backdropFilter: "blur(24px) saturate(180%)",
              border: `1px solid ${tokens.glassBorder}`,
            }}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={handleClick}
          >
            {/* Zone areas with hover labels */}
            {zoneDots.map((z) => (
              <div
                key={z.id}
                className="absolute rounded-sm"
                style={{
                  left: z.x,
                  top: z.y,
                  width: z.w,
                  height: z.h,
                  backgroundColor: hoveredZoneId === z.id ? `${z.color}55` : `${z.color}30`,
                  border: hoveredZoneId === z.id ? `1px solid ${z.color}80` : "1px solid transparent",
                  transition: "background-color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={() => setHoveredZoneId(z.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
              >
                {/* Persistent label for large zones */}
                {z.w >= 24 && z.h >= 16 && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    style={{ opacity: hoveredZoneId === z.id ? 1 : 0.55 }}
                  >
                    <span
                      className="truncate rounded px-1 text-[7px] font-semibold leading-none"
                      style={{ color: z.color, maxWidth: z.w - 4 }}
                    >
                      {z.name}
                    </span>
                  </div>
                )}

                {/* Hover tooltip for small zones */}
                {hoveredZoneId === z.id && z.w < 24 && (
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-semibold leading-none"
                    style={{
                      bottom: "calc(100% + 3px)",
                      backgroundColor: z.color,
                      color: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                      zIndex: 10,
                    }}
                  >
                    {z.icon} {z.name}
                  </div>
                )}
              </div>
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
                    backgroundColor: tokens.accent,
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
                  backgroundColor:
                    u.id === myUserId
                      ? tokens.accentHover
                      : tokens.status.online,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
