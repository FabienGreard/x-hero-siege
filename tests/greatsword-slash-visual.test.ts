import { describe, expect, test } from "bun:test";
import {
  GREATSWORD_SLASH_DECAY_SECONDS,
  GREATSWORD_SLASH_EDGE_COLOR,
  GREATSWORD_SLASH_OUTER_COLOR,
  greatswordSlashOpacity,
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
});
