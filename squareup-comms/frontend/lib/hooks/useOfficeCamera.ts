/**
 * Camera hook for zoom, pan, and follow-player logic.
 * Uses spring-based camera with deadzone.
 */

"use client";

import { useEffect, useRef } from "react";
import { useOfficeStore } from "../stores/office-store";
import { TILE } from "../office/office-renderer";

interface CameraState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
}

interface UseCameraConfig {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly enabled: boolean;
}

export function useOfficeCamera(config: UseCameraConfig): CameraState {
  const zoom = useOfficeStore((s) => s.zoom);
  const setZoom = useOfficeStore((s) => s.setZoom);
  const cameraOffset = useOfficeStore((s) => s.cameraOffset);
  const setCameraOffset = useOfficeStore((s) => s.setCameraOffset);
  const myPosition = useOfficeStore((s) => s.myPosition);
  const layout = useOfficeStore((s) => s.layout);
  const followingEntity = useOfficeStore((s) => s.followingEntity);
  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const rafRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const targetComputedRef = useRef(false);
  const initializedRef = useRef(false);

  // Follow player or followed entity — compute target offset and clamp/center
  useEffect(() => {
    if (!config.enabled || !config.containerRef.current) return;

    const container = config.containerRef.current;
    const rect = container.getBoundingClientRect();
    const viewW = rect.width;
    const viewH = rect.height;

    // Determine which entity to follow
    let focusX = myPosition.x;
    let focusY = myPosition.y;

    if (followingEntity) {
      const target =
        followingEntity.type === "user"
          ? users.find((u) => u.id === followingEntity.id)
          : agents.find((a) => a.id === followingEntity.id);
      if (target) {
        focusX = target.x;
        focusY = target.y;
      }
    }

    // Iso screen position of focus tile (matches tileToIso formula)
    const isoX = (focusX - focusY) * TILE + layout.gridRows * TILE;
    const isoY = (focusX + focusY + 1) * (TILE / 2);
    const playerCenterX = isoX * zoom;
    const playerCenterY = isoY * zoom;

    const targetX = viewW / 2 - playerCenterX;
    const targetY = viewH / 2 - playerCenterY;

    const totalW = (layout.gridCols + layout.gridRows) * TILE * zoom;
    const totalH = (layout.gridCols + layout.gridRows) * (TILE / 2) * zoom;

    // When viewport is larger than office, center the office.
    // When office is larger, clamp so edges don't go past viewport edges.
    const clampedX =
      totalW <= viewW
        ? (viewW - totalW) / 2
        : Math.min(0, Math.max(viewW - totalW, targetX));
    const clampedY =
      totalH <= viewH
        ? (viewH - totalH) / 2
        : Math.min(0, Math.max(viewH - totalH, targetY));

    targetRef.current = { x: clampedX, y: clampedY };
    targetComputedRef.current = true;
  }, [myPosition, zoom, layout, config.enabled, config.containerRef, followingEntity, users, agents]);

  // Smooth camera with RAF
  // NOTE: cameraOffset must NOT be in the dep array — reading it inside RAF
  // would cause: setCameraOffset → cameraOffset changes → effect re-runs → restart RAF → loop.
  // We seed the ref from the store once and let the RAF own the local state.
  const cameraRef = useRef({ x: cameraOffset.x, y: cameraOffset.y });

  useEffect(() => {
    if (!config.enabled) return;

    const DAMPING = 0.12;
    let currentX = cameraRef.current.x;
    let currentY = cameraRef.current.y;

    const animate = () => {
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;

      // Wait until the target has been computed at least once
      if (!targetComputedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // On first frame after target is ready, teleport camera instantly (no damping drift)
      if (!initializedRef.current) {
        initializedRef.current = true;
        currentX = tx;
        currentY = ty;
        cameraRef.current = { x: currentX, y: currentY };
        setCameraOffset(Math.round(currentX), Math.round(currentY));
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const dx = tx - currentX;
      const dy = ty - currentY;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        currentX += dx * DAMPING;
        currentY += dy * DAMPING;
        cameraRef.current = { x: currentX, y: currentY };
        setCameraOffset(Math.round(currentX), Math.round(currentY));
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config.enabled, setCameraOffset]); // ← no cameraOffset dep — that's intentional


  // Mouse wheel zoom
  useEffect(() => {
    if (!config.enabled || !config.containerRef.current) return;
    const container = config.containerRef.current;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.002;
        setZoom(zoom + delta);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [config.enabled, config.containerRef, zoom, setZoom]);

  return {
    offsetX: cameraOffset.x,
    offsetY: cameraOffset.y,
    zoom,
  };
}
