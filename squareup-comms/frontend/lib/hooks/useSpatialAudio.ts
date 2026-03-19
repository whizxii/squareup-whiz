/**
 * Spatial audio volume calculation.
 * Given the current user's position and a target entity's position,
 * returns a volume level (0.0–1.0) based on tile distance.
 *
 * Distance model:
 *   ≤ 2 tiles  →  1.0 (full volume)
 *   2–5 tiles  →  linear fade from 1.0 → 0.0
 *   > 5 tiles  →  0.0 (muted)
 */

const FULL_VOLUME_RANGE = 2;
const FADE_RANGE = 5;

export function computeSpatialVolume(
  myX: number,
  myY: number,
  targetX: number,
  targetY: number,
): number {
  const dx = Math.abs(myX - targetX);
  const dy = Math.abs(myY - targetY);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= FULL_VOLUME_RANGE) return 1.0;
  if (distance >= FADE_RANGE) return 0.0;

  // Linear fade between FULL_VOLUME_RANGE and FADE_RANGE
  return 1.0 - (distance - FULL_VOLUME_RANGE) / (FADE_RANGE - FULL_VOLUME_RANGE);
}

/**
 * Compute volume map for all participants.
 * Returns a Map of participantIdentity → volume.
 */
export function computeVolumeMap(
  myX: number,
  myY: number,
  participantPositions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
): ReadonlyMap<string, number> {
  const volumes = new Map<string, number>();

  for (const [identity, pos] of participantPositions) {
    volumes.set(identity, computeSpatialVolume(myX, myY, pos.x, pos.y));
  }

  return volumes;
}
