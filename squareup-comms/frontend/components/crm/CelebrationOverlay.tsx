"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { celebrationPop, SPRING_SNAPPY } from "@/lib/animations/crm-variants";
import { Trophy } from "lucide-react";

// ─── Confetti Particle ──────────────────────────────────────────

interface Particle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly rotation: number;
  readonly scale: number;
  readonly delay: number;
}

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#a855f7", "#14b8a6", "#f97316", "#ec4899",
];

function generateParticles(count: number): readonly Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 80,
    y: 50 + (Math.random() - 0.5) * 60,
    color: COLORS[i % COLORS.length],
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.8,
    delay: Math.random() * 0.3,
  }));
}

// ─── Celebration Overlay ────────────────────────────────────────

interface CelebrationOverlayProps {
  readonly show: boolean;
  readonly dealName?: string;
  readonly dealValue?: number;
  readonly onDismiss: () => void;
}

export function CelebrationOverlay({
  show,
  dealName,
  dealValue,
  onDismiss,
}: CelebrationOverlayProps) {
  const [particles] = useState(() => generateParticles(24));

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
          onClick={onDismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 0,
                x: "50%",
                y: "50%",
                scale: 0,
                rotate: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: `${p.x}%`,
                y: `${p.y}%`,
                scale: p.scale,
                rotate: p.rotation,
              }}
              transition={{
                duration: 1.5,
                delay: p.delay,
                ease: "easeOut",
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
          ))}

          {/* Center card */}
          <motion.div
            variants={celebrationPop}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={SPRING_SNAPPY}
            className="relative z-10 rounded-2xl bg-background border border-border shadow-2xl px-8 py-6 text-center max-w-sm"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Trophy className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Deal Won!
            </h3>
            {dealName && (
              <p className="text-sm text-muted-foreground mt-1">{dealName}</p>
            )}
            {dealValue != null && dealValue > 0 && (
              <motion.p
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, ...SPRING_SNAPPY }}
                className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2"
              >
                ${dealValue.toLocaleString()}
              </motion.p>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Click anywhere to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hook for triggering celebrations ───────────────────────────

interface CelebrationData {
  readonly dealName?: string;
  readonly dealValue?: number;
}

export function useCelebration() {
  const [state, setState] = useState<{
    readonly show: boolean;
    readonly data: CelebrationData;
  }>({ show: false, data: {} });

  const celebrate = useCallback((data: CelebrationData = {}) => {
    setState({ show: true, data });
  }, []);

  const dismiss = useCallback(() => {
    setState((s) => ({ ...s, show: false }));
  }, []);

  return {
    show: state.show,
    data: state.data,
    celebrate,
    dismiss,
  } as const;
}
