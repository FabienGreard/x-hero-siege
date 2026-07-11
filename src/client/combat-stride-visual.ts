import type { ActionSnapshot, ItemId, Vec2 } from "../shared/protocol";

export const COMBAT_STRIDE_ECHO_DISTANCE_SCALE = 0.18;
export const COMBAT_STRIDE_LOCAL_OPACITY_BOOST = 0.18;
export const COMBAT_STRIDE_ALLY_OPACITY_BOOST = 0.1;

export interface CombatStrideEchoInput {
  itemId: ItemId | null;
  attuned: boolean;
  velocity: Vec2;
  action: ActionSnapshot | null;
  baseScale: number;
  isLocal: boolean;
}

export interface CombatStrideEchoState {
  active: boolean;
  settling: boolean;
  offset: Vec2;
  opacityBoost: number;
}

const INACTIVE_ECHO: CombatStrideEchoState = {
  active: false,
  settling: false,
  offset: { x: 0, z: 0 },
  opacityBoost: 0,
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smoothstep = (value: number): number => {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
};

/**
 * Derives the restrained Fleetstep motion echo from authoritative snapshots.
 * It never creates an event or retained client milestone, so hydration and
 * reconnects can only render the action that is actually happening now.
 */
export function deriveCombatStrideEcho(input: CombatStrideEchoInput): CombatStrideEchoState {
  const { itemId, attuned, velocity, action, baseScale, isLocal } = input;
  const speed = Math.hypot(velocity.x, velocity.z);
  if (
    itemId !== "fleetstep_greaves" ||
    !attuned ||
    speed <= 0.1 ||
    action?.kind !== "basic"
  ) return INACTIVE_ECHO;

  const progress = clamp01(1 - action.remaining / Math.max(0.001, action.duration));
  let active = false;
  let settling = false;
  let trailFactor = 0;

  if (action.phase === "windup") {
    active = true;
    trailFactor = 0.72 + smoothstep(progress) * 0.28;
  } else if (action.phase === "active") {
    active = true;
    trailFactor = 1;
  } else if (action.phase === "recovery") {
    settling = true;
    trailFactor = 1 - smoothstep(progress);
  }

  if (!active && !settling) return INACTIVE_ECHO;
  const distance = Math.max(0, baseScale) * COMBAT_STRIDE_ECHO_DISTANCE_SCALE * trailFactor;
  const opacityBoost = active
    ? (isLocal ? COMBAT_STRIDE_LOCAL_OPACITY_BOOST : COMBAT_STRIDE_ALLY_OPACITY_BOOST) * trailFactor
    : 0;
  return {
    active,
    settling,
    offset: {
      x: -(velocity.x / speed) * distance,
      z: -(velocity.z / speed) * distance,
    },
    opacityBoost,
  };
}
