/**
 * Pure canvas rendering functions for the office floor, walls, furniture,
 * and ambient overlays. No React — called from OfficeCanvas.tsx via refs.
 *
 * Polished top-down style inspired by SoWork/Gather.Town:
 * - Warm, professional floor palettes with subtle texture
 * - 3D-effect walls with windows and light shafts
 * - Soft zone tinting with gradient fills
 * - Detailed furniture with shadows and highlights
 * - Day/night overlays with light shaft effects
 */

import type { FloorStyle, OfficeFurniture, OfficeZone, DayPhase } from "../stores/office-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TILE = 48;

/** Seeded random for reproducible tile variation */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Color palettes per floor style
// ---------------------------------------------------------------------------

interface FloorPalette {
  readonly base: string;
  readonly alt: string;
  readonly wall: string;
  readonly wallTop: string;
  readonly wallShadow: string;
  readonly windowFrame: string;
  readonly windowGlass: string;
  readonly baseboard: string;
}

const FLOOR_PALETTES: Record<FloorStyle, { light: FloorPalette; dark: FloorPalette }> = {
  "warm-wood": {
    light: {
      base: "#F0EAE0", alt: "#E8E1D6", wall: "#C4B8A8",
      wallTop: "#B8AC9C", wallShadow: "rgba(0,0,0,0.06)",
      windowFrame: "#A89888", windowGlass: "#D4E8F8",
      baseboard: "#8B7D6B",
    },
    dark: {
      base: "#2A2520", alt: "#302A24", wall: "#4A4038",
      wallTop: "#3E3630", wallShadow: "rgba(0,0,0,0.20)",
      windowFrame: "#5A5048", windowGlass: "#2A3A4A",
      baseboard: "#3A322A",
    },
  },
  "modern-tile": {
    light: {
      base: "#F2F2F2", alt: "#EAEAEA", wall: "#D0D0D0",
      wallTop: "#C4C4C4", wallShadow: "rgba(0,0,0,0.04)",
      windowFrame: "#B8B8B8", windowGlass: "#D8EAF6",
      baseboard: "#A0A0A0",
    },
    dark: {
      base: "#242424", alt: "#2A2A2A", wall: "#444444",
      wallTop: "#3A3A3A", wallShadow: "rgba(0,0,0,0.25)",
      windowFrame: "#555555", windowGlass: "#283848",
      baseboard: "#333333",
    },
  },
  carpet: {
    light: {
      base: "#E8E0D4", alt: "#E2D9CC", wall: "#C4B8A4",
      wallTop: "#B8AC98", wallShadow: "rgba(0,0,0,0.05)",
      windowFrame: "#A8987C", windowGlass: "#D4E8F8",
      baseboard: "#8A7A64",
    },
    dark: {
      base: "#28241E", alt: "#2E2A22", wall: "#48402E",
      wallTop: "#3C3428", wallShadow: "rgba(0,0,0,0.20)",
      windowFrame: "#584E3E", windowGlass: "#2A3A4A",
      baseboard: "#382E22",
    },
  },
  concrete: {
    light: {
      base: "#E6E4E0", alt: "#DEDBD6", wall: "#C0BCB4",
      wallTop: "#B4B0A8", wallShadow: "rgba(0,0,0,0.04)",
      windowFrame: "#A8A49C", windowGlass: "#D8EAF6",
      baseboard: "#908C84",
    },
    dark: {
      base: "#262524", alt: "#2C2B29", wall: "#454340",
      wallTop: "#3A3836", wallShadow: "rgba(0,0,0,0.25)",
      windowFrame: "#555350", windowGlass: "#283848",
      baseboard: "#343230",
    },
  },
};

// ---------------------------------------------------------------------------
// Floor rendering
// ---------------------------------------------------------------------------

