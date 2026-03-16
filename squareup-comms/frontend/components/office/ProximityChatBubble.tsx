/**
 * Proximity chat bubbles that appear above nearby users/agents
 * when within close range (INNER_RANGE = 2 tiles).
 * Shows their current activity or status message with warm glass styling.
 */

"use client";

import { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { TILE } from "@/lib/office/office-renderer";
import { CHAR_H } from "@/lib/office/character-generator";

const INNER_RANGE = 2;
const BUBBLE_LIFETIME_MS = 5000;

interface NearbyEntity {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly message: string;
  readonly type: "user" | "agent";
}

export default function ProximityChatBubbles() {
  const myUserId = useCurrentUserId();
  const myPosition = useOfficeStore((s) => s.myPosition);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const chatBubbles = useOfficeStore((s) => s.chatBubbles);
  const clearOldChatBubbles = useOfficeStore((s) => s.clearOldChatBubbles);

  // Periodically clean up expired chat bubbles
  useEffect(() => {
    if (chatBubbles.length === 0) return;
    const timer = setInterval(clearOldChatBubbles, BUBBLE_LIFETIME_MS);
    return () => clearInterval(timer);
  }, [chatBubbles.length, clearOldChatBubbles]);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  const nearbyEntities = useMemo(() => {
    const dist = (e: { x: number; y: number }) => {
      const dx = e.x - myPosition.x;
      const dy = e.y - myPosition.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const result: readonly NearbyEntity[] = [
      ...users
        .filter((u) => u.id !== myUserId && dist(u) <= INNER_RANGE)
        .map((u) => ({
          id: u.id,
          name: u.name,
          x: u.x,
          y: u.y,
          message: u.statusMessage || u.activity || u.statusEmoji || "",
          type: "user" as const,
        })),
      ...agents
        .filter((a) => a.status !== "offline" && dist(a) <= INNER_RANGE)
        .map((a) => ({
          id: a.id,
          name: a.name,
          x: a.x,
          y: a.y,
          message: a.currentTask || `${a.name} is ${a.status}`,
          type: "agent" as const,
        })),
    ];

    return result;
  }, [myPosition.x, myPosition.y, users, agents, myUserId]);

  // Map chat bubbles to sender positions
  const activeChatBubbles = useMemo(() => {
    const now = Date.now();
    return chatBubbles
      .filter((b) => now - b.timestamp < BUBBLE_LIFETIME_MS)
      .map((bubble) => {
        const sender =
          users.find((u) => u.id === bubble.senderId) ??
          agents.find((a) => a.id === bubble.senderId);
        if (!sender) return null;
        return { ...bubble, senderX: sender.x, senderY: sender.y };
      })
      .filter(Boolean) as Array<{
        id: string;
        senderId: string;
        text: string;
        timestamp: number;
        senderX: number;
        senderY: number;
      }>;
  }, [chatBubbles, users, agents]);

  if (prefersReduced || (nearbyEntities.length === 0 && activeChatBubbles.length === 0)) {
    return null;
  }

  return (
    <>
      {/* Proximity status bubbles */}
      <AnimatePresence>
        {nearbyEntities.map((entity) => {
          const px = entity.x * TILE + TILE / 2;
          const py = entity.y * TILE - CHAR_H / 2 - 28;

          return (
            <motion.div
              key={`chat-${entity.id}`}
              className="absolute whitespace-nowrap"
              style={{
                left: px,
                top: py,
                transform: "translateX(-50%)",
                zIndex: 50,
                pointerEvents: "none",
              }}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div
                className="rounded-lg px-2.5 py-1.5 text-[10px] leading-tight shadow-lg"
                style={{
                  backgroundColor: "rgba(30, 27, 24, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.9)",
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entity.message || `${entity.name} is nearby`}
              </div>
              {/* Speech bubble tail */}
              <div
                className="mx-auto h-0 w-0"
                style={{
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: "4px solid rgba(30, 27, 24, 0.85)",
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* User-sent chat message bubbles */}
      <AnimatePresence>
        {activeChatBubbles.map((bubble) => {
          const bpx = bubble.senderX * TILE + TILE / 2;
          const bpy = bubble.senderY * TILE - CHAR_H / 2 - 44;

          return (
            <motion.div
              key={`msg-${bubble.id}`}
              className="absolute"
              style={{
                left: bpx,
                top: bpy,
                transform: "translateX(-50%)",
                zIndex: 51,
                pointerEvents: "none",
              }}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div
                className="rounded-lg px-2.5 py-1.5 text-[10px] leading-tight shadow-lg"
                style={{
                  backgroundColor: "rgba(255,107,0,0.9)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  maxWidth: 180,
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {bubble.text}
              </div>
              <div
                className="mx-auto h-0 w-0"
                style={{
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: "4px solid rgba(255,107,0,0.9)",
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </>
  );
}
