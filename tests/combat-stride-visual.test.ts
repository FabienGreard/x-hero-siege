import { describe, expect, test } from "bun:test";
import {
  COMBAT_STRIDE_ALLY_OPACITY_BOOST,
  COMBAT_STRIDE_ECHO_DISTANCE_SCALE,
  COMBAT_STRIDE_LOCAL_OPACITY_BOOST,
  deriveCombatStrideEcho,
} from "../src/client/combat-stride-visual";
import type { ActionSnapshot, ItemId, Vec2 } from "../src/shared/protocol";

const action = (
  phase: ActionSnapshot["phase"],
  kind: ActionSnapshot["kind"] = "basic",
  remaining = 0.15,
  duration = 0.3,
): ActionSnapshot => ({
  kind,
  phase,
  remaining,
  duration,
  direction: { x: 0, z: -1 },
});

interface DeriveOptions {
  itemId?: ItemId | null;
  attuned?: boolean;
  velocity?: Vec2;
  currentAction?: ActionSnapshot | null;
  baseScale?: number;
  isLocal?: boolean;
}

const derive = ({
  itemId = "fleetstep_greaves" as ItemId | null,
  attuned = true,
  velocity = { x: 1, z: 0 } as Vec2,
  currentAction = action("active"),
  baseScale = 6.2,
  isLocal = true,
}: DeriveOptions = {}) => deriveCombatStrideEcho({
  itemId,
  attuned,
  velocity,
  action: currentAction,
  baseScale,
  isLocal,
});

describe("Combat Stride battlefield echo", () => {
  test("trails opposite authoritative movement instead of attack aim", () => {
    const result = derive();
    expect(result.active).toBe(true);
    expect(result.settling).toBe(false);
    expect(result.offset.x).toBeCloseTo(-6.2 * COMBAT_STRIDE_ECHO_DISTANCE_SCALE);
    expect(result.offset.z).toBeCloseTo(0);
    expect(result.opacityBoost).toBeCloseTo(COMBAT_STRIDE_LOCAL_OPACITY_BOOST);
  });

  test("uses the quieter established ally hierarchy", () => {
    const ally = derive({ isLocal: false });
    expect(ally.active).toBe(true);
    expect(ally.opacityBoost).toBeCloseTo(COMBAT_STRIDE_ALLY_OPACITY_BOOST);
    expect(ally.opacityBoost).toBeLessThan(derive().opacityBoost);
  });

  test("reads during moving primary windup and impact only", () => {
    expect(derive({ currentAction: action("windup", "basic", 0.3, 0.3) }).active).toBe(true);
    expect(derive({ currentAction: action("active") }).active).toBe(true);
    for (const currentAction of [
      null,
      action("windup", "ability1"),
      action("active", "ability2"),
    ]) {
      expect(derive({ currentAction }).active).toBe(false);
      expect(derive({ currentAction }).offset).toEqual({ x: 0, z: 0 });
    }
  });

  test("remains absent without the exact earned movement state", () => {
    const inactive = [
      derive({ itemId: null }),
      derive({ itemId: "tempered_edge" }),
      derive({ attuned: false }),
      derive({ velocity: { x: 0.1, z: 0 } }),
      derive({ velocity: { x: 0, z: 0 } }),
    ];
    for (const result of inactive) {
      expect(result).toEqual({
        active: false,
        settling: false,
        offset: { x: 0, z: 0 },
        opacityBoost: 0,
      });
    }
  });

  test("eases the existing echo home through recovery without an active lift", () => {
    const early = derive({ currentAction: action("recovery", "basic", 0.3, 0.3) });
    const late = derive({ currentAction: action("recovery", "basic", 0.03, 0.3) });
    expect(early.active).toBe(false);
    expect(early.settling).toBe(true);
    expect(early.offset.x).toBeCloseTo(-6.2 * COMBAT_STRIDE_ECHO_DISTANCE_SCALE);
    expect(early.opacityBoost).toBe(0);
    expect(late.settling).toBe(true);
    expect(Math.abs(late.offset.x)).toBeLessThan(Math.abs(early.offset.x));
    expect(late.opacityBoost).toBe(0);
  });

  test("normalizes diagonal velocity so the trail distance stays constant", () => {
    const result = derive({ velocity: { x: 2, z: 2 } });
    expect(Math.hypot(result.offset.x, result.offset.z)).toBeCloseTo(6.2 * COMBAT_STRIDE_ECHO_DISTANCE_SCALE);
    expect(result.offset.x).toBeLessThan(0);
    expect(result.offset.z).toBeLessThan(0);
  });
});
