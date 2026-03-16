/**
 * Procedural 16x24 pixel character sprite generation via Canvas.
 * Characters are drawn on OffscreenCanvas and cached for reuse.
 */

import type { CharacterAppearance, Direction } from "../stores/office-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPRITE_W = 16;
const SPRITE_H = 24;
const SCALE = 3; // render at 3x for sharp pixel art
export const CHAR_W = SPRITE_W * SCALE; // 48px
export const CHAR_H = SPRITE_H * SCALE; // 72px

const WALK_FRAMES = 4;

// ---------------------------------------------------------------------------
// Hair style definitions (row of pixels relative to head top)
// Each is a set of [x, y, w, h] rects on the 16x24 grid
// ---------------------------------------------------------------------------

type PixelRect = readonly [number, number, number, number];

const HAIR_STYLES: Record<number, readonly PixelRect[]> = {
  0: [ // Short
    [4, 0, 8, 3],
    [3, 1, 1, 2],
    [12, 1, 1, 2],
  ],
  1: [ // Medium
    [4, 0, 8, 4],
    [3, 1, 1, 4],
    [12, 1, 1, 4],
  ],
  2: [ // Long
    [4, 0, 8, 4],
    [3, 1, 1, 8],
    [12, 1, 1, 8],
    [4, 8, 2, 2],
    [10, 8, 2, 2],
  ],
  3: [ // Ponytail
    [4, 0, 8, 3],
    [3, 1, 1, 3],
    [12, 1, 1, 3],
    [12, 3, 2, 6],
    [13, 5, 1, 3],
  ],
  4: [], // Bald — no hair rects
};

// ---------------------------------------------------------------------------
// Body templates per direction (front/back/left/right)
// ---------------------------------------------------------------------------

interface BodyTemplate {
  readonly head: PixelRect;
  readonly eyeL: PixelRect;
  readonly eyeR: PixelRect;
  readonly torso: PixelRect;
  readonly legL: PixelRect;
  readonly legR: PixelRect;
  readonly shadow: PixelRect;
}

const BODY_TEMPLATES: Record<Direction, BodyTemplate> = {
  down: {
    head: [4, 1, 8, 7],
    eyeL: [5, 4, 2, 2],
    eyeR: [9, 4, 2, 2],
    torso: [3, 8, 10, 7],
    legL: [4, 15, 4, 8],
    legR: [8, 15, 4, 8],
    shadow: [3, 22, 10, 2],
  },
  up: {
    head: [4, 1, 8, 7],
    eyeL: [0, 0, 0, 0], // not visible from behind
    eyeR: [0, 0, 0, 0],
    torso: [3, 8, 10, 7],
    legL: [4, 15, 4, 8],
    legR: [8, 15, 4, 8],
    shadow: [3, 22, 10, 2],
  },
  left: {
    head: [4, 1, 7, 7],
    eyeL: [4, 4, 2, 2],
    eyeR: [0, 0, 0, 0], // side view, one eye
    torso: [4, 8, 8, 7],
    legL: [5, 15, 3, 8],
    legR: [8, 15, 3, 8],
    shadow: [4, 22, 8, 2],
  },
  right: {
    head: [5, 1, 7, 7],
    eyeL: [0, 0, 0, 0],
    eyeR: [10, 4, 2, 2],
    torso: [4, 8, 8, 7],
    legL: [5, 15, 3, 8],
    legR: [8, 15, 3, 8],
    shadow: [4, 22, 8, 2],
  },
};

// Walk cycle leg offsets per frame (Y shift for each leg)
const WALK_OFFSETS: readonly { legLY: number; legRY: number }[] = [
  { legLY: 0, legRY: 0 },
  { legLY: -1, legRY: 1 },
  { legLY: 0, legRY: 0 },
  { legLY: 1, legRY: -1 },
];

// ---------------------------------------------------------------------------
// Sprite generation
// ---------------------------------------------------------------------------

function fillPixelRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: PixelRect,
  color: string,
  offsetY: number = 0
): void {
  const [x, y, w, h] = rect;
  if (w === 0 || h === 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y + offsetY, w, h);
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Draw a single character frame at the native 16x24 resolution.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  appearance: CharacterAppearance,
  direction: Direction,
  frame: number,
  offsetX: number
): void {
  const tmpl = BODY_TEMPLATES[direction];
  const walkOff = WALK_OFFSETS[frame];

  ctx.save();
  ctx.translate(offsetX, 0);

  // Shadow
  fillPixelRect(ctx, tmpl.shadow, "rgba(0,0,0,0.15)");

  // Legs (with walk cycle offset)
  const legColor = appearance.pantsColor;
  const shoeColor = darken(appearance.pantsColor, 40);

  // Left leg
  const [llx, lly, llw, llh] = tmpl.legL;
  if (llw > 0) {
    ctx.fillStyle = legColor;
    ctx.fillRect(llx, lly + walkOff.legLY, llw, llh - 2);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(llx, lly + llh - 2 + walkOff.legLY, llw, 2);
  }

  // Right leg
  const [rlx, rly, rlw, rlh] = tmpl.legR;
  if (rlw > 0) {
    ctx.fillStyle = legColor;
    ctx.fillRect(rlx, rly + walkOff.legRY, rlw, rlh - 2);
    ctx.fillStyle = shoeColor;
    ctx.fillRect(rlx, rly + rlh - 2 + walkOff.legRY, rlw, 2);
  }

  // Torso
  fillPixelRect(ctx, tmpl.torso, appearance.shirtColor);

  // Head (skin)
  fillPixelRect(ctx, tmpl.head, appearance.skinTone);

  // Eyes
  const eyeColor = "#222";
  fillPixelRect(ctx, tmpl.eyeL, eyeColor);
  fillPixelRect(ctx, tmpl.eyeR, eyeColor);

  // Hair
  const hairRects = HAIR_STYLES[appearance.hairStyle] ?? HAIR_STYLES[0];
  for (const rect of hairRects) {
    fillPixelRect(ctx, rect, appearance.hairColor);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Sprite sheet generation (all 4 walk frames for one direction)
// ---------------------------------------------------------------------------

/**
 * Generate a sprite sheet with 4 walk frames for a given direction.
 * Returns a canvas of size (SPRITE_W * 4 * SCALE) x (SPRITE_H * SCALE).
 */
export function generateSpriteSheet(
  appearance: CharacterAppearance,
  direction: Direction
): HTMLCanvasElement {
  const sheetW = SPRITE_W * WALK_FRAMES;
  const sheetH = SPRITE_H;

  const canvas = document.createElement("canvas");
  canvas.width = sheetW * SCALE;
  canvas.height = sheetH * SCALE;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false; // crisp pixel art
  ctx.scale(SCALE, SCALE);

  for (let f = 0; f < WALK_FRAMES; f++) {
    drawFrame(ctx, appearance, direction, f, f * SPRITE_W);
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// Cached sprite manager
// ---------------------------------------------------------------------------

type SpriteCache = Map<string, HTMLCanvasElement>;

const spriteCache: SpriteCache = new Map();

function cacheKey(appearance: CharacterAppearance, direction: Direction): string {
  return `${appearance.hairStyle}-${appearance.hairColor}-${appearance.skinTone}-${appearance.shirtColor}-${appearance.pantsColor}-${direction}`;
}

/**
 * Get or generate a cached sprite sheet for an appearance + direction.
 */
export function getCachedSpriteSheet(
  appearance: CharacterAppearance,
  direction: Direction
): HTMLCanvasElement {
  const key = cacheKey(appearance, direction);
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const sheet = generateSpriteSheet(appearance, direction);
  spriteCache.set(key, sheet);
  return sheet;
}

/**
 * Clear the sprite cache (e.g., on appearance change).
 */
export function clearSpriteCache(): void {
  spriteCache.clear();
}

// ---------------------------------------------------------------------------
// Agent robot sprite
// ---------------------------------------------------------------------------

export function generateAgentSprite(
  color: string,
  icon: string,
  status: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W * SCALE;
  canvas.height = SPRITE_H * SCALE;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(3, 22, 10, 2);

  // Body
  ctx.fillStyle = "#4a4a5a";
  ctx.fillRect(3, 10, 10, 10);

  // Head
  ctx.fillStyle = "#5a5a6a";
  ctx.fillRect(4, 2, 8, 8);

  // Antenna
  ctx.fillStyle = "#888";
  ctx.fillRect(7, 0, 2, 3);

  // Antenna tip (status-colored)
  const tipColor =
    status === "working" ? "#4a90d9" :
    status === "error" ? "#ef4444" :
    status === "thinking" ? "#eab308" :
    "#22c55e";
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.arc(8, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (LEDs)
  ctx.fillStyle = color;
  ctx.fillRect(5, 4, 2, 2);
  ctx.fillRect(9, 4, 2, 2);

  // Chest icon area
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(5, 12, 6, 6);

  // Legs
  ctx.fillStyle = "#3a3a4a";
  ctx.fillRect(4, 20, 3, 3);
  ctx.fillRect(9, 20, 3, 3);

  return canvas;
}
