/**
 * WASD / Arrow key movement hook for the virtual office.
 * Handles hold-to-repeat, collision detection, and reduced motion.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Direction } from "../stores/office-store";
import { useOfficeStore } from "../stores/office-store";
import { getCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { buildWalkableGrid, getBlockedTiles, findPath } from "../office/pathfinding";
import { TILE } from "../office/office-renderer";

interface KeyboardConfig {
  readonly enabled: boolean;
  readonly onToggleMinimap?: () => void;
  readonly onToggleEditMode?: () => void;
  readonly onToggleListView?: () => void;
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

const DIR_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const REPEAT_DELAY = 150;

export function useOfficeKeyboard(config: KeyboardConfig): void {
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeKey = useRef<string | null>(null);

  const moveUser = useOfficeStore((s) => s.moveUser);
  const updateUserAnimation = useOfficeStore((s) => s.updateUserAnimation);
  const setMyPosition = useOfficeStore((s) => s.setMyPosition);
  const setZoom = useOfficeStore((s) => s.setZoom);

  const move = useCallback(
    (direction: Direction) => {
      const state = useOfficeStore.getState();
      const user = state.users.find((u) => u.id === getCurrentUserId());
      if (!user) return;

      const { dx, dy } = DIR_DELTAS[direction];
      const nx = user.x + dx;
      const ny = user.y + dy;

      const { layout, furniture } = state;
      const { gridCols, gridRows } = layout;

      // Bounds check
      if (nx < 0 || nx >= gridCols || ny < 0 || ny >= gridRows) return;

      // Collision check
      const blocked = getBlockedTiles(furniture);
      if (blocked.has(`${nx},${ny}`)) return;

      // Use getState() for actions to avoid dependency cycles that trigger the useEffect
      state.moveUser(getCurrentUserId(), nx, ny, direction);
      state.setMyPosition(nx, ny);
    },
    [] // stable — no deps needed
  );

  const stopRepeat = useCallback(() => {
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
    activeKey.current = null;
    // Use getState() to avoid putting updateUserAnimation in deps (would cause infinite loop
    // via: stopRepeat dep changes → effect cleanup fires → updateUserAnimation → store update
    // → selector changes → effect re-runs → repeat)
    useOfficeStore.getState().updateUserAnimation(getCurrentUserId(), "idle");
  }, []); // stable — no deps needed


  useEffect(() => {
    if (!config.enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const direction = KEY_TO_DIRECTION[e.key];
      if (direction) {
        e.preventDefault();
        if (activeKey.current === e.key) return; // already repeating
        stopRepeat();
        activeKey.current = e.key;
        // Cancel follow mode when user moves
        useOfficeStore.getState().setFollowingEntity(null);
        move(direction);
        updateUserAnimation(getCurrentUserId(), "walking", direction);
        repeatTimer.current = setInterval(() => move(direction), REPEAT_DELAY);
        return;
      }

      // Zoom shortcuts
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const zoom = useOfficeStore.getState().zoom;
        setZoom(zoom + 0.1);
      }
      if (e.key === "-") {
        e.preventDefault();
        const zoom = useOfficeStore.getState().zoom;
        setZoom(zoom - 0.1);
      }
      if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }

      // Toggle shortcuts
      if (e.key === "m" || e.key === "M") {
        config.onToggleMinimap?.();
      }
      if (e.key === "l" || e.key === "L") {
        config.onToggleListView?.();
      }
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        config.onToggleEditMode?.();
      }
      if (e.key === "Escape") {
        useOfficeStore.getState().setSelectedEntity(null);
        useOfficeStore.getState().setEditMode(false);
        useOfficeStore.getState().setFollowingEntity(null);
      }

      // "E" key — select nearest entity within proximity
      if (e.key === "e" || e.key === "E") {
        if (e.ctrlKey) return; // Ctrl+E is edit mode toggle
        const state = useOfficeStore.getState();
        const me = state.users.find((u) => u.id === getCurrentUserId());
        if (!me) return;

        const INTERACT_RANGE = 3;

        // Collect nearby entities (excluding self)
        const nearby: { type: "user" | "agent"; id: string; dist: number }[] = [];

        for (const u of state.users) {
          if (u.id === getCurrentUserId()) continue;
          const dist = Math.sqrt((me.x - u.x) ** 2 + (me.y - u.y) ** 2);
          if (dist <= INTERACT_RANGE) {
            nearby.push({ type: "user", id: u.id, dist });
          }
        }
        for (const a of state.agents) {
          const dist = Math.sqrt((me.x - a.x) ** 2 + (me.y - a.y) ** 2);
          if (dist <= INTERACT_RANGE) {
            nearby.push({ type: "agent", id: a.id, dist });
          }
        }

        if (nearby.length === 0) return;

        // Sort by distance, pick nearest
        nearby.sort((a, b) => a.dist - b.dist);
        const nearest = nearby[0];

        // Toggle: if already selected, deselect
        const current = state.selectedEntity;
        if (current?.type === nearest.type && current?.id === nearest.id) {
          state.setSelectedEntity(null);
        } else {
          state.setSelectedEntity({ type: nearest.type, id: nearest.id });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeKey.current === e.key) {
        stopRepeat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      stopRepeat();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [config, move, stopRepeat, updateUserAnimation, setZoom]);
}
