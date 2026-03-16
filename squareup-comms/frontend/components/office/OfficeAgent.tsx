/**
 * AI Agent avatar with personality-driven idle behaviors and status animations.
 * Uses canvas sprite for the robot body and Framer Motion for movement/effects.
 */

"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OfficeAgent as AgentType } from "@/lib/stores/office-store";
import { useOfficeStore } from "@/lib/stores/office-store";
import { TILE } from "@/lib/office/office-renderer";
import { generateAgentSprite, CHAR_W, CHAR_H } from "@/lib/office/character-generator";

interface OfficeAgentProps {
  readonly agent: AgentType;
}

const AGENT_COLORS: Record<string, string> = {
  "crm-agent": "#06b6d4",
  "github-agent": "#f43f5e",
  "meeting-agent": "#8b5cf6",
  "scheduler-agent": "#f59e0b",
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

export default function OfficeAgent({ agent }: OfficeAgentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    selectedEntity?.type === "agent" && selectedEntity?.id === agent.id;

  const color = AGENT_COLORS[agent.id] ?? "#4a90d9";

  // Draw agent sprite
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sprite = generateAgentSprite(color, agent.icon, agent.status);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CHAR_W, CHAR_H);
    ctx.drawImage(sprite, 0, 0);
  }, [agent.status, agent.icon, color]);

  const transition = prefersReduced ? { duration: 0 } : springTransition;

  const isWorking = agent.status === "working" || agent.status === "thinking";

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        top: 0,
        left: 0,
        zIndex: 20 + agent.y,
        width: CHAR_W,
        height: CHAR_H,
      }}
      animate={{
        x: agent.x * TILE + (TILE - CHAR_W) / 2,
        y: agent.y * TILE + (TILE - CHAR_H),
      }}
      transition={transition}
      onClick={() => setSelectedEntity({ type: "agent", id: agent.id })}
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

      {/* Breathing / float animation */}
      <motion.div
        animate={
          !prefersReduced
            ? {
                scale: [1, 1.02, 1],
                y: [0, -1, 0],
              }
            : {}
        }
        transition={
          !prefersReduced
            ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
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

      {/* Agent name */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {agent.name}
        </span>
      </div>

      {/* Working glow */}
      {isWorking && !prefersReduced && (
        <div
          className="office-agent-glow absolute -inset-2 rounded-full"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Status indicator */}
      <div
        className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full text-[6px]"
        style={{
          backgroundColor:
            agent.status === "working"
              ? "#4a90d9"
              : agent.status === "thinking"
                ? "#eab308"
                : agent.status === "error"
                  ? "#ef4444"
                  : agent.status === "offline"
                    ? "#999"
                    : "#22c55e",
          border: "1.5px solid white",
        }}
      />

      {/* Typing dots when working */}
      <AnimatePresence>
        {agent.visualState === "typing" && !prefersReduced && (
          <motion.div
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 rounded-full px-2.5 py-1.5 shadow-md"
            style={{ backgroundColor: "rgba(30, 27, 24, 0.85)" }}
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-white/70"
                animate={{ y: [-1, 1, -1] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current task bubble */}
      <AnimatePresence>
        {agent.currentTask && isSelected && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-[10px] text-gray-700 shadow-md dark:bg-gray-800/95 dark:text-gray-200"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {agent.currentTask}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection ring */}
      {isSelected && (
        <div
          className="absolute -inset-1 rounded-full border-2 border-dashed"
          style={{ borderColor: color, pointerEvents: "none" }}
        />
      )}

      {/* Desk items (personality props) */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5">
        {agent.personality.deskItems.slice(0, 3).map((emoji, i) => (
          <span key={i} className="text-[10px]" style={{ opacity: 0.8 }}>
            {emoji}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
