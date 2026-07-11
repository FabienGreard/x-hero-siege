import type { Vec2 } from "./protocol";

export const CINDER_WALL_DURATION_SECONDS = 2;
export const CINDER_WALL_START_DISTANCE = 3.2;
export const CINDER_WALL_END_DISTANCE = 16;
export const CINDER_WALL_LENGTH = CINDER_WALL_END_DISTANCE - CINDER_WALL_START_DISTANCE;
export const CINDER_WALL_BASE_HALF_WIDTH = 3.2;
export const CINDER_WALL_SLOW_SECONDS = 2;

const CINDER_WALL_WIDTH_GAIN_PER_RANK = 0.08;

export interface CinderWallEndpoints {
  start: Vec2;
  end: Vec2;
}

function normalizedDirection(direction: Vec2): Vec2 {
  const x = Number.isFinite(direction.x) ? direction.x : 0;
  const z = Number.isFinite(direction.z) ? direction.z : 0;
  const magnitude = Math.hypot(x, z);
  return magnitude > 0.0001
    ? { x: x / magnitude, z: z / magnitude }
    : { x: 0, z: -1 };
}

/** The wall widens by eight percent of its base half-width at each rank after one. */
export function cinderWallHalfWidth(rank: number): number {
  const safeRank = Math.max(1, Math.floor(Number.isFinite(rank) ? rank : 1));
  return CINDER_WALL_BASE_HALF_WIDTH * (
    1 + (safeRank - 1) * CINDER_WALL_WIDTH_GAIN_PER_RANK
  );
}

/** Samples the persistent line from the caster and committed cast direction. */
export function cinderWallEndpoints(origin: Vec2, direction: Vec2): CinderWallEndpoints {
  const normalized = normalizedDirection(direction);
  return {
    start: {
      x: origin.x + normalized.x * CINDER_WALL_START_DISTANCE,
      z: origin.z + normalized.z * CINDER_WALL_START_DISTANCE,
    },
    end: {
      x: origin.x + normalized.x * CINDER_WALL_END_DISTANCE,
      z: origin.z + normalized.z * CINDER_WALL_END_DISTANCE,
    },
  };
}

/**
 * Tests a target circle against the wall's center segment. Pass wall half-width
 * plus target radius as `combinedRadius`; the end caps therefore stay honest.
 */
export function cinderWallContainsPoint(
  start: Vec2,
  end: Vec2,
  point: Vec2,
  combinedRadius: number,
): boolean {
  const segment = { x: end.x - start.x, z: end.z - start.z };
  const lengthSquared = segment.x * segment.x + segment.z * segment.z;
  const radius = Number.isFinite(combinedRadius) ? Math.max(0, combinedRadius) : 0;
  const relative = { x: point.x - start.x, z: point.z - start.z };
  const progress = lengthSquared > 0.000_001
    ? Math.max(0, Math.min(1, (
        relative.x * segment.x + relative.z * segment.z
      ) / lengthSquared))
    : 0;
  const closest = {
    x: start.x + segment.x * progress,
    z: start.z + segment.z * progress,
  };
  return Math.hypot(point.x - closest.x, point.z - closest.z) <= radius;
}
