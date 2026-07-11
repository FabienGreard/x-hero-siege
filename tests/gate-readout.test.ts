import { describe, expect, test } from "bun:test";
import { deriveGateReadout } from "../src/client/gate-readout";
import type { GateSnapshot } from "../src/shared/protocol";

function gate(overrides: Partial<GateSnapshot> = {}): GateSnapshot {
  return {
    lane: "north",
    position: { x: 0, z: -50 },
    hp: 260,
    maxHp: 260,
    breached: false,
    ...overrides,
  };
}

describe("gate readout", () => {
  test("an active full gate has one exact healthy answer", () => {
    expect(deriveGateReadout(gate(), true, 0)).toEqual({
      ratio: 1,
      percent: 100,
      label: "100%",
      tone: "healthy",
      title: "North Gate: 260 of 260 health, 100%. 0 threats.",
      ariaLabel: "North Gate: 260 of 260 health, 100%. 0 threats.",
    });
  });

  test("damage preserves the exact ratio and names visible pressure", () => {
    expect(deriveGateReadout(gate({ hp: 130 }), true, 7)).toEqual({
      ratio: 0.5,
      percent: 50,
      label: "50%",
      tone: "damaged",
      title: "North Gate: 130 of 260 health, 50%. 7 threats.",
      ariaLabel: "North Gate: 130 of 260 health, 50%. 7 threats.",
    });
  });

  test("minor damage stays calm while still exposing the exact percentage", () => {
    expect(deriveGateReadout(gate({ hp: 195 }), true, 2)).toMatchObject({
      ratio: 0.75,
      percent: 75,
      label: "75%",
      tone: "healthy",
    });
  });

  test("a living gate at or below one quarter is critical", () => {
    const readout = deriveGateReadout(gate({ hp: 65 }), true, 1);
    expect(readout).toMatchObject({
      ratio: 0.25,
      percent: 25,
      label: "25%",
      tone: "critical",
      title: "North Gate: 65 of 260 health, 25%. 1 threat.",
    });
  });

  test("breach truth outranks percentage presentation", () => {
    expect(deriveGateReadout(gate({ lane: "west", hp: 0, breached: true }), true, 4)).toMatchObject({
      ratio: 0,
      percent: 0,
      label: "FALLEN",
      tone: "fallen",
      title: "West Gate: fallen. 4 threats.",
    });
  });

  test("an inactive intact approach reads as sealed", () => {
    expect(deriveGateReadout(gate({ lane: "east" }), false, 0)).toMatchObject({
      ratio: 1,
      percent: 100,
      label: "SEALED",
      tone: "sealed",
      title: "East Gate: sealed. 0 threats.",
    });
  });

  test("over-max health clamps to a full gate", () => {
    expect(deriveGateReadout(gate({ hp: 400 }), true, 0)).toMatchObject({
      ratio: 1,
      percent: 100,
      label: "100%",
      tone: "healthy",
      title: "North Gate: 260 of 260 health, 100%. 0 threats.",
    });
  });

  test("an invalid maximum stays finite and safely critical", () => {
    const readout = deriveGateReadout(gate({ hp: 30, maxHp: 0 }), true, -4);
    expect(readout).toMatchObject({
      ratio: 0,
      percent: 0,
      label: "0%",
      tone: "critical",
      title: "North Gate: 0 of 0 health, 0%. 0 threats.",
    });
    expect(Number.isFinite(readout.ratio)).toBe(true);
  });

  test("nonzero sub-one-percent health never renders as zero", () => {
    const readout = deriveGateReadout(gate({ hp: 1 }), true, 2);
    expect(readout.ratio).toBeCloseTo(1 / 260);
    expect(readout).toMatchObject({
      percent: 1,
      label: "1%",
      tone: "critical",
      title: "North Gate: 1 of 260 health, 1%. 2 threats.",
    });
  });
});
