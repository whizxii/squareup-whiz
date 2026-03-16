/**
 * Multi-layer canvas for the office floor, zones, furniture, and ambient overlays.
 * Layer 0: Floor (repaints on theme/floor style change)
 * Layer 1: Zones + furniture + grid (repaints on edit/furniture change)
 * Layer 2: Day/night + light shafts (repaints on dayPhase change)
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
  const canvasW = gridCols * TILE;
  const canvasH = gridRows * TILE;

  // Setup HiDPI canvas
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

  // Layer 0: Floor
  useEffect(() => {
    const ctx = setupCanvas(floorRef.current);
    if (!ctx) return;
    renderFloor(ctx, gridCols, gridRows, floorStyle, isDark);
  }, [setupCanvas, gridCols, gridRows, floorStyle, isDark]);

  // Layer 1: Content (zones + furniture + grid)
  useEffect(() => {
    const ctx = setupCanvas(contentRef.current);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasW, canvasH);
    renderZones(ctx, zones, showGrid);
    renderFurniture(ctx, furniture, isDark, dayPhase === "dusk" || dayPhase === "night");
    if (showGrid) {
      renderGrid(ctx, gridCols, gridRows, isDark);
    }
  }, [setupCanvas, zones, furniture, showGrid, gridCols, gridRows, isDark, dayPhase, canvasW, canvasH]);

  // Layer 2: Ambient overlay
  useEffect(() => {
    const ctx = setupCanvas(ambientRef.current);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasW, canvasH);
    renderDayNightOverlay(ctx, canvasW, canvasH, dayPhase);
    renderLightShafts(ctx, canvasW, canvasH, dayPhase);
  }, [setupCanvas, dayPhase, canvasW, canvasH]);

  // Click-to-move handler
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const tileW = rect.width / gridCols;
      const tileH = rect.height / gridRows;
      const x = Math.floor((e.clientX - rect.left) / tileW);
      const y = Math.floor((e.clientY - rect.top) / tileH);
      if (x >= 0 && x < gridCols && y >= 0 && y < gridRows) {
        onClick(x, y);
      }
    },
    [onClick, gridCols, gridRows]
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
