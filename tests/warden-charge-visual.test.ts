import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  createEffectVisual,
  wardenChargeStreakStyle,
} from "../src/client/visuals";

describe("Warden charge streak presentation", () => {
  test("scales within subordinate length, width, opacity, and taper bounds", () => {
    const minimum = wardenChargeStreakStyle(0);
    const middle = wardenChargeStreakStyle(4);
    const maximum = wardenChargeStreakStyle(100);

    expect(minimum.length).toBe(2.4);
    expect(minimum.width).toBe(0.65);
    expect(maximum.length).toBe(6.5);
    expect(maximum.width).toBe(1.35);
    expect(middle.length).toBeGreaterThan(minimum.length);
    expect(middle.length).toBeLessThan(maximum.length);
    expect(middle.tipWidth).toBeLessThan(middle.tailWidth);
    expect(middle.tailWidth).toBeLessThan(middle.width);
    expect(middle.opacity).toBe(0.22);
    expect(wardenChargeStreakStyle(Number.NaN)).toEqual(minimum);
  });

  test("renders one tapered translucent fill with no hard edge or end-cap pieces", () => {
    const visual = createEffectVisual("warden_charge", 4, 0);
    const pieces = visual.userData.pieces as Array<{ mesh: THREE.Mesh; baseOpacity: number }>;

    expect(pieces).toHaveLength(1);
    expect(visual.children).toHaveLength(1);
    expect(pieces[0]!.mesh.name).toBe("warden-charge-streak");
    expect(pieces[0]!.mesh.geometry.name).toBe("warden-charge-tapered-streak");
    expect(pieces[0]!.mesh.geometry).not.toBeInstanceOf(THREE.BoxGeometry);
    expect(pieces[0]!.baseOpacity).toBe(0.22);
    expect((pieces[0]!.mesh.material as THREE.MeshBasicMaterial).transparent).toBe(true);
  });
});
