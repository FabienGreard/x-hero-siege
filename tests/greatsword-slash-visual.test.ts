import { describe, expect, test } from "bun:test";
import {
  ALLIED_GREATSWORD_IMPACT_OPACITY,
  ALLIED_GREATSWORD_SLASH_OPACITY,
  GREATSWORD_SLASH_DECAY_SECONDS,
  GREATSWORD_SLASH_EDGE_COLOR,
  GREATSWORD_SLASH_OUTER_COLOR,
  createEffectVisual,
  greatswordSlashOpacity,
  playerEffectOpacityMultiplier,
  updateEffectVisual,
} from "../src/client/visuals";

describe("Greatsword slash visual hierarchy", () => {
  test("uses the approved bone-white and aged-gold pair", () => {
    expect(GREATSWORD_SLASH_OUTER_COLOR).toBe(0xf1e6d0);
    expect(GREATSWORD_SLASH_EDGE_COLOR).toBe(0xd8bd78);
  });

  test("peaks at authoritative creation and becomes quiet before late recovery", () => {
    expect(greatswordSlashOpacity(-1)).toBe(1);
    expect(greatswordSlashOpacity(0)).toBe(1);
    expect(greatswordSlashOpacity(GREATSWORD_SLASH_DECAY_SECONDS / 2)).toBeCloseTo(0.5, 8);
    expect(greatswordSlashOpacity(GREATSWORD_SLASH_DECAY_SECONDS)).toBe(0);
    expect(greatswordSlashOpacity(GREATSWORD_SLASH_DECAY_SECONDS + 1)).toBe(0);
    expect(greatswordSlashOpacity(Number.NaN)).toBe(0);
  });

  test("keeps local actions dominant while retaining allied attribution", () => {
    expect(playerEffectOpacityMultiplier("slash", "self", "self")).toBe(1);
    expect(playerEffectOpacityMultiplier("impact", "self", "self")).toBe(1);
    expect(playerEffectOpacityMultiplier("slash", "ally", "self")).toBe(ALLIED_GREATSWORD_SLASH_OPACITY);
    expect(playerEffectOpacityMultiplier("impact", "ally", "self")).toBe(ALLIED_GREATSWORD_IMPACT_OPACITY);
    expect(ALLIED_GREATSWORD_SLASH_OPACITY).toBeGreaterThanOrEqual(0.45);
    expect(ALLIED_GREATSWORD_SLASH_OPACITY).toBeLessThanOrEqual(0.6);
    expect(ALLIED_GREATSWORD_IMPACT_OPACITY).toBeGreaterThanOrEqual(0.4);
    expect(ALLIED_GREATSWORD_IMPACT_OPACITY).toBeLessThanOrEqual(0.55);
  });

  test("does not attenuate enemy, world, or unattributed effects", () => {
    expect(playerEffectOpacityMultiplier("meteor_warning", "enemy", "self")).toBe(1);
    expect(playerEffectOpacityMultiplier("gate_hit", null, "self")).toBe(1);
    expect(playerEffectOpacityMultiplier("slash", "ally", null)).toBe(1);
  });

  test("applies the owner multiplier without changing slash geometry or lifetime", () => {
    const local = createEffectVisual("slash", 4, 0);
    const allied = createEffectVisual("slash", 4, 0);
    local.userData.ownerOpacityMultiplier = 1;
    allied.userData.ownerOpacityMultiplier = ALLIED_GREATSWORD_SLASH_OPACITY;

    updateEffectVisual(local, 0.3, 0);
    updateEffectVisual(allied, 0.3, 0);

    const localPieces = local.userData.pieces as Array<{ mesh: { material: { opacity: number } } }>;
    const alliedPieces = allied.userData.pieces as Array<{ mesh: { material: { opacity: number } } }>;
    expect(alliedPieces).toHaveLength(localPieces.length);
    for (let index = 0; index < localPieces.length; index += 1) {
      expect(alliedPieces[index]!.mesh.material.opacity).toBeCloseTo(
        localPieces[index]!.mesh.material.opacity * ALLIED_GREATSWORD_SLASH_OPACITY,
        8,
      );
    }
  });
});
