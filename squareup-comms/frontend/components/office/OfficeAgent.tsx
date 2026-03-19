/**
 * AI Agent avatar for the immersive office view.
 *
 * Enhanced circular avatar with agent icon, status ring, typing dots,
 * and task bubble. Themed via useOfficeTheme.
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OfficeAgent as AgentType } from "@/lib/stores/office-store";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { TILE } from "@/lib/office/office-renderer";

interface OfficeAgentProps {
  readonly agent: AgentType;
}

const AVATAR_SIZE = 38;
const TOTAL_H = AVATAR_SIZE + 18;

const AGENT_ACCENT: Readonly<Record<string, string>> = {
  "crm-agent": "#06B6D4",
  "github-agent": "#F43F5E",
  "meeting-agent": "#8B5CF6",
  "scheduler-agent": "#F59E0B",
};

const AGENT_STATUS_COLORS: Readonly<Record<string, string>> = {
  idle: "#22C55E",
  thinking: "#EAB308",
  working: "#4A90D9",
  error: "#EF4444",
  offline: "#9CA3AF",
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

export default function OfficeAgent({ agent }: OfficeAgentProps) {
  const { tokens } = useOfficeTheme();

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

  const accent = AGENT_ACCENT[agent.id] ?? tokens.accent;
  const statusColor = AGENT_STATUS_COLORS[agent.status] ?? tokens.textMuted;
  const isWorking = agent.status === "working" || agent.status === "thinking";
  const transition = prefersReduced ? { duration: 0 } : springTransition;

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        top: 0,
        left: 0,
        zIndex: 20 + agent.y,
        width: AVATAR_SIZE,
        height: TOTAL_H,
      }}
      animate={{
        x: agent.x * TILE + (TILE - AVATAR_SIZE) / 2,
        y: agent.y * TILE + (TILE - TOTAL_H) / 2,
      }}
      transition={transition}
      onClick={() => setSelectedEntity({ type: "agent", id: agent.id })}
    >
      {/* Ground shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 14,
          width: AVATAR_SIZE * 0.7,
          height: 6,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.18), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Breathing / float animation */}
      <motion.div
        animate={
          !prefersReduced
            ? { scale: [1, 1.02, 1], y: [0, -1, 0] }
            : {}
        }
        transition={
          !prefersReduced
            ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      >
        {/* Working glow */}
        {isWorking && !prefersReduced && (
          <div
            className="absolute rounded-full"
            style={{
              inset: -6,
              height: AVATAR_SIZE + 12,
              background: `radial-gradient(circle, ${accent}25, transparent 70%)`,
              animation: "pulse 2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Selection ring */}
        {isSelected && (
          <div
            className="absolute rounded-full"
            style={{
              inset: -3,
              height: AVATAR_SIZE + 6,
              border: `2px dashed ${accent}`,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Avatar circle */}
        <div
          className="relative flex items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            background: `linear-gradient(135deg, ${accent}20, ${accent}40)`,
            border: `2px solid ${accent}`,
            boxShadow: isWorking
              ? `0 0 12px ${accent}30, 0 2px 8px rgba(0,0,0,0.1)`
              : "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <span>{agent.icon}</span>

          {/* Status dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: 9,
              height: 9,
              backgroundColor: statusColor,
              border: `2px solid ${tokens.surface}`,
            }}
          />
        </div>
      </motion.div>

      {/* Agent name */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{ bottom: 0 }}
      >
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
          style={{
            backgroundColor: accent + "18",
            color: accent,
          }}
        >
          {agent.name}
        </span>
      </div>

      {/* Typing dots */}
      <AnimatePresence>
        {agent.visualState === "typing" && !prefersReduced && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 flex gap-1 rounded-full px-2.5 py-1.5 shadow-md"
            style={{
              top: -24,
              backgroundColor: tokens.surfaceElevated,
              border: `1px solid ${tokens.borderSubtle}`,
            }}
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tokens.textMuted }}
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
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] shadow-md"
            style={{
              top: -30,
              backgroundColor: tokens.surfaceElevated,
              color: tokens.text,
              border: `1px solid ${tokens.borderSubtle}`,
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {agent.currentTask}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desk items (personality props) */}
      {agent.personality.deskItems.length > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex gap-0.5"
          style={{ bottom: -4, pointerEvents: "none" }}
        >
          {agent.personality.deskItems.slice(0, 3).map((emoji, i) => (
            <span key={i} className="text-[8px]" style={{ opacity: 0.7 }}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
