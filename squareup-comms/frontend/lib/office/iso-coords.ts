/**
 * Isometric coordinate utilities.
 *
 * The office uses a 2:1 isometric projection where the canvas transform is:
 *   ctx.transform(1, 0.5, -1, 0.5, gridRows * TILE, 0)
 *
 * This converts standard top-down grid coordinates (tx, ty) to screen
 * positions on the diamond-shaped isometric canvas:
 *   screen_x = (tx - ty) * TILE + gridRows * TILE
 *   screen_y = (tx + ty + 1) * TILE / 2   (center of tile, vertically)
 *
 * Used by all HTML overlay components (OfficeCharacter, OfficeAgent, etc.)
 * to position themselves on the isometric stage.
 */

import { TILE } from "./office-renderer";

/**
 * Convert tile coordinates to isometric screen position.
 * Returns the pixel center of the tile (horizontal center of the diamond,
 * vertical midpoint between north and south corners).
 */
export function tileToIso(
  tx: number,
  ty: number,
  gridRows: number,
): { x: number; y: number } {
  return {
    x: (tx - ty) * TILE + gridRows * TILE,
    y: (tx + ty + 1) * (TILE / 2),
  };
}

/**
 * Convert an isometric screen position back to (fractional) tile coordinates.
 * Used by the canvas click handler to map clicks to tiles.
 */
export function isoToTile(
  sx: number,
  sy: number,
  gridRows: number,
): { x: number; y: number } {
  const diff = (sx - gridRows * TILE) / TILE;
  const sum = sy * 2 / TILE - 1;
  return {
    x: (diff + sum) / 2,
    y: (sum - diff) / 2,
  };
}

/**
 * Calculate the pixel dimensions of the isometric canvas for a given grid.
 *
 * In iso projection:
 *   - Width  = (gridCols + gridRows) * TILE
 *   - Height = (gridCols + gridRows) * TILE / 2
 */
export function isoCanvasSize(
  gridCols: number,
  gridRows: number,
): { width: number; height: number } {
  return {
    width: (gridCols + gridRows) * TILE,
    height: (gridCols + gridRows) * (TILE / 2),
  };
}
