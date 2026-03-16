"use client";

import { useRef, useCallback } from "react";

interface SwipeActionOptions {
  /** Minimum distance in px to trigger the action (default: 80) */
  threshold?: number;
  /** Direction of swipe (default: "right") */
  direction?: "left" | "right";
  /** Callback when swipe threshold is met and touch ends */
  onSwipe: () => void;
  /** Optional callback during swipe with progress 0-1 */
  onProgress?: (progress: number) => void;
  /** Optional callback when swipe is cancelled */
  onCancel?: () => void;
  /** Max distance for visual feedback (default: 100) */
  maxDistance?: number;
}

/**
 * Touch swipe gesture hook for mobile interactions.
 * Returns ref + touch handlers to attach to the swipeable element.
 * Used for swipe-to-reply (WhatsApp/Telegram pattern).
 */
export function useSwipeAction({
  threshold = 80,
  direction = "right",
  onSwipe,
  onProgress,
  onCancel,
  maxDistance = 100,
}: SwipeActionOptions) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const swipingRef = useRef(false);
  const triggeredRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    swipingRef.current = false;
    triggeredRef.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (triggeredRef.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      // If vertical movement is dominant, don't intercept (allow scroll)
      if (!swipingRef.current && Math.abs(dy) > Math.abs(dx)) {
        return;
      }

      const isCorrectDirection =
        direction === "right" ? dx > 0 : dx < 0;

      if (!isCorrectDirection) return;

      const absDx = Math.abs(dx);

      // Once we detect horizontal swipe intent, lock it in
      if (absDx > 10) {
        swipingRef.current = true;
      }

      if (swipingRef.current) {
        // Prevent vertical scrolling during horizontal swipe
        e.preventDefault();

        const clampedDistance = Math.min(absDx, maxDistance);
        const progress = clampedDistance / threshold;
        onProgress?.(Math.min(progress, 1));
      }
    },
    [direction, threshold, maxDistance, onProgress]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!swipingRef.current || triggeredRef.current) {
        swipingRef.current = false;
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startXRef.current;
      const absDx = Math.abs(dx);
      const isCorrectDirection =
        direction === "right" ? dx > 0 : dx < 0;

      if (isCorrectDirection && absDx >= threshold) {
        triggeredRef.current = true;
        onSwipe();
      } else {
        onCancel?.();
      }

      // Reset progress
      onProgress?.(0);
      swipingRef.current = false;
    },
    [direction, threshold, onSwipe, onCancel, onProgress]
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
