/**
 * Multi-layer canvas for the office floor, zones, furniture, and ambient overlays.
 * Layer 0: Floor (repaints on theme/floor style change)
 * Layer 1: Zones + furniture + grid (repaints on edit/furniture change)
 * Layer 2: Day/night + light shafts (repaints on dayPhase change)
 *
 * Renders in isometric 2.5D projection using ctx.transform(1, 0.5, -1, 0.5, ...).
 * All top-down fillRect calls become isometric diamonds automatically.
 */

"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useOfficeStore } from "@/lib/stores/office-store";
import {
  TILE,
  renderFloor,
  renderZones,
  renderGrid,
  renderFurniture,
  renderDayNightOverlay,
  renderLightShafts,
} from "@/lib/office/office-renderer";
import { isoCanvasSize, isoToTile } from "@/lib/office/iso-coords";

interface OfficeCanvasProps {
  readonly onClick?: (tileX: number, tileY: number) => void;
}

export default function OfficeCanvas({ onClick }: OfficeCanvasProps) {
  const floorRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<HTMLCanvasElement>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const layout = useOfficeStore((s) => s.layout);
  const zones = useOfficeStore((s) => s.zones);
  const furniture = useOfficeStore((s) => s.furniture);
  const showGrid = useOfficeStore((s) => s.showGrid);
  const dayPhase = useOfficeStore((s) => s.dayPhase);

  const { gridCols, gridRows, floorStyle } = layout;

  // Isometric canvas dimensions
  const { width: canvasW, height: canvasH } = isoCanvasSize(gridCols, gridRows);

  // Setup HiDPI canvas (DPR transform only — iso transform applied per layer)
  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
      if (!canvas) return null;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = `${canvasW}px`;
      canvas.style.height = `${canvasH}px`;
      const ctx = canvas.getContext("2d", { alpha: canvas !== floorRef.current });
      if (!ctx) return null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    },
    [canvasW, canvasH]
  );

  // Layer 0: Floor — apply iso transform, then render
  useEffect(() => {
    const ctx = setupCanvas(floorRef.current);
    if (!ctx) return;
    // Apply isometric projection: fillRect calls become diamond tiles
    ctx.transform(1, 0.5, -1, 0.5, gridRows * TILE, 0);
    renderFloor(ctx, gridCols, gridRows, floorStyle, isDark);
  }, [setupCanvas, gridCols, gridRows, floorStyle, isDark]);

  // Layer 1: Content (zones + furniture + grid)
  useEffect(() => {
    const ctx = setupCanvas(contentRef.current);
    if (!ctx) return;
    // clearRect BEFORE iso transform (uses DPR-only space = full canvas)
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.transform(1, 0.5, -1, 0.5, gridRows * TILE, 0);
    renderZones(ctx, zones, showGrid);
    renderFurniture(ctx, furniture, isDark, dayPhase === "dusk" || dayPhase === "night");
    if (showGrid) {
      renderGrid(ctx, gridCols, gridRows, isDark);
    }
  }, [setupCanvas, zones, furniture, showGrid, gridCols, gridRows, isDark, dayPhase, canvasW, canvasH]);

  // Layer 2: Ambient overlay — NO iso transform (flat full-canvas color tint)
  useEffect(() => {
    const ctx = setupCanvas(ambientRef.current);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasW, canvasH);
    renderDayNightOverlay(ctx, canvasW, canvasH, dayPhase);
    renderLightShafts(ctx, canvasW, canvasH, dayPhase);
  }, [setupCanvas, dayPhase, canvasW, canvasH]);

  // Click-to-move: convert screen position back to tile coords via inverse iso math
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      // Scale from CSS pixels to canvas logical pixels
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      const sx = (e.clientX - rect.left) * scaleX;
      const sy = (e.clientY - rect.top) * scaleY;
      const { x, y } = isoToTile(sx, sy, gridRows);
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      if (tileX >= 0 && tileX < gridCols && tileY >= 0 && tileY < gridRows) {
        onClick(tileX, tileY);
      }
    },
    [onClick, gridCols, gridRows, canvasW, canvasH]
  );

  const canvasStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    imageRendering: "pixelated",
  };

  return (
    <div
      className="relative"
      style={{ width: canvasW, height: canvasH }}
      onClick={handleClick}
    >
      <canvas ref={floorRef} style={{ ...canvasStyle, zIndex: 1 }} />
      <canvas ref={contentRef} style={{ ...canvasStyle, zIndex: 2 }} />
      <canvas ref={ambientRef} style={{ ...canvasStyle, zIndex: 3, pointerEvents: "none", transition: "opacity 2s ease" }} />
    </div>
  );
}
