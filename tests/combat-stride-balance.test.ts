import { describe, expect, test } from "bun:test";
import type { EquipmentSlots, HeroId, Vec2 } from "../src/shared/protocol";
import { GameWorld } from "../src/server/game";

const DT = 1 / 60;
const SEEDS = Array.from(
  { length: 20 },
  (_, index) => Math.imul(index + 1, 0x9e37_79b1) >>> 0,
);
const LATE_BUILD: EquipmentSlots = [
  "fleetstep_greaves",
  "fleetstep_greaves",
  "fleetstep_greaves",
  "fleetstep_greaves",
  "tempered_edge",
  "tempered_edge",
];

interface ControllerProfile {
  heroId: Extract<HeroId, "warden" | "riftstalker">;
  durationSeconds: number;
  approachBeyond: number;
  retreatBelow: number;
  attackWithin: number;
}

interface BalanceResult {
  phase: string;
  nexusHp: number;
  gateHp: number;
  kills: number;
  minimumHp: number;
  maxHp: number;
  downs: number;
}

function normalize(vector: Vec2): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.z);
  return magnitude > 0.0001
    ? { x: vector.x / magnitude, z: vector.z / magnitude }
    : { x: 0, z: -1 };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function runLateBuildDefense(seed: number, profile: ControllerProfile): BalanceResult {
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return randomState / 2 ** 32;
  };

  const game = new GameWorld({ accelerated: false, random });
  const playerId = `combat-stride-${profile.heroId}`;
  let sequence = 0;
  let minimumHp = profile.heroId === "warden" ? 190 : 125;
  let downs = 0;

  expect(game.addPlayer(playerId, `Combat Stride ${profile.heroId}`).ok).toBe(true);
  expect(game.claimHero(playerId, profile.heroId).ok).toBe(true);
  expect(game.setReady(playerId, true).ok).toBe(true);
  expect(game.startGame(playerId).ok).toBe(true);
  game.players.get(playerId)!.equipment = [...LATE_BUILD];

  for (
    let tick = 0;
    tick < profile.durationSeconds / DT && game.phase === "defense";
    tick += 1
  ) {
    const snapshot = game.getSnapshot();
    const player = snapshot.players[0]!;

    // A solo run opens North, so the largest z is the threat closest to the city.
    const target = [...snapshot.enemies].sort(
      (left, right) => right.position.z - left.position.z,
    )[0];
    let aim: Vec2 = { x: 0, z: -1 };
    let move: Vec2 = aim;
    let targetDistance = Number.POSITIVE_INFINITY;

    if (target) {
      aim = normalize({
        x: target.position.x - player.position.x,
        z: target.position.z - player.position.z,
      });
      targetDistance = distance(target.position, player.position);
      move = targetDistance > profile.approachBeyond
        ? aim
        : targetDistance < profile.retreatBelow
          ? { x: -aim.x, z: -aim.z }
          : { x: -aim.z, z: aim.x };
    }

    game.handleMessage(playerId, {
      type: "input",
      seq: ++sequence,
      move,
      aim,
      attacking: targetDistance <= profile.attackWithin,
    });
    game.update(DT);
    for (const event of game.takePendingEvents()) {
      if (event.kind === "player_downed") downs += 1;
    }
    minimumHp = Math.min(minimumHp, game.getSnapshot().players[0]!.hp);
  }

  const final = game.getSnapshot();
  const player = final.players[0]!;

  return {
    phase: final.phase,
    nexusHp: final.nexus.hp,
    gateHp: final.gates[0]!.hp,
    kills: player.kills,
    minimumHp,
    maxHp: player.stats.maxHp,
    downs,
  };
}

describe("normal-timing Combat Stride balance", () => {
  test("an Attuned Warden still has to stand in danger to hold a pristine defense", () => {
    const results = SEEDS.map((seed) => runLateBuildDefense(seed, {
      heroId: "warden",
      durationSeconds: 90,
      approachBeyond: 4,
      retreatBelow: 2.8,
      attackWithin: 7,
    }));

    expect(results.every((result) => result.phase === "defense")).toBe(true);
    expect(results.every((result) => result.nexusHp === 800)).toBe(true);
    expect(results.every((result) => result.gateHp === 260)).toBe(true);
    expect(results.every((result) => result.downs === 0)).toBe(true);
    expect(mean(results.map((result) => result.kills))).toBeGreaterThanOrEqual(140);
    expect(mean(results.map((result) => result.kills))).toBeLessThanOrEqual(155);
    expect(mean(results.map((result) => result.minimumHp))).toBeGreaterThanOrEqual(160);
    expect(mean(results.map((result) => result.minimumHp))).toBeLessThanOrEqual(185);
    expect(results.filter((result) => result.minimumHp < result.maxHp).length).toBeGreaterThanOrEqual(8);
  });

  test("an Attuned Riftstalker can kite without making lane pressure irrelevant", () => {
    const results = SEEDS.map((seed) => runLateBuildDefense(seed, {
      heroId: "riftstalker",
      durationSeconds: 60,
      approachBeyond: 8.2,
      retreatBelow: 7,
      attackWithin: 22,
    }));

    expect(results.every((result) => result.phase === "defense")).toBe(true);
    expect(results.every((result) => result.nexusHp === 800)).toBe(true);
    expect(mean(results.map((result) => result.gateHp))).toBeGreaterThanOrEqual(250);
    expect(results.reduce((sum, result) => sum + result.downs, 0)).toBeLessThanOrEqual(2);
    expect(mean(results.map((result) => result.kills))).toBeGreaterThanOrEqual(80);
    expect(mean(results.map((result) => result.kills))).toBeLessThanOrEqual(92);
    expect(mean(results.map((result) => result.minimumHp))).toBeGreaterThanOrEqual(85);
    expect(mean(results.map((result) => result.minimumHp))).toBeLessThanOrEqual(115);
    expect(results.filter((result) => result.minimumHp < result.maxHp).length).toBeGreaterThanOrEqual(8);
  });
});