export function renderFloor(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  floorStyle: FloorStyle,
  isDark: boolean
): void {
  const palette = isDark
    ? FLOOR_PALETTES[floorStyle].dark
    : FLOOR_PALETTES[floorStyle].light;

  const w = cols * TILE;
  const h = rows * TILE;

  // Fill base
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, w, h);

  // Floor pattern per style
  if (floorStyle === "warm-wood") {
    renderWoodFloor(ctx, cols, rows, palette);
  } else if (floorStyle === "modern-tile") {
    renderTileFloor(ctx, cols, rows, palette, isDark);
  } else if (floorStyle === "carpet") {
    renderCarpetFloor(ctx, cols, rows, palette, isDark);
  } else {
    renderConcreteFloor(ctx, cols, rows, palette, isDark);
  }

  // Edge vignette for depth
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.05)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function renderWoodFloor(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  palette: FloorPalette
): void {
  // Herringbone-like wood plank pattern
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tx = Math.floor(col * TILE);
      const ty = Math.floor(row * TILE);
      const seed = row * cols + col;
      const variation = seededRandom(seed) * 0.06 - 0.03;

      // Alternate plank direction for herringbone feel
      const isAlt = (row + col) % 2 === 1;
      ctx.fillStyle = isAlt ? palette.alt : palette.base;
      ctx.fillRect(tx, ty, TILE, TILE);

      // Subtle brightness variation
      if (Math.abs(variation) > 0.005) {
        ctx.fillStyle =
          variation > 0
            ? `rgba(255,255,255,${Math.abs(variation)})`
            : `rgba(0,0,0,${Math.abs(variation)})`;
        ctx.fillRect(tx, ty, TILE, TILE);
      }

      // Wood grain lines
      ctx.strokeStyle = `rgba(120,80,40,${0.03 + seededRandom(seed * 3) * 0.02})`;
      ctx.lineWidth = 0.4;
      for (let g = 0; g < 3; g++) {
        const gy = ty + 6 + g * 14 + seededRandom(seed * 7 + g) * 8;
        ctx.beginPath();
        ctx.moveTo(tx + 1, gy);
        ctx.quadraticCurveTo(
          tx + TILE / 2, gy + (seededRandom(seed + g * 3) - 0.5) * 3,
          tx + TILE - 1, gy + (seededRandom(seed + g * 5) - 0.5) * 2
        );
        ctx.stroke();
      }

      // Plank seam
      ctx.strokeStyle = "rgba(0,0,0,0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + TILE, ty);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty + TILE);
      ctx.stroke();
    }
  }
}

function renderTileFloor(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  palette: FloorPalette,
  isDark: boolean
): void {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tx = Math.floor(col * TILE);
      const ty = Math.floor(row * TILE);
      const isAlt = (row + col) % 2 === 1;

      ctx.fillStyle = isAlt ? palette.alt : palette.base;
      ctx.fillRect(tx, ty, TILE, TILE);

      // Subtle micro-texture
      const seed = row * cols + col;
      const v = seededRandom(seed) * 0.02 - 0.01;
      if (Math.abs(v) > 0.003) {
        ctx.fillStyle = v > 0
          ? `rgba(255,255,255,${Math.abs(v)})`
          : `rgba(0,0,0,${Math.abs(v)})`;
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }
  }

  // Clean grouting lines
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  for (let col = 1; col < cols; col++) {
    const sx = Math.floor(col * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, rows * TILE);
    ctx.stroke();
  }
  for (let row = 1; row < rows; row++) {
    const sy = Math.floor(row * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(cols * TILE, sy);
    ctx.stroke();
  }
}

function renderCarpetFloor(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  palette: FloorPalette,
  isDark: boolean
): void {
  // Soft carpet with no visible tile seams, just subtle noise
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tx = Math.floor(col * TILE);
      const ty = Math.floor(row * TILE);
      const seed = row * cols + col;
      const v = seededRandom(seed) * 0.04 - 0.02;

      if (Math.abs(v) > 0.005) {
        ctx.fillStyle = v > 0
          ? `rgba(255,255,255,${Math.abs(v)})`
          : `rgba(0,0,0,${Math.abs(v)})`;
        ctx.fillRect(tx, ty, TILE, TILE);
      }

      // Carpet fiber dots (very subtle)
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)";
      for (let d = 0; d < 4; d++) {
        const dx = tx + seededRandom(seed * 11 + d) * TILE;
        const dy = ty + seededRandom(seed * 13 + d) * TILE;
        ctx.fillRect(Math.floor(dx), Math.floor(dy), 1, 1);
      }
    }
  }
}

