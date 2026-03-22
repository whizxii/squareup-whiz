/**
 * Shared Framer Motion variants for CRM components.
 *
 * Centralises animation tokens so every CRM surface uses the same spring
 * physics, durations, and easing curves.
 */

import type { Variants, Transition } from "framer-motion";

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

/** Snappy spring — buttons, small UI elements */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 28,
};

/** Standard spring — panels, cards, modals */
export const SPRING_STANDARD: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 24,
};

/** Gentle spring — page transitions, large layout shifts */
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 22,
};

// ---------------------------------------------------------------------------
// View / page transition
// ---------------------------------------------------------------------------

/** Crossfade with subtle vertical movement for view switching */
export const viewTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const viewTransitionConfig: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

// ---------------------------------------------------------------------------
// Slide-in panels (copilot, detail drawers)
// ---------------------------------------------------------------------------

/** Slide in from right */
export const slideInRight: Variants = {
  initial: { x: "100%", opacity: 0.8 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0.8 },
};

/** Slide in from left */
export const slideInLeft: Variants = {
  initial: { x: "-100%", opacity: 0.8 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "-100%", opacity: 0.8 },
};

// ---------------------------------------------------------------------------
// Fade + scale (modals, popovers, toasts)
// ---------------------------------------------------------------------------

export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ---------------------------------------------------------------------------
// List / stagger children
// ---------------------------------------------------------------------------

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

// ---------------------------------------------------------------------------
// Celebration (deal won, milestone)
// ---------------------------------------------------------------------------

export const celebrationPop: Variants = {
  initial: { opacity: 0, scale: 0.6, y: -20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: -30 },
};

// ---------------------------------------------------------------------------
// Score / counter animation
// ---------------------------------------------------------------------------

export const counterPulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.35, ease: "easeInOut" },
  },
};

// ---------------------------------------------------------------------------
// Backdrop overlay
// ---------------------------------------------------------------------------

export const backdropFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
