"use client";

import { cn } from "@/lib/utils";
import { Sparkles, PartyPopper, Rocket } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EffectType } from "./MessageEffects";

interface EffectPickerProps {
  onSelect: (effect: EffectType) => void;
}

interface EffectOption {
  id: EffectType;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  description: string;
}

const EFFECTS: readonly EffectOption[] = [
  {
    id: "confetti",
    label: "Confetti",
    emoji: "\u{1F389}",
    icon: <PartyPopper className="w-4 h-4" />,
    description: "Shower of confetti",
  },
  {
    id: "balloons",
    label: "Balloons",
    emoji: "\u{1F388}",
    icon: <span className="text-sm">{"\u{1F388}"}</span>,
    description: "Floating balloons",
  },
  {
    id: "fireworks",
    label: "Fireworks",
    emoji: "\u{1F386}",
    icon: <Rocket className="w-4 h-4" />,
    description: "Celebration fireworks",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    emoji: "\u2728",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Magical sparkles",
  },
] as const;

export function EffectPicker({ onSelect }: EffectPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = useCallback(
    (effect: EffectType) => {
      setOpen(false);
      onSelect(effect);
    },
    [onSelect]
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Send with effect"
        aria-label="Send with effect"
        aria-expanded={open}
        className={cn(
          "p-1.5 rounded transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Send with effect
              </span>
            </div>
            <div className="py-1">
              {EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  onClick={() => handleSelect(effect.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors duration-75"
                >
                  <span className="text-lg">{effect.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {effect.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {effect.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
