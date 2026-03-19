/**
 * Enhanced avatar character for the immersive (pixel) office view.
 *
 * Renders a circular avatar with profile picture or initials + gradient,
 * status ring, name label, and activity indicators. Uses Framer Motion
 * for smooth tile-to-tile interpolation.
 *
 * Positioned using isometric coordinates via tileToIso().
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OfficeUser } from "@/lib/stores/office-store";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { tileToIso } from "@/lib/office/iso-coords";

interface OfficeCharacterProps {
  readonly user: OfficeUser;
  readonly isMe: boolean;
}

const AVATAR_SIZE = 40;
const TOTAL_H = AVATAR_SIZE + 18; // avatar + name label space

const STATUS_COLORS: Readonly<Record<string, string>> = {
  online: "#22C55E",
  away: "#EAB308",
  busy: "#EF4444",
  dnd: "#EF4444",
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

export default function OfficeCharacter({ user, isMe }: OfficeCharacterProps) {
  const { tokens } = useOfficeTheme();
  const gridRows = useOfficeStore((s) => s.layout.gridRows);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  const selectedEntity = useOfficeStore((s) => s.selectedEntity);
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const followingEntity = useOfficeStore((s) => s.followingEntity);
  const setFollowingEntity = useOfficeStore((s) => s.setFollowingEntity);

  const isSelected =
    selectedEntity?.type === "user" && selectedEntity?.id === user.id;
  const isFollowed =
    followingEntity?.type === "user" && followingEntity?.id === user.id;

  const statusColor = STATUS_COLORS[user.status] ?? tokens.textMuted;
  const transition = prefersReduced ? { duration: 0 } : springTransition;

  const avatarGradient = isMe
    ? `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentHover})`
    : `linear-gradient(135deg, ${user.appearance.shirtColor}, ${user.appearance.hairColor})`;

  // Isometric position: center of the tile diamond
  const isoPos = tileToIso(user.x, user.y, gridRows);

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        top: 0,
        left: 0,
        // Depth sort: entities with higher (x+y) sum are "further south" = higher z
        zIndex: 20 + user.x + user.y,
        width: AVATAR_SIZE,
        height: TOTAL_H,
      }}
      animate={{
        x: isoPos.x - AVATAR_SIZE / 2,
        y: isoPos.y - TOTAL_H / 2,
      }}
      transition={transition}
      onClick={() => {
        setSelectedEntity({ type: "user", id: user.id });
      }}
      onDoubleClick={() => {
        if (!isMe) {
          setFollowingEntity({ type: "user", id: user.id });
        }
      }}
    >
      {/* Ground shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 14,
          width: AVATAR_SIZE * 0.8,
          height: 8,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.2), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Idle bob / walk animation */}
      <motion.div
        animate={
          user.animationState === "walking" && !prefersReduced
            ? { y: [0, -3, 0, -3, 0] }
            : user.animationState === "idle" && !prefersReduced
              ? { y: [0, -1.5, 0] }
              : { y: 0 }
        }
        transition={
          user.animationState === "walking" && !prefersReduced
            ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
            : user.animationState === "idle" && !prefersReduced
              ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0 }
        }
      >
        {/* Selection / follow ring */}
        {(isSelected || isFollowed) && (
          <div
            className="absolute rounded-full"
            style={{
              inset: -3,
              height: AVATAR_SIZE + 6,
              border: `2px ${isFollowed ? "solid" : "dashed"} ${tokens.accent}`,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />
        )}

        {/* "Me" pulse ring */}
        {isMe && !prefersReduced && (
          <div
            className="absolute rounded-full"
            style={{
              inset: -4,
              height: AVATAR_SIZE + 8,
              border: `2px solid ${tokens.accent}`,
              opacity: 0.15,
              animation: "pulse 3s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Avatar circle */}
        <div
          className="relative flex items-center justify-center rounded-full text-sm font-bold text-white transition-transform hover:scale-110"
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            background: avatarGradient,
            border: `2.5px solid ${statusColor}`,
            boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
          }}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span style={{ fontSize: 15 }}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}

          {/* Status dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: 10,
              height: 10,
              backgroundColor: statusColor,
              border: `2px solid ${tokens.surface}`,
            }}
          />
        </div>

        {/* Status emoji floating above */}
        {user.statusEmoji && (
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 text-sm"
            style={{ pointerEvents: "none" }}
          >
            {user.statusEmoji}
          </div>
        )}
      </motion.div>

      {/* Name label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{ bottom: 0 }}
      >
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none"
          style={{
            backgroundColor: isMe
              ? tokens.accent + "CC"
              : tokens.glass,
            color: isMe ? "#FFFFFF" : tokens.textSecondary,
            backdropFilter: isMe ? "none" : "blur(8px)",
          }}
        >
          {isMe ? "You" : user.name}
        </span>
      </div>

      {/* Activity bubble */}
      <AnimatePresence>
        {user.activity && isSelected && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] shadow-md"
            style={{
              top: -28,
              backgroundColor: tokens.surfaceElevated,
              color: tokens.text,
              border: `1px solid ${tokens.borderSubtle}`,
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {user.statusEmoji && (
              <span className="mr-1">{user.statusEmoji}</span>
            )}
            {user.activity}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