function renderConcreteFloor(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  palette: FloorPalette,
  isDark: boolean
): void {
  // Large-format concrete tiles with wide grouting
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tx = Math.floor(col * TILE);
      const ty = Math.floor(row * TILE);
      const seed = row * cols + col;
      const v = seededRandom(seed) * 0.03 - 0.015;

      if (Math.abs(v) > 0.003) {
        ctx.fillStyle = v > 0
          ? `rgba(255,255,255,${Math.abs(v)})`
          : `rgba(0,0,0,${Math.abs(v)})`;
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }
  }

  // Wider grouting lines for concrete feel
  ctx.strokeStyle = isDark ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1.5;
  for (let col = 1; col < cols; col++) {
    const sx = Math.floor(col * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, rows * TILE);
    ctx.stroke();
  }
  for (let row = 1; row < rows; row++) {
    const sy = Math.floor(row * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(cols * TILE, sy);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Wall rendering (3D-effect with windows)
// ---------------------------------------------------------------------------

function renderWalls(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  palette: FloorPalette,
  isDark: boolean
): void {
  const w = cols * TILE;
  const h = rows * TILE;
  const wallH = 12;
  const wallW = 10;

  // ── Top wall ──
  // Wall face
  const topGrad = ctx.createLinearGradient(0, 0, 0, wallH);
  topGrad.addColorStop(0, palette.wallTop);
  topGrad.addColorStop(1, palette.wall);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, wallH);

  // Top wall highlight strip
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.25)";
  ctx.fillRect(0, 0, w, 1);

  // Baseboard
  ctx.fillStyle = palette.baseboard;
  ctx.fillRect(0, wallH, w, 3);
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.12)";
  ctx.fillRect(0, wallH, w, 1);

  // Wall shadow (soft gradient below)
  const topShadow = ctx.createLinearGradient(0, wallH + 3, 0, wallH + 14);
  topShadow.addColorStop(0, palette.wallShadow);
  topShadow.addColorStop(1, "transparent");
  ctx.fillStyle = topShadow;
  ctx.fillRect(0, wallH + 3, w, 11);

  // ── Left wall ──
  const leftGrad = ctx.createLinearGradient(0, 0, wallW, 0);
  leftGrad.addColorStop(0, palette.wallTop);
  leftGrad.addColorStop(1, palette.wall);
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, wallW, h);

  // Left wall highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.18)";
  ctx.fillRect(0, 0, 1, h);

  // Left baseboard
  ctx.fillStyle = palette.baseboard;
  ctx.fillRect(wallW, 0, 3, h);
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)";
  ctx.fillRect(wallW, 0, 1, h);

  // Left wall shadow
  const leftShadow = ctx.createLinearGradient(wallW + 3, 0, wallW + 14, 0);
  leftShadow.addColorStop(0, palette.wallShadow);
  leftShadow.addColorStop(1, "transparent");
  ctx.fillStyle = leftShadow;
  ctx.fillRect(wallW + 3, 0, 11, h);

  // ── Windows on top wall ──
  const windowSpacing = Math.max(3, Math.floor(cols / 4));
  for (let i = 1; i <= 3; i++) {
    const wx = Math.floor(i * windowSpacing * TILE) - TILE;
    if (wx > 0 && wx + TILE * 2 < w) {
      drawWindow(ctx, wx, 1, TILE * 2, wallH - 2, palette, isDark);
    }
  }

  // ── Windows on left wall ──
  const vWindowSpacing = Math.max(3, Math.floor(rows / 3));
  for (let i = 1; i <= 2; i++) {
    const wy = Math.floor(i * vWindowSpacing * TILE);
    if (wy > wallH && wy + TILE * 1.5 < h) {
      drawWindow(ctx, 1, wy, wallW - 2, TILE * 1.5, palette, isDark);
    }
  }

  // Corner junction
  ctx.fillStyle = palette.baseboard;
  ctx.fillRect(0, 0, wallW + 3, wallH + 3);
  const cornerGrad = ctx.createLinearGradient(0, 0, wallW, wallH);
  cornerGrad.addColorStop(0, palette.wallTop);
  cornerGrad.addColorStop(1, palette.wall);
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, wallW, wallH);
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: FloorPalette,
  isDark: boolean
): void {
  // Window frame
  ctx.fillStyle = palette.windowFrame;
  ctx.fillRect(x, y, w, h);

  // Glass with subtle sky gradient
  const inset = 2;
  const glassGrad = ctx.createLinearGradient(x, y, x, y + h);
  glassGrad.addColorStop(0, isDark ? "#1E3050" : "#C8E0F4");
  glassGrad.addColorStop(0.6, isDark ? "#283848" : "#D8ECF8");
  glassGrad.addColorStop(1, isDark ? "#2A3A4A" : "#E0F0FF");
  ctx.fillStyle = glassGrad;
  ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);

  // Cross bar
  const midX = x + w / 2;
  const midY = y + h / 2;
  ctx.strokeStyle = palette.windowFrame;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(midX, y + inset);
  ctx.lineTo(midX, y + h - inset);
  ctx.moveTo(x + inset, midY);
  ctx.lineTo(x + w - inset, midY);
  ctx.stroke();

  // Glass reflection highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.3)";
  ctx.fillRect(x + inset + 1, y + inset + 1, (w - inset * 2) * 0.3, h - inset * 2 - 2);
}

// ---------------------------------------------------------------------------
// Zone rendering
// ---------------------------------------------------------------------------

