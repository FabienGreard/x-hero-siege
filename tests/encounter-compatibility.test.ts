import { describe, expect, test } from "bun:test";
import {
  EncounterCompatibilityRecorder,
  encounterFrameFromPublicSnapshot,
  type EncounterFrame,
  type EncounterTelemetryEvent,
} from "./support/encounter-compatibility";

function frame(
  at: number,
  phase: EncounterFrame["phase"],
  options: {
    gateHp?: number;
    dangerBandThreats?: number;
    playerHp?: number;
    downed?: boolean;
    nexusHp?: number;
    riftHeartHp?: number;
  } = {},
): EncounterFrame {
  return {
    at,
    phase,
    players: [{
      id: "defender-a",
      hp: options.playerHp ?? 150,
      maxHp: 150,
      downed: options.downed ?? false,
    }],
    lanes: [{
      lane: "north",
      gateHp: options.gateHp ?? 260,
      gateMaxHp: 260,
      breached: (options.gateHp ?? 260) <= 0,
      dangerBandThreats: options.dangerBandThreats ?? 0,
    }],
    nexusHp: options.nexusHp ?? 800,
    nexusMaxHp: 800,
    riftHeartHp: options.riftHeartHp ?? 1_250,
    riftHeartMaxHp: 1_250,
  };
}

function event(
  outcome: EncounterTelemetryEvent["outcome"],
  targetClass: EncounterTelemetryEvent["targetClass"],
  options: Partial<EncounterTelemetryEvent> = {},
): EncounterTelemetryEvent {
  return {
    at: 10,
    sourcePlayerId: "defender-a",
    actionId: "greatsword.cleave",
    targetId: `${targetClass}-target`,
    targetClass,
    outcome,
    ...options,
  };
}

