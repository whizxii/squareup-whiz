/**
 * A* pathfinding on a walkable tile grid for click-to-move.
 */

interface Node {
  readonly x: number;
  readonly y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

/**
 * Build a walkability grid. Returns true for walkable tiles.
 */
export function buildWalkableGrid(
  cols: number,
  rows: number,
  blockedTiles: ReadonlySet<string>
): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = !blockedTiles.has(`${x},${y}`);
    }
  }
  return grid;
}

/**
 * Create a set of blocked tile keys from furniture positions.
 */
export function getBlockedTiles(
  furniture: readonly { x: number; y: number; width: number; height: number; type: string }[]
): ReadonlySet<string> {
  const blocked = new Set<string>();
  for (const item of furniture) {
    // Rugs and lamps don't block movement
    if (item.type === "rug" || item.type === "lamp") continue;

    for (let dy = 0; dy < item.height; dy++) {
      for (let dx = 0; dx < item.width; dx++) {
        blocked.add(`${item.x + dx},${item.y + dy}`);
      }
    }
  }
  return blocked;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * A* pathfinding. Returns an array of { x, y } steps from start to goal,
 * or null if no path exists.
 */
export function findPath(
  grid: boolean[][],
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): { x: number; y: number }[] | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  if (
    startX < 0 || startX >= cols ||
    startY < 0 || startY >= rows ||
    goalX < 0 || goalX >= cols ||
    goalY < 0 || goalY >= rows
  ) {
    return null;
  }

  if (!grid[goalY][goalX]) return null;
  if (startX === goalX && startY === goalY) return [];

  const open: Node[] = [];
  const closed = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, goalX, goalY),
    f: heuristic(startX, startY, goalX, goalY),
    parent: null,
  };

  open.push(startNode);

  const DIRS = [
    [0, -1], [0, 1], [-1, 0], [1, 0], // cardinal
  ] as const;

  let iterations = 0;
  const MAX_ITERATIONS = 500;

  while (open.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Find lowest f in open list
    let lowestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[lowestIdx].f) lowestIdx = i;
    }

    const current = open[lowestIdx];

    // Goal reached
    if (current.x === goalX && current.y === goalY) {
      const path: { x: number; y: number }[] = [];
      let node: Node | null = current;
      while (node !== null) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      // Remove start position from path
      path.shift();
      return path;
    }

    open.splice(lowestIdx, 1);
    closed.add(tileKey(current.x, current.y));

    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (!grid[ny][nx]) continue;
      if (closed.has(tileKey(nx, ny))) continue;

      const g = current.g + 1;
      const h = heuristic(nx, ny, goalX, goalY);
      const f = g + h;

      const existing = open.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
        continue;
      }

      open.push({ x: nx, y: ny, g, h, f, parent: current });
    }
  }

  return null;
}
