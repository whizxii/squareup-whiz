/**
 * First-time onboarding overlay — 3-step guided tour.
 * Persisted via localStorage flag.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Move, MousePointer, Pencil } from "lucide-react";

const STORAGE_KEY = "sq-office-onboarded";

interface OnboardingStep {
  readonly icon: typeof Move;
  readonly title: string;
  readonly description: string;
}

const STEPS: readonly OnboardingStep[] = [
  {
    icon: Move,
    title: "Move Around",
    description: "Use WASD or arrow keys to explore your office. Click any tile to walk there.",
  },
  {
    icon: MousePointer,
    title: "Interact",
    description: "Walk near an agent to see their status. Click anyone to view details and actions.",
  },
  {
    icon: Pencil,
    title: "Customize",
    description: "Click the pencil icon in the toolbar to enter edit mode. Add furniture and create zones.",
  },
];

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  }, [step, handleDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Card */}
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 p-6 shadow-2xl"
            style={{
              backgroundColor: "rgba(30, 25, 20, 0.95)",
              backdropFilter: "blur(24px) saturate(180%)",
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            {/* Skip */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/60"
              aria-label="Skip onboarding"
            >
              <X size={14} />
            </button>

            {/* Welcome header (step 0 only) */}
            {step === 0 && (
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#FF6B00]">
                Welcome to your office
              </p>
            )}

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center"
              >
                {/* Icon */}
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00]/15">
                  {(() => {
                    const StepIcon = STEPS[step].icon;
                    return <StepIcon size={24} className="text-[#FF6B00]" />;
                  })()}
                </div>

                <h3 className="mb-2 text-base font-semibold text-white/90">
                  {STEPS[step].title}
                </h3>
                <p className="mb-5 text-xs leading-relaxed text-white/50">
                  {STEPS[step].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step indicators + button */}
            <div className="flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === step ? 16 : 6,
                      backgroundColor:
                        i === step ? "#FF6B00" : "rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
              </div>

              {/* Next / Got it */}
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-[#FF6B00] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#e56000]"
              >
                {step < STEPS.length - 1 ? (
                  <>
                    Next <ArrowRight size={12} />
                  </>
                ) : (
                  "Got it!"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
