import { describe, expect, test } from "bun:test";
import { withEncounterTelemetry } from "./support/authoritative-telemetry-adapter";
import { EncounterCompatibilityRecorder, type EncounterFrame } from "./support/encounter-compatibility";

function frame(at: number, playerIds: readonly string[]): EncounterFrame {
  return {
    at,
    phase: "defense",
    players: playerIds.map((id) => ({ id, hp: 150, maxHp: 150, downed: false })),
    lanes: [{
      lane: "north",
      gateHp: 260,
      gateMaxHp: 260,
      breached: false,
      dangerBandThreats: 0,
    }],
    nexusHp: 800,
    nexusMaxHp: 800,
    riftHeartHp: 1_250,
    riftHeartMaxHp: 1_250,
  };
}

describe("provisional authoritative telemetry adapter", () => {
  test("plugs into options structurally and preserves per-player resolved attribution", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, ["defender-a", "defender-b"]));
    const options = withEncounterTelemetry({ accelerated: true, enemyCap: 260 }, recorder);

    options.telemetry({
      at: 4,
      sourcePlayerId: "defender-a",
      actionId: "cleave",
      targetId: "imp-1",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 42,
    });
    options.telemetry({
      at: 4,
      sourcePlayerId: "defender-a",
      actionId: "cleave",
      targetId: "imp-2",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 37,
    });
    options.telemetry({
      at: 5,
      sourcePlayerId: "defender-b",
      actionId: "perfect_guard",
      targetId: "brute-1",
      targetClass: "elite",
      outcome: "interrupt",
      magnitude: 1,
      duration: 0.55,
    });
    recorder.recordFrame(frame(8, ["defender-a", "defender-b"]));

    const summary = recorder.finish();
    expect(options).toMatchObject({ accelerated: true, enemyCap: 260 });
    expect(summary.contribution["defender-a"]!.damage.normal).toBe(79);
    expect(summary.contribution["defender-a"]!.outcomeEventsByAction.cleave).toBe(2);
    expect(summary.contribution["defender-b"]!.interrupts.elite).toBe(1);
    expect(summary.contribution["defender-b"]!.outcomeEventsByAction.perfect_guard).toBe(1);
  });

  test("retains the recorder's stable nondecreasing timestamp contract", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, ["defender-a"]));
    const { telemetry } = withEncounterTelemetry({}, recorder);
    telemetry({
      at: 2,
      sourcePlayerId: "defender-a",
      actionId: "greatsword_basic",
      targetId: "imp-1",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 30,
    });
    telemetry({
      at: 2,
      sourcePlayerId: "defender-a",
      actionId: "greatsword_basic",
      targetId: "imp-2",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 30,
    });

    expect(() => telemetry({
      at: 1.99,
      sourcePlayerId: "defender-a",
      actionId: "greatsword_basic",
      targetId: "imp-3",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 30,
    })).toThrow("chronological order");
  });

  test("attributes objective damage without treating target events as cast counts", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, ["defender-a"]));
    const { telemetry } = withEncounterTelemetry({}, recorder);
    telemetry({
      at: 10,
      sourcePlayerId: "defender-a",
      actionId: "colossal_strike",
      targetId: "rift_heart",
      targetClass: "objective",
      outcome: "damage",
      magnitude: 180,
    });
    recorder.recordFrame({ ...frame(11, ["defender-a"]), phase: "push", riftHeartHp: 1_070 });

    const contribution = recorder.finish().contribution["defender-a"]!;
    expect(contribution.damage.objective).toBe(180);
    expect(contribution.outcomeEventsByAction.colossal_strike).toBe(1);
  });

  test("preserves the authoritative stored action identity on a later resolved event", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, ["defender-a"]));
    const { telemetry } = withEncounterTelemetry({}, recorder);
    telemetry({
      at: 8,
      sourcePlayerId: "defender-a",
      actionId: "greatsword_basic",
      targetId: "imp-1",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 30,
    });
    telemetry({
      at: 9,
      sourcePlayerId: "defender-a",
      actionId: "bladestorm",
      targetId: "imp-2",
      targetClass: "normal",
      outcome: "damage",
      magnitude: 44,
    });
    recorder.recordFrame(frame(10, ["defender-a"]));

    const events = recorder.finish().contribution["defender-a"]!.outcomeEventsByAction;
    expect(events.greatsword_basic).toBe(1);
    expect(events.bladestorm).toBe(1);
  });
});
