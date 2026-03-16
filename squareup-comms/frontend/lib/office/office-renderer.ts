/**
 * Pure canvas rendering functions for the office floor, walls, and furniture.
 * No React — these are called from OfficeCanvas.tsx via refs.
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
// Color palettes per floor style
// ---------------------------------------------------------------------------

interface FloorPalette {
  readonly base: string;
  readonly alt: string;
  readonly wall: string;
  readonly wallShadow: string;
}

const FLOOR_PALETTES: Record<FloorStyle, { light: FloorPalette; dark: FloorPalette }> = {
  "warm-wood": {
    light: { base: "#f5efe6", alt: "#ede7db", wall: "#d4c9b8", wallShadow: "rgba(0,0,0,0.08)" },
    dark: { base: "#2a2520", alt: "#312b25", wall: "#4a4038", wallShadow: "rgba(0,0,0,0.25)" },
  },
  "modern-tile": {
    light: { base: "#f0f0f0", alt: "#e8e8e8", wall: "#c8c8c8", wallShadow: "rgba(0,0,0,0.06)" },
    dark: { base: "#222222", alt: "#2a2a2a", wall: "#444444", wallShadow: "rgba(0,0,0,0.3)" },
  },
  carpet: {
    light: { base: "#e8e0d4", alt: "#dfd6c8", wall: "#c4b8a4", wallShadow: "rgba(0,0,0,0.06)" },
    dark: { base: "#28241e", alt: "#302a22", wall: "#48402e", wallShadow: "rgba(0,0,0,0.25)" },
  },
  concrete: {
    light: { base: "#e4e2de", alt: "#dbd8d3", wall: "#bfbbb4", wallShadow: "rgba(0,0,0,0.05)" },
    dark: { base: "#252423", alt: "#2c2b29", wall: "#454340", wallShadow: "rgba(0,0,0,0.3)" },
  },
};

// ---------------------------------------------------------------------------
// Zone colors (translucent fills)
// ---------------------------------------------------------------------------

const ZONE_FILL_ALPHA = 0.08;
const ZONE_STROKE_ALPHA = 0.2;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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

  // Fill background
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, w, h);

  // Checkerboard with seeded lightness variation
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isAlt = (row + col) % 2 === 1;
      const variation = seededRandom(row * cols + col) * 0.04 - 0.02; // +-2%

      if (isAlt || Math.abs(variation) > 0.01) {
        const baseColor = isAlt ? palette.alt : palette.base;
        ctx.fillStyle = baseColor;
        ctx.fillRect(
          Math.floor(col * TILE),
          Math.floor(row * TILE),
          TILE,
          TILE
        );
      }

      // Subtle variation overlay
      if (Math.abs(variation) > 0.005) {
        ctx.fillStyle =
          variation > 0
            ? `rgba(255,255,255,${Math.abs(variation)})`
            : `rgba(0,0,0,${Math.abs(variation)})`;
        ctx.fillRect(
          Math.floor(col * TILE),
          Math.floor(row * TILE),
          TILE,
          TILE
        );
      }
    }
  }

  // Floor tile seam/grouting lines
  ctx.lineWidth = 0.5;
  const seamColor = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
  ctx.strokeStyle = seamColor;
  for (let col = 1; col < cols; col++) {
    const sx = Math.floor(col * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }
  for (let row = 1; row < rows; row++) {
    const sy = Math.floor(row * TILE) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }

  // Warm-wood grain lines
  if (floorStyle === "warm-wood") {
    ctx.strokeStyle = isDark ? "rgba(255,220,180,0.02)" : "rgba(120,80,40,0.03)";
    ctx.lineWidth = 0.3;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tx = Math.floor(col * TILE);
        const ty = Math.floor(row * TILE);
        const seed = row * cols + col;
        // 2-3 grain lines per tile
        for (let g = 0; g < 3; g++) {
          const gy = ty + 8 + g * 12 + seededRandom(seed * 7 + g) * 6;
          ctx.beginPath();
          ctx.moveTo(tx + 2, gy);
          ctx.lineTo(tx + TILE - 2, gy + (seededRandom(seed + g * 3) - 0.5) * 2);
          ctx.stroke();
        }
      }
    }
  }

  // Wall border (top + left edges)
  const wallWidth = 6;
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, w, wallWidth); // top wall
  ctx.fillRect(0, 0, wallWidth, h); // left wall

  // Wall shadow
  ctx.fillStyle = palette.wallShadow;
  ctx.fillRect(0, wallWidth, w, 8); // shadow below top wall
  ctx.fillRect(wallWidth, 0, 8, h); // shadow right of left wall

  // Corner vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.08)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Zone rendering
// ---------------------------------------------------------------------------

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

    // Zone fill
    ctx.fillStyle = hexToRgba(zone.color, ZONE_FILL_ALPHA);
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 8);
    ctx.fill();

    // Zone border (edit mode only or subtle)
    if (showGrid) {
      ctx.strokeStyle = hexToRgba(zone.color, ZONE_STROKE_ALPHA);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Zone labels rendered by HTML overlay (OfficeZone.tsx) — no canvas text needed
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
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
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
// Furniture rendering (pixel art style)
// ---------------------------------------------------------------------------

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Drop shadow under desk
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.12)";
  ctx.fillRect(px + 6, py + TILE - 8, TILE * 2 - 12, 4);

  // Desk surface
  ctx.fillStyle = isDark ? "#5a4a3a" : "#c4a882";
  ctx.fillRect(px + 4, py + 8, TILE * 2 - 8, TILE - 16);

  // Top-edge highlight (depth cue)
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)";
  ctx.fillRect(px + 4, py + 8, TILE * 2 - 8, 1);

  // Bottom-edge shadow (depth cue)
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.1)";
  ctx.fillRect(px + 4, py + TILE - 9, TILE * 2 - 8, 1);

  // Desk legs
  ctx.fillStyle = isDark ? "#4a3a2a" : "#a08060";
  ctx.fillRect(px + 6, py + TILE - 10, 4, 6);
  ctx.fillRect(px + TILE * 2 - 12, py + TILE - 10, 4, 6);

  // Monitor
  ctx.fillStyle = isDark ? "#2a3a4a" : "#333";
  ctx.fillRect(px + TILE - 10, py + 4, 20, 14);

  // Monitor screen glow
  ctx.fillStyle = isDark ? "#4a6a8a" : "#88b8e8";
  ctx.fillRect(px + TILE - 8, py + 6, 16, 10);

  // Monitor bezel highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)";
  ctx.fillRect(px + TILE - 10, py + 4, 20, 1);

  // Keyboard
  ctx.fillStyle = isDark ? "#3a3a3a" : "#ddd";
  ctx.fillRect(px + TILE - 12, py + 22, 24, 6);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Chair shadow
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(px + TILE / 2, py + TILE / 2 + 14, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Seat with radial gradient for depth
  const seatGrad = ctx.createRadialGradient(
    px + TILE / 2 - 3, py + TILE / 2 - 3, 1,
    px + TILE / 2, py + TILE / 2, 12
  );
  seatGrad.addColorStop(0, isDark ? "#4a4a5a" : "#777");
  seatGrad.addColorStop(1, isDark ? "#2e2e3e" : "#555");
  ctx.fillStyle = seatGrad;
  ctx.beginPath();
  ctx.arc(px + TILE / 2, py + TILE / 2, 12, 0, Math.PI * 2);
  ctx.fill();

  // Seat rim highlight
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(px + TILE / 2, py + TILE / 2, 11.5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Back
  ctx.fillStyle = isDark ? "#2a2a3a" : "#555";
  ctx.fillRect(px + TILE / 2 - 10, py + 6, 20, 8);

  // Back highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)";
  ctx.fillRect(px + TILE / 2 - 10, py + 6, 20, 1);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Pot shadow
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(px + 24, py + 42, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pot
  ctx.fillStyle = isDark ? "#8b5e3c" : "#c87941";
  ctx.fillRect(px + 14, py + 28, 20, 14);
  ctx.fillRect(px + 12, py + 26, 24, 4);

  // Pot rim highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)";
  ctx.fillRect(px + 12, py + 26, 24, 1);

  // Stem
  ctx.fillStyle = isDark ? "#1a5e1a" : "#388E3C";
  ctx.fillRect(px + 23, py + 20, 2, 8);

  // Leaves (back layer — darker)
  ctx.fillStyle = isDark ? "#2d6e2d" : "#4CAF50";
  ctx.beginPath();
  ctx.arc(px + 24, py + 18, 10, 0, Math.PI * 2);
  ctx.fill();

  // Leaves (front layer — lighter, highlights)
  ctx.fillStyle = isDark ? "#388e3c" : "#66BB6A";
  ctx.beginPath();
  ctx.arc(px + 18, py + 14, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px + 30, py + 16, 6, 0, Math.PI * 2);
  ctx.fill();

  // Leaf specular highlights
  ctx.fillStyle = isDark ? "rgba(120,255,120,0.12)" : "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(px + 20, py + 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + 28, py + 14, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Body
  ctx.fillStyle = isDark ? "#4a4a4a" : "#888";
  ctx.fillRect(px + 10, py + 8, 28, 32);

  // Metallic sheen strip (vertical highlight)
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.18)";
  ctx.fillRect(px + 11, py + 8, 3, 32);

  // Top edge highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.22)";
  ctx.fillRect(px + 10, py + 8, 28, 1);

  // Front panel
  ctx.fillStyle = isDark ? "#333" : "#666";
  ctx.fillRect(px + 14, py + 14, 20, 14);

  // Cup slot
  ctx.fillStyle = isDark ? "#222" : "#444";
  ctx.fillRect(px + 18, py + 30, 12, 8);

  // LED with glow
  ctx.fillStyle = "rgba(34,197,94,0.15)";
  ctx.beginPath();
  ctx.arc(px + 34, py + 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(px + 34, py + 12, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Shelf frame
  ctx.fillStyle = isDark ? "#5a4a3a" : "#8B7355";
  ctx.fillRect(px + 4, py + 2, TILE - 8, TILE * 2 - 4);

  // Shelves
  ctx.fillStyle = isDark ? "#4a3a2a" : "#7a6345";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(px + 6, py + 4 + i * 22, TILE - 12, 2);
  }

  // Books (colorful spines with shadow lines between)
  const bookColors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
  for (let shelf = 0; shelf < 3; shelf++) {
    const shelfY = py + 8 + shelf * 22;
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = bookColors[(shelf * 5 + b) % bookColors.length];
      ctx.fillRect(px + 8 + b * 7, shelfY, 5, 18);

      // Shadow line between book spines
      ctx.fillStyle = isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.15)";
      ctx.fillRect(px + 8 + b * 7 + 5, shelfY, 1, 18);

      // Top-edge highlight on each book
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(px + 8 + b * 7, shelfY, 5, 1);
    }
  }
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Frame shadow (depth behind board)
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.1)";
  ctx.fillRect(px + 6, py + 6, TILE * 2 - 8, TILE - 12);

  // Board
  ctx.fillStyle = isDark ? "#3a3a3a" : "#fff";
  ctx.strokeStyle = isDark ? "#555" : "#ccc";
  ctx.lineWidth = 2;
  ctx.fillRect(px + 4, py + 4, TILE * 2 - 8, TILE - 12);
  ctx.strokeRect(px + 4, py + 4, TILE * 2 - 8, TILE - 12);

  // Frame highlight (top edge)
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.4)";
  ctx.fillRect(px + 5, py + 5, TILE * 2 - 10, 1);

  // Scribble lines
  ctx.strokeStyle = isDark ? "#6a8aba" : "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 12, py + 14);
  ctx.lineTo(px + 60, py + 14);
  ctx.moveTo(px + 12, py + 22);
  ctx.lineTo(px + 50, py + 22);
  ctx.moveTo(px + 12, py + 30);
  ctx.lineTo(px + 40, py + 30);
  ctx.stroke();

  // Checkmark
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 70, py + 12);
  ctx.lineTo(px + 74, py + 18);
  ctx.lineTo(px + 82, py + 10);
  ctx.stroke();
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Rack body
  ctx.fillStyle = isDark ? "#2a2a2a" : "#444";
  ctx.fillRect(px + 8, py + 2, TILE - 16, TILE * 2 - 4);

  // Server units
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = isDark ? "#333" : "#555";
    ctx.fillRect(px + 12, py + 6 + i * 18, TILE - 24, 14);

    // LED indicators (random blink states)
    const ledColors = ["#22c55e", "#eab308", "#22c55e"];
    for (let led = 0; led < 3; led++) {
      ctx.fillStyle = ledColors[led];
      ctx.beginPath();
      ctx.arc(px + TILE - 18 + led * 4, py + 12 + i * 18, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean, lampsOn: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  // Light cone (when on)
  if (lampsOn) {
    const gradient = ctx.createRadialGradient(
      px + TILE / 2, py + TILE / 2, 2,
      px + TILE / 2, py + TILE / 2, TILE * 0.8
    );
    gradient.addColorStop(0, "rgba(255,200,50,0.15)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(px - 8, py - 8, TILE + 16, TILE + 16);
  }

  // Base
  ctx.fillStyle = isDark ? "#5a5a5a" : "#999";
  ctx.fillRect(px + 18, py + 34, 12, 8);

  // Pole
  ctx.fillStyle = isDark ? "#4a4a4a" : "#888";
  ctx.fillRect(px + 22, py + 12, 4, 24);

  // Shade
  ctx.fillStyle = lampsOn ? (isDark ? "#ffd93d" : "#ffe066") : (isDark ? "#555" : "#bbb");
  ctx.beginPath();
  ctx.moveTo(px + 14, py + 14);
  ctx.lineTo(px + 34, py + 14);
  ctx.lineTo(px + 30, py + 6);
  ctx.lineTo(px + 18, py + 6);
  ctx.closePath();
  ctx.fill();
}

function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);
  const pw = w * TILE;
  const ph = h * TILE;

  ctx.fillStyle = hexToRgba(color, 0.06);
  ctx.beginPath();
  ctx.roundRect(px + 4, py + 4, pw - 8, ph - 8, 6);
  ctx.fill();

  // Border pattern
  ctx.strokeStyle = hexToRgba(color, 0.12);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.roundRect(px + 8, py + 8, pw - 16, ph - 16, 4);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
  const px = Math.floor(x * TILE);
  const py = Math.floor(y * TILE);

  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  ctx.fillRect(px + 20, py + 2, 8, TILE - 4);

  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 20, py + 2, 8, TILE - 4);
}

// ---------------------------------------------------------------------------
// Main furniture dispatcher
// ---------------------------------------------------------------------------

export function renderFurniture(
  ctx: CanvasRenderingContext2D,
  furniture: readonly OfficeFurniture[],
  isDark: boolean,
  lampsOn: boolean
): void {
  for (const item of furniture) {
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
        drawRug(ctx, item.x, item.y, item.width, item.height, "#eab308");
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
  dawn: { color: "#fff7e6", opacity: 0.1 },
  morning: { color: "#fff7e6", opacity: 0.05 },
  afternoon: { color: "transparent", opacity: 0 },
  golden: { color: "#ff9f43", opacity: 0.08 },
  dusk: { color: "#6c5ce7", opacity: 0.1 },
  night: { color: "#0a0a2e", opacity: 0.18 },
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
// Window light shafts
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
  ctx.globalAlpha = isMorning ? 0.06 : 0.08;

  const startX = isMorning ? width - 10 : 10;
  const angle = isMorning ? -0.4 : 0.4;

  for (let i = 0; i < 3; i++) {
    const gradient = ctx.createLinearGradient(
      startX,
      50 + i * 120,
      startX + (isMorning ? -200 : 200),
      200 + i * 120
    );
    gradient.addColorStop(0, "rgba(255,220,100,0.8)");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.save();
    ctx.translate(startX, 50 + i * 120);
    ctx.rotate(angle);
    ctx.fillRect(0, 0, isMorning ? -250 : 250, 60);
    ctx.restore();
  }

  ctx.restore();
}
