/**
 * Pixel art character rendered from procedural sprite sheet.
 * Uses Framer Motion for smooth tile-to-tile movement.
 * Displays name label and status indicators.
 */

"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { OfficeUser } from "@/lib/stores/office-store";
import { useOfficeStore } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";
import {
  getCachedSpriteSheet,
  CHAR_W,
  CHAR_H,
} from "@/lib/office/character-generator";

interface OfficeCharacterProps {
  readonly user: OfficeUser;
  readonly isMe: boolean;
}

const WALK_FRAME_MS = 200;
const SPRITE_W = 16;
const SCALE = 3;

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  away: "#eab308",
  busy: "#ef4444",
  dnd: "#ef4444",
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

export default function OfficeCharacter({ user, isMe }: OfficeCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  const selectedEntity = useOfficeStore((s) => s.selectedEntity);
  const setSelectedEntity = useOfficeStore((s) => s.setSelectedEntity);
  const isSelected =
    selectedEntity?.type === "user" && selectedEntity?.id === user.id;

  // Draw current sprite frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sheet = getCachedSpriteSheet(user.appearance, user.direction);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawFrame = () => {
      const frame = frameRef.current % 4;
      ctx.clearRect(0, 0, CHAR_W, CHAR_H);
      ctx.drawImage(
        sheet,
        frame * SPRITE_W * SCALE,
        0,
        SPRITE_W * SCALE,
        CHAR_H,
        0,
        0,
        CHAR_W,
        CHAR_H
      );
    };

    drawFrame();

    // Walk animation cycle
    if (user.animationState === "walking" && !prefersReduced) {
      if (animRef.current) clearInterval(animRef.current);
      animRef.current = setInterval(() => {
        frameRef.current += 1;
        drawFrame();
      }, WALK_FRAME_MS);
    } else {
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
      frameRef.current = 0;
      drawFrame();
    }

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [user.direction, user.animationState, user.appearance, prefersReduced]);

  const transition = prefersReduced ? { duration: 0 } : springTransition;

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        top: 0,
        left: 0,
        zIndex: 20 + user.y,
        width: CHAR_W,
        height: CHAR_H,
      }}
      animate={{
        x: user.x * TILE + (TILE - CHAR_W) / 2,
        y: user.y * TILE + (TILE - CHAR_H),
      }}
      transition={transition}
      onClick={() => {
        if (!isMe) {
          setSelectedEntity({ type: "user", id: user.id });
        }
      }}
    >
      {/* Ground shadow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: CHAR_W * 0.7,
          height: 6,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.25), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Idle bob animation */}
      <motion.div
        animate={
          user.animationState === "idle" && !prefersReduced
            ? { y: [0, -2, 0] }
            : { y: 0 }
        }
        transition={
          user.animationState === "idle" && !prefersReduced
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      >
        <canvas
          ref={canvasRef}
          width={CHAR_W}
          height={CHAR_H}
          style={{ imageRendering: "pixelated", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))" }}
        />
      </motion.div>

      {/* Name label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
          style={{
            backgroundColor: isMe ? "rgba(255,107,0,0.8)" : "rgba(0,0,0,0.5)",
            color: isMe ? "#fff" : "rgba(255,255,255,0.9)",
          }}
        >
          {user.name}
        </span>
      </div>

      {/* Status dot */}
      <div
        className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white"
        style={{ backgroundColor: STATUS_COLORS[user.status] ?? "#999" }}
      />

      {/* "Me" pulse ring */}
      {isMe && !prefersReduced && (
        <div
          className="office-pulse-me absolute -inset-1 rounded-full"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <div
          className="absolute -inset-1 rounded-full border-2 border-dashed"
          style={{ borderColor: "#FF6B00", pointerEvents: "none" }}
        />
      )}

      {/* Status emoji */}
      {user.statusEmoji && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm">
          {user.statusEmoji}
        </div>
      )}
    </motion.div>
  );
}
