/**
 * Detects `prefers-reduced-motion: reduce` and exposes
 * a reactive boolean + spring config helpers.
 *
 * Usage:
 *   const { prefersReduced, springConfig } = useReducedMotion();
 *   <motion.div transition={springConfig} />
 */

"use client";

import { useState, useEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

interface ReducedMotionResult {
  /** True when user prefers reduced motion */
  readonly prefersReduced: boolean;
  /** Framer Motion spring config — instant when reduced, smooth otherwise */
  readonly springConfig: { type: "spring"; stiffness: number; damping: number } | { duration: 0 };
  /** Returns duration 0 when reduced, otherwise the given value */
  readonly duration: (ms: number) => number;
}

export function useReducedMotion(): ReducedMotionResult {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(QUERY);

    const onChange = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const springConfig = prefersReduced
    ? ({ duration: 0 } as const)
    : ({ type: "spring" as const, stiffness: 300, damping: 25 });

  const duration = (ms: number) => (prefersReduced ? 0 : ms);

  return { prefersReduced, springConfig, duration };
}