describe("Greatsword encounter compatibility recorder", () => {
  test("derives gate-relative pressure from structural public snapshot fields", () => {
    const observed = encounterFrameFromPublicSnapshot({
      phase: "defense",
      phaseElapsed: 35,
      players: [{ id: "defender-a", hp: 128, maxHp: 150, downed: false }],
      gates: [
        { lane: "north", position: { x: 0, z: -52 }, hp: 246, maxHp: 260, breached: false },
        { lane: "east", position: { x: 52, z: 0 }, hp: 260, maxHp: 260, breached: false },
      ],
      enemies: [
        { lane: "north", position: { x: 0, z: -68 } },
        { lane: "north", position: { x: 2, z: -82 } },
        { lane: "east", position: { x: 75, z: 0 } },
        { lane: "east", position: { x: 86, z: 0 } },
      ],
      nexus: { hp: 800, maxHp: 800 },
      riftHeart: { hp: 1_250, maxHp: 1_250 },
    }, 43, 28);

    expect(observed.at).toBe(43);
    expect(observed.lanes).toEqual([
      { lane: "north", gateHp: 246, gateMaxHp: 260, breached: false, dangerBandThreats: 1 },
      { lane: "east", gateHp: 260, gateMaxHp: 260, breached: false, dangerBandThreats: 1 },
    ]);
    expect(observed.players[0]!.hp).toBe(128);
    expect(observed.nexusHp).toBe(800);
    expect(() => encounterFrameFromPublicSnapshot({
      phase: "defense",
      phaseElapsed: 0,
      players: [],
      gates: [],
      enemies: [],
      nexus: { hp: 800, maxHp: 800 },
      riftHeart: { hp: 1_250, maxHp: 1_250 },
    }, 0, -1)).toThrow("cannot be negative");
  });

  test("separates normal, elite, objective, damage, stagger, interrupt, and control evidence", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, "defense"));
    recorder.recordEvent(event("damage", "normal", { magnitude: 90 }));
    recorder.recordEvent(event("damage", "elite", { magnitude: 35, actionId: "greatsword.impale" }));
    recorder.recordEvent(event("stagger", "elite", { magnitude: 24, actionId: "greatsword.rising_slash" }));
    recorder.recordEvent(event("interrupt", "normal", { actionId: "greatsword.perfect_guard" }));
    recorder.recordEvent(event("control", "normal", { duration: 1.25, actionId: "greatsword.charge" }));
    recorder.recordEvent(event("damage", "objective", { magnitude: 50, actionId: "greatsword.colossal_strike" }));
    recorder.recordFrame(frame(20, "defense"));

    const contribution = recorder.finish().contribution["defender-a"]!;
    expect(contribution.damage).toEqual({ normal: 90, elite: 35, objective: 50 });
    expect(contribution.stagger.elite).toBe(24);
    expect(contribution.interrupts.normal).toBe(1);
    expect(contribution.controlApplications.normal).toBe(1);
    expect(contribution.controlSeconds.normal).toBe(1.25);
    expect(contribution.outcomeEventsByAction).toEqual({
      "greatsword.cleave": 1,
      "greatsword.impale": 1,
      "greatsword.rising_slash": 1,
      "greatsword.perfect_guard": 1,
      "greatsword.charge": 1,
      "greatsword.colossal_strike": 1,
    });
  });

  test("measures lane pressure recovery and objective cost without assigning invented DPS credit", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, "defense"));
    recorder.recordFrame(frame(20, "defense", { dangerBandThreats: 4 }));
    recorder.recordFrame(frame(27, "defense", { dangerBandThreats: 2, gateHp: 246 }));
    recorder.recordFrame(frame(32, "defense", { dangerBandThreats: 0, gateHp: 239 }));

    const summary = recorder.finish();
    expect(summary.pressureEpisodes).toEqual([{
      lane: "north",
      startedAt: 20,
      recoveredAt: 32,
      recoverySeconds: 12,
      gateHpLost: 21,
      breached: false,
    }]);
    expect(summary.laneGateHpLost.north).toBe(21);
    expect(summary.contribution["defender-a"]!.damage).toEqual({
      normal: 0,
      elite: 0,
      objective: 0,
    });
  });

  test("tracks phase timing, downs, survival floor, terminal outcome, and breach recovery", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, "arming"));
    recorder.recordFrame(frame(8, "defense", { playerHp: 120 }));
    recorder.recordFrame(frame(210, "breach", { dangerBandThreats: 6, gateHp: 0 }));
    recorder.recordFrame(frame(215, "breach", { playerHp: 0, downed: true, dangerBandThreats: 4, gateHp: 0 }));
    recorder.recordFrame(frame(220, "breach", { playerHp: 82, dangerBandThreats: 2, gateHp: 0 }));
    recorder.recordFrame(frame(232, "push", { gateHp: 0 }));
    recorder.recordFrame(frame(270, "victory", { gateHp: 0, riftHeartHp: 0 }));

    const summary = recorder.finish(270);
    expect(summary.outcome).toBe("victory");
    expect(summary.phaseDurations.arming).toBe(8);
    expect(summary.phaseDurations.defense).toBe(202);
    expect(summary.phaseDurations.breach).toBe(22);
    expect(summary.phaseDurations.push).toBe(38);
    expect(summary.playerDowns["defender-a"]).toBe(1);
    expect(summary.playerMinimumHpRatio["defender-a"]).toBe(0);
    expect(summary.pressureEpisodes).toEqual([{
      lane: "north",
      startedAt: 210,
      recoveredAt: 232,
      recoverySeconds: 22,
      gateHpLost: 0,
      breached: true,
    }]);
    expect(summary.openPressureEpisodes).toEqual([]);
  });

  test("rejects reordered observations and negative contribution values", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(5, "defense"));
    expect(() => recorder.recordFrame(frame(4, "defense"))).toThrow("chronological order");
    expect(() => recorder.recordEvent(event("damage", "normal", { magnitude: -1 }))).toThrow("cannot be negative");
    expect(() => recorder.recordEvent(event("control", "normal", { duration: -1 }))).toThrow("cannot be negative");
  });

  test("keeps a phase start at zero and rejects reordered telemetry events", () => {
    const recorder = new EncounterCompatibilityRecorder();
    recorder.recordFrame(frame(0, "defense"));
    recorder.recordFrame(frame(5, "defense"));
    recorder.recordEvent(event("damage", "normal", { at: 4 }));
    recorder.recordEvent(event("damage", "normal", { at: 4 }));
    expect(() => recorder.recordEvent(event("damage", "normal", { at: 3 }))).toThrow("chronological order");
    recorder.recordFrame(frame(12, "breach"));

    const summary = recorder.finish();
    expect(summary.phaseStartedAt.defense).toBe(0);
    expect(summary.phaseDurations.defense).toBe(12);
    expect(summary.contribution["defender-a"]!.outcomeEventsByAction["greatsword.cleave"]).toBe(2);
  });
});