const ZONE_FILL_ALPHA = 0.06;
const ZONE_STROKE_ALPHA = 0.15;

export function renderZones(
  ctx: CanvasRenderingContext2D,
  zones: readonly OfficeZone[],
  showGrid: boolean
): void {
  for (const zone of zones) {
    const x = Math.floor(zone.x * TILE);
    const y = Math.floor(zone.y * TILE);
    const w = zone.width * TILE;
    const h = zone.height * TILE;
    const radius = 10;

    // Zone fill with soft gradient
    const zoneGrad = ctx.createLinearGradient(x, y, x, y + h);
    zoneGrad.addColorStop(0, hexToRgba(zone.color, ZONE_FILL_ALPHA * 1.5));
    zoneGrad.addColorStop(1, hexToRgba(zone.color, ZONE_FILL_ALPHA * 0.5));
    ctx.fillStyle = zoneGrad;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, w - 4, h - 4, radius);
    ctx.fill();

    // Subtle inner border glow
    ctx.strokeStyle = hexToRgba(zone.color, ZONE_STROKE_ALPHA);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, w - 6, h - 6, radius - 1);
    ctx.stroke();

    // Edit mode: dashed outer border
    if (showGrid) {
      ctx.strokeStyle = hexToRgba(zone.color, ZONE_STROKE_ALPHA * 1.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w - 2, h - 2, radius);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ---------------------------------------------------------------------------
// Grid overlay (edit mode)
// ---------------------------------------------------------------------------

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  isDark: boolean
): void {
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  ctx.lineWidth = 0.5;

  for (let col = 0; col <= cols; col++) {
    const x = Math.floor(col * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rows * TILE);
    ctx.stroke();
  }

  for (let row = 0; row <= rows; row++) {
    const y = Math.floor(row * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cols * TILE, y);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Furniture rendering (polished top-down style)
// ---------------------------------------------------------------------------

function drawSoftShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  isDark: boolean
): void {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  gradient.addColorStop(0, isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.10)");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const dw = TILE * 2 - 8;

  // Soft shadow
  drawSoftShadow(ctx, px + TILE, py + TILE - 4, dw * 0.45, 6, isDark);

  // Desk surface with subtle gradient
  const deskGrad = ctx.createLinearGradient(px + 4, py + 8, px + 4, py + TILE - 8);
  deskGrad.addColorStop(0, isDark ? "#5E4E3E" : "#D4B896");
  deskGrad.addColorStop(1, isDark ? "#524232" : "#C4A882");
  ctx.fillStyle = deskGrad;
  ctx.beginPath();
  ctx.roundRect(px + 4, py + 8, dw, TILE - 16, 4);
  ctx.fill();

  // Top highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.20)";
  ctx.fillRect(px + 6, py + 9, dw - 4, 1);

  // Bottom shadow edge
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)";
  ctx.fillRect(px + 6, py + TILE - 9, dw - 4, 1);

  // Desk legs
  ctx.fillStyle = isDark ? "#4A3A2A" : "#A08060";
  ctx.beginPath();
  ctx.roundRect(px + 6, py + TILE - 10, 4, 6, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(px + TILE * 2 - 12, py + TILE - 10, 4, 6, 1);
  ctx.fill();

  // Monitor
  ctx.fillStyle = isDark ? "#1E2A3A" : "#2A2A2A";
  ctx.beginPath();
  ctx.roundRect(px + TILE - 11, py + 2, 22, 16, 2);
  ctx.fill();

  // Screen glow
  const screenGrad = ctx.createLinearGradient(px + TILE - 9, py + 4, px + TILE - 9, py + 16);
  screenGrad.addColorStop(0, isDark ? "#4A7AAA" : "#88C8F8");
  screenGrad.addColorStop(1, isDark ? "#3A5A8A" : "#70B0E8");
  ctx.fillStyle = screenGrad;
  ctx.beginPath();
  ctx.roundRect(px + TILE - 9, py + 4, 18, 12, 1);
  ctx.fill();

  // Screen shine
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(px + TILE - 8, py + 5, 4, 10);

  // Monitor stand
  ctx.fillStyle = isDark ? "#2A3040" : "#444";
  ctx.fillRect(px + TILE - 2, py + 18, 4, 4);

  // Keyboard
  ctx.fillStyle = isDark ? "#3A3A44" : "#E0E0E0";
  ctx.beginPath();
  ctx.roundRect(px + TILE - 12, py + 24, 24, 6, 2);
  ctx.fill();
  // Key dots
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  for (let k = 0; k < 5; k++) {
    ctx.fillRect(px + TILE - 10 + k * 4, py + 26, 2, 2);
  }
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const cx = px + TILE / 2;
  const cy = py + TILE / 2;

  // Shadow
  drawSoftShadow(ctx, cx, cy + 12, 14, 5, isDark);

  // Seat with radial gradient
  const seatGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 13);
  seatGrad.addColorStop(0, isDark ? "#555566" : "#888");
  seatGrad.addColorStop(1, isDark ? "#3A3A4A" : "#666");
  ctx.fillStyle = seatGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();

  // Seat rim highlight
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 11.5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Back rest
  ctx.fillStyle = isDark ? "#2E2E3E" : "#555";
  ctx.beginPath();
  ctx.roundRect(cx - 10, py + 5, 20, 9, 3);
  ctx.fill();
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)";
  ctx.fillRect(cx - 9, py + 6, 18, 1);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const cx = px + 24;

  // Shadow
  drawSoftShadow(ctx, cx, py + 42, 12, 4, isDark);

  // Pot with gradient
  const potGrad = ctx.createLinearGradient(px + 14, py + 26, px + 14, py + 42);
  potGrad.addColorStop(0, isDark ? "#8B5E3C" : "#D08050");
  potGrad.addColorStop(1, isDark ? "#6A4428" : "#B06838");
  ctx.fillStyle = potGrad;
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 28, 20, 14, 2);
  ctx.fill();

  // Pot rim
  ctx.fillStyle = isDark ? "#9A6E4C" : "#D89060";
  ctx.beginPath();
  ctx.roundRect(px + 12, py + 26, 24, 4, 2);
  ctx.fill();
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.20)";
  ctx.fillRect(px + 13, py + 26, 22, 1);

  // Soil
  ctx.fillStyle = isDark ? "#3A2A1A" : "#654321";
  ctx.fillRect(px + 15, py + 26, 18, 3);

  // Stem
  ctx.fillStyle = isDark ? "#1A5E1A" : "#388E3C";
  ctx.fillRect(cx - 1, py + 18, 2, 10);

  // Leaves (layered for depth)
  const leaves = [
    { dx: -6, dy: -4, r: 10, color: isDark ? "#2D6E2D" : "#4CAF50" },
    { dx: -10, dy: -8, r: 7, color: isDark ? "#388E3C" : "#66BB6A" },
    { dx: 4, dy: -6, r: 6.5, color: isDark ? "#338833" : "#5BBB5B" },
    { dx: -3, dy: -11, r: 5.5, color: isDark ? "#40A040" : "#76CA76" },
  ];
  for (const leaf of leaves) {
    ctx.fillStyle = leaf.color;
    ctx.beginPath();
    ctx.arc(cx + leaf.dx, py + 18 + leaf.dy, leaf.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Leaf highlights
  ctx.fillStyle = isDark ? "rgba(120,255,120,0.10)" : "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(cx - 8, py + 10, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, py + 12, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Shadow
  drawSoftShadow(ctx, px + 24, py + 42, 14, 4, isDark);

  // Body with gradient
  const bodyGrad = ctx.createLinearGradient(px + 10, py + 8, px + 38, py + 8);
  bodyGrad.addColorStop(0, isDark ? "#555555" : "#999");
  bodyGrad.addColorStop(0.3, isDark ? "#4A4A4A" : "#888");
  bodyGrad.addColorStop(1, isDark ? "#404040" : "#777");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(px + 10, py + 8, 28, 32, 3);
  ctx.fill();

  // Top highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.18)";
  ctx.fillRect(px + 11, py + 8, 26, 1);

  // Front panel
  ctx.fillStyle = isDark ? "#333" : "#666";
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 14, 20, 14, 2);
  ctx.fill();

  // Cup slot
  ctx.fillStyle = isDark ? "#222" : "#444";
  ctx.beginPath();
  ctx.roundRect(px + 18, py + 30, 12, 8, 1);
  ctx.fill();

  // LED with soft glow
  ctx.fillStyle = "rgba(34,197,94,0.12)";
  ctx.beginPath();
  ctx.arc(px + 34, py + 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#22C55E";
  ctx.beginPath();
  ctx.arc(px + 34, py + 12, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Shadow
  drawSoftShadow(ctx, px + TILE / 2, py + TILE * 2 - 4, 18, 5, isDark);

  // Frame with gradient
  const frameGrad = ctx.createLinearGradient(px + 4, py + 2, px + TILE - 4, py + 2);
  frameGrad.addColorStop(0, isDark ? "#5A4A3A" : "#9B8565");
  frameGrad.addColorStop(0.5, isDark ? "#524232" : "#8B7355");
  frameGrad.addColorStop(1, isDark ? "#4A3A2A" : "#7B6345");
  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.roundRect(px + 4, py + 2, TILE - 8, TILE * 2 - 4, 2);
  ctx.fill();

  // Shelves with subtle depth
  for (let i = 0; i < 4; i++) {
    const sy = py + 4 + i * 22;
    ctx.fillStyle = isDark ? "#4A3A2A" : "#7A6345";
    ctx.fillRect(px + 6, sy, TILE - 12, 2);
    ctx.fillStyle = isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(px + 6, sy + 2, TILE - 12, 1);
  }

  // Books with rounded tops
  const bookColors = ["#C94040", "#3888CC", "#38AA58", "#D49020", "#8855AA", "#20AA88"];
  for (let shelf = 0; shelf < 3; shelf++) {
    const shelfY = py + 8 + shelf * 22;
    for (let b = 0; b < 5; b++) {
      const bx = px + 8 + b * 7;
      ctx.fillStyle = bookColors[(shelf * 5 + b) % bookColors.length];
      ctx.beginPath();
      ctx.roundRect(bx, shelfY, 5, 18, 1);
      ctx.fill();

      // Shadow between books
      ctx.fillStyle = isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(bx + 5, shelfY, 1, 18);

      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(bx, shelfY, 5, 1);
    }
  }
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const bw = TILE * 2 - 8;
  const bh = TILE - 12;

  // Frame shadow
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.08)";
  ctx.fillRect(px + 6, py + 6, bw, bh);

  // Board
  ctx.fillStyle = isDark ? "#3A3A44" : "#FAFAFA";
  ctx.beginPath();
  ctx.roundRect(px + 4, py + 4, bw, bh, 3);
  ctx.fill();

  // Frame border
  ctx.strokeStyle = isDark ? "#555566" : "#CCC";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(px + 4, py + 4, bw, bh, 3);
  ctx.stroke();

  // Board highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.30)";
  ctx.fillRect(px + 6, py + 6, bw - 4, 1);

  // Scribble lines (more organic)
  ctx.strokeStyle = isDark ? "#6A8ABB" : "#444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 12, py + 14);
  ctx.quadraticCurveTo(px + 36, py + 12, px + 60, py + 15);
  ctx.moveTo(px + 12, py + 22);
  ctx.quadraticCurveTo(px + 30, py + 20, px + 50, py + 23);
  ctx.moveTo(px + 12, py + 30);
  ctx.lineTo(px + 40, py + 30);
  ctx.stroke();

  // Checkmark
  ctx.strokeStyle = "#22C55E";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px + 70, py + 14);
  ctx.lineTo(px + 74, py + 20);
  ctx.lineTo(px + 82, py + 10);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Shadow
  drawSoftShadow(ctx, px + TILE / 2, py + TILE * 2, 14, 5, isDark);

  // Rack body
  ctx.fillStyle = isDark ? "#2A2A30" : "#444";
  ctx.beginPath();
  ctx.roundRect(px + 8, py + 2, TILE - 16, TILE * 2 - 4, 3);
  ctx.fill();

  // Rack front face gradient
  const rackGrad = ctx.createLinearGradient(px + 8, py + 2, px + TILE - 8, py + 2);
  rackGrad.addColorStop(0, isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)");
  rackGrad.addColorStop(1, "transparent");
  ctx.fillStyle = rackGrad;
  ctx.fillRect(px + 8, py + 2, TILE - 16, TILE * 2 - 4);

  // Server units
  for (let i = 0; i < 5; i++) {
    const uy = py + 6 + i * 18;
    ctx.fillStyle = isDark ? "#363640" : "#555";
    ctx.beginPath();
    ctx.roundRect(px + 12, uy, TILE - 24, 14, 2);
    ctx.fill();

    // Ventilation lines
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
    ctx.lineWidth = 0.5;
    for (let v = 0; v < 3; v++) {
      ctx.beginPath();
      ctx.moveTo(px + 14, uy + 4 + v * 3);
      ctx.lineTo(px + 24, uy + 4 + v * 3);
      ctx.stroke();
    }

    // LED indicators
    const ledColors = ["#22C55E", "#EAB308", "#22C55E"];
    for (let led = 0; led < 3; led++) {
      ctx.fillStyle = ledColors[led];
      ctx.beginPath();
      ctx.arc(px + TILE - 18 + led * 4, uy + 7, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean, lampsOn: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const cx = px + TILE / 2;

  // Light cone (when on)
  if (lampsOn) {
    const gradient = ctx.createRadialGradient(cx, py + TILE / 2, 2, cx, py + TILE / 2, TILE);
    gradient.addColorStop(0, "rgba(255,200,50,0.12)");
    gradient.addColorStop(0.5, "rgba(255,200,50,0.04)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, py + TILE / 2, TILE, 0, Math.PI * 2);
    ctx.fill();
  }

  // Base
  ctx.fillStyle = isDark ? "#5A5A5A" : "#999";
  ctx.beginPath();
  ctx.roundRect(px + 18, py + 34, 12, 8, 2);
  ctx.fill();

  // Pole
  ctx.fillStyle = isDark ? "#4A4A4A" : "#888";
  ctx.fillRect(px + 22, py + 12, 4, 24);

  // Shade with gradient
  const shadeColor = lampsOn
    ? (isDark ? "#FFD93D" : "#FFE066")
    : (isDark ? "#555" : "#BBB");
  ctx.fillStyle = shadeColor;
  ctx.beginPath();
  ctx.moveTo(px + 14, py + 14);
  ctx.lineTo(px + 34, py + 14);
  ctx.lineTo(px + 30, py + 5);
  ctx.lineTo(px + 18, py + 5);
  ctx.closePath();
  ctx.fill();

  // Shade highlight
  if (lampsOn) {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 13);
    ctx.lineTo(px + 22, py + 13);
    ctx.lineTo(px + 20, py + 7);
    ctx.lineTo(px + 18, py + 7);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const pw = w * TILE;
  const ph = h * TILE;

  // Rug body with soft gradient
  const rugGrad = ctx.createRadialGradient(
    px + pw / 2, py + ph / 2, 0,
    px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.6
  );
  rugGrad.addColorStop(0, hexToRgba(color, 0.08));
  rugGrad.addColorStop(1, hexToRgba(color, 0.04));
  ctx.fillStyle = rugGrad;
  ctx.beginPath();
  ctx.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8);
  ctx.fill();

  // Decorative border pattern
  ctx.strokeStyle = hexToRgba(color, 0.10);
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.roundRect(px + 10, py + 10, pw - 20, ph - 20, 5);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner border
  ctx.strokeStyle = hexToRgba(color, 0.06);
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 14, pw - 28, ph - 28, 3);
  ctx.stroke();
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Frosted glass divider
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  ctx.beginPath();
  ctx.roundRect(px + 18, py + 2, 12, TILE - 4, 3);
  ctx.fill();

  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px + 18, py + 2, 12, TILE - 4, 3);
  ctx.stroke();

  // Top/bottom caps
  ctx.fillStyle = isDark ? "#4A4A4A" : "#AAA";
  ctx.beginPath();
  ctx.roundRect(px + 20, py + 1, 8, 3, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(px + 20, py + TILE - 4, 8, 3, 1);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Main furniture dispatcher
// ---------------------------------------------------------------------------

/** Screen-pixel height of the iso 3D side walls per furniture type */
const FURNITURE_HEIGHTS: Readonly<Record<string, number>> = {
  desk: 8,
  chair: 6,
  plant: 10,
  coffee_machine: 8,
  bookshelf: 12,
  whiteboard: 12,
  server_rack: 14,
  lamp: 5,
  rug: 0,
  divider: 14,
};

/**
 * Draws the SW and SE side walls for an iso furniture item in screen space.
 * Must be called while the iso transform is still active on ctx —
 * internally saves/resets/restores the transform.
 */
function drawFurnitureSideWalls(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  tw: number,
  th: number,
  rows: number,
  sideH: number,
  isDark: boolean
): void {
  const T = TILE;
  // Diamond vertices in CSS logical pixels (iso screen space)
  const east  = { x: (tx + tw - ty + rows) * T,      y: (tx + tw + ty) * T / 2 };
  const south = { x: (tx + tw - ty - th + rows) * T,  y: (tx + tw + ty + th) * T / 2 };
  const west  = { x: (tx - ty - th + rows) * T,       y: (tx + ty + th) * T / 2 };

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  ctx.save();
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  // SW face (west→south): left visible wall (medium shade)
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.55)" : "rgba(80,55,30,0.55)";
  ctx.beginPath();
  ctx.moveTo(west.x, west.y);
  ctx.lineTo(south.x, south.y);
  ctx.lineTo(south.x, south.y + sideH);
  ctx.lineTo(west.x, west.y + sideH);
  ctx.closePath();
  ctx.fill();

  // SE face (east→south): right visible wall (darker shade)
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.72)" : "rgba(50,30,10,0.70)";
  ctx.beginPath();
  ctx.moveTo(east.x, east.y);
  ctx.lineTo(south.x, south.y);
  ctx.lineTo(south.x, south.y + sideH);
  ctx.lineTo(east.x, east.y + sideH);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function renderFurniture(
  ctx: CanvasRenderingContext2D,
  furniture: readonly OfficeFurniture[],
  isDark: boolean,
  lampsOn: boolean,
  gridRows: number
): void {
  // Iso painter's algorithm: sort back-to-front by (x+y) sum
  const sorted = [...furniture].sort((a, b) => (a.x + a.y) - (b.x + b.y));

  for (const item of sorted) {
    const sideH = FURNITURE_HEIGHTS[item.type] ?? 6;
    if (sideH > 0) {
      drawFurnitureSideWalls(ctx, item.x, item.y, item.width, item.height, gridRows, sideH, isDark);
    }
    switch (item.type) {
      case "desk":
        drawDesk(ctx, item.x, item.y, isDark);
        break;
      case "chair":
        drawChair(ctx, item.x, item.y, isDark);
        break;
      case "plant":
        drawPlant(ctx, item.x, item.y, isDark);
        break;
      case "coffee_machine":
        drawCoffeeMachine(ctx, item.x, item.y, isDark);
        break;
      case "bookshelf":
        drawBookshelf(ctx, item.x, item.y, isDark);
        break;
      case "whiteboard":
        drawWhiteboard(ctx, item.x, item.y, isDark);
        break;
      case "server_rack":
        drawServerRack(ctx, item.x, item.y, isDark);
        break;
      case "lamp":
        drawLamp(ctx, item.x, item.y, isDark, lampsOn);
        break;
      case "rug":
        drawRug(ctx, item.x, item.y, item.width, item.height, "#EAB308");
        break;
      case "divider":
        drawDivider(ctx, item.x, item.y, isDark);
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Day/night ambient overlay
// ---------------------------------------------------------------------------

const DAY_PHASE_OVERLAYS: Record<DayPhase, { color: string; opacity: number }> = {
  dawn: { color: "#FFF7E6", opacity: 0.08 },
  morning: { color: "#FFF7E6", opacity: 0.04 },
  afternoon: { color: "transparent", opacity: 0 },
  golden: { color: "#FF9F43", opacity: 0.06 },
  dusk: { color: "#6C5CE7", opacity: 0.08 },
  night: { color: "#0A0A2E", opacity: 0.15 },
};

export function renderDayNightOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayPhase: DayPhase
): void {
  const overlay = DAY_PHASE_OVERLAYS[dayPhase];
  if (overlay.opacity <= 0) return;

  ctx.fillStyle = overlay.color;
  ctx.globalAlpha = overlay.opacity;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Window light shafts (enhanced)
// ---------------------------------------------------------------------------

export function renderLightShafts(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayPhase: DayPhase
): void {
  if (dayPhase === "afternoon" || dayPhase === "night") return;

  const isMorning = dayPhase === "dawn" || dayPhase === "morning";
  const isEvening = dayPhase === "golden" || dayPhase === "dusk";

  if (!isMorning && !isEvening) return;

  ctx.save();
  ctx.globalAlpha = isMorning ? 0.05 : 0.06;

  // Cast from top wall windows
  const windowPositions = [0.25, 0.5, 0.75];
  for (const pos of windowPositions) {
    const wx = width * pos;
    const gradient = ctx.createLinearGradient(wx, 12, wx + (isEvening ? 80 : -80), height * 0.6);
    gradient.addColorStop(0, "rgba(255,220,100,0.6)");
    gradient.addColorStop(0.4, "rgba(255,220,100,0.2)");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(wx - TILE, 14);
    ctx.lineTo(wx + TILE, 14);
    ctx.lineTo(wx + TILE + (isEvening ? 60 : -60), height * 0.5);
    ctx.lineTo(wx - TILE + (isEvening ? 60 : -60), height * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // Cast from left wall windows
  const vWindowPositions = [0.33, 0.66];
  for (const pos of vWindowPositions) {
    const wy = height * pos;
    const gradient = ctx.createLinearGradient(10, wy, width * 0.5, wy + (isEvening ? 60 : -60));
    gradient.addColorStop(0, "rgba(255,220,100,0.5)");
    gradient.addColorStop(0.3, "rgba(255,220,100,0.15)");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(12, wy - TILE * 0.75);
    ctx.lineTo(12, wy + TILE * 0.75);
    ctx.lineTo(width * 0.4, wy + TILE * 0.75 + (isEvening ? 40 : -40));
    ctx.lineTo(width * 0.4, wy - TILE * 0.75 + (isEvening ? 40 : -40));
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
