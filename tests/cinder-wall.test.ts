import { describe, expect, test } from "bun:test";
import {
  CINDER_WALL_BASE_HALF_WIDTH,
  CINDER_WALL_DURATION_SECONDS,
  CINDER_WALL_END_DISTANCE,
  CINDER_WALL_LENGTH,
  CINDER_WALL_SLOW_SECONDS,
  CINDER_WALL_START_DISTANCE,
  cinderWallContainsPoint,
  cinderWallEndpoints,
  cinderWallHalfWidth,
} from "../src/shared/cinder-wall";
import { ABILITY_IMPACT_DEFINITIONS, scaleAbilityMagnitude } from "../src/shared/ability-impact";
import type { EnemyKind, LaneId, Vec2 } from "../src/shared/protocol";
import { GameWorld } from "../src/server/game";

type TestPlayer = NonNullable<ReturnType<GameWorld["players"]["get"]>>;

interface TestEnemy {
  id: string;
  position: Vec2;
  hp: number;
  radius: number;
  speed: number;
  slowFor: number;
}

interface CinderWallInternal {
  id: string;
  ownerId: string;
  start: Vec2;
  end: Vec2;
  halfWidth: number;
  remaining: number;
  damage: number;
  slowSeconds: number;
  hitIds: Set<string>;
  riftHeartHit: boolean;
}

interface CinderWallInternals {
  cinderWalls: Map<string, CinderWallInternal>;
  enemies: Map<string, TestEnemy>;
  spawnTimer: number;
  riftHeart: { hp: number; maxHp: number; active: boolean };
  spawnEnemy(lane: LaneId, kind: EnemyKind, position: Vec2): string | null;
}

const NORTH: Vec2 = { x: 0, z: -1 };

function advance(game: GameWorld, seconds: number, step = 0.01): void {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) {
    game.update(Math.min(step, seconds - elapsed));
  }
}

function readyAshcaller(options: ConstructorParameters<typeof GameWorld>[0] = {}): {
  game: GameWorld;
  player: TestPlayer;
  internals: CinderWallInternals;
} {
  const game = new GameWorld({ timings: { defenseDuration: 200 }, enemyCap: 32, random: () => 0.5, ...options });
  expect(game.addPlayer("p1", "Cinder Tester").ok).toBe(true);
  expect(game.claimHero("p1", "ashcaller").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
  const player = game.players.get("p1")!;
  player.position = { x: 0, z: 0 };
  const internals = game as unknown as CinderWallInternals;
  internals.spawnTimer = 1_000;
  internals.enemies.clear();
  return { game, player, internals };
}

function learnCinderWall(game: GameWorld, rank = 1): void {
  if (rank > 1) game.grantExperience("p1", rank === 2 ? 50 : 135);
  for (let current = 0; current < rank; current += 1) {
    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
  }
}

function castCinderWall(game: GameWorld, direction: Vec2 = NORTH): void {
  expect(game.handleMessage("p1", {
    type: "input",
    seq: 1,
    move: { x: 0, z: 0 },
    aim: direction,
    attacking: false,
  }).ok).toBe(true);
  expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
  advance(game, 0.3);
}

function spawnStationaryEnemy(
  internals: CinderWallInternals,
  position: Vec2,
  radius = 0,
): TestEnemy {
  const id = internals.spawnEnemy("north", "imp", position);
  expect(id).not.toBeNull();
  const enemy = internals.enemies.get(id!)!;
  enemy.position = { ...position };
  enemy.radius = radius;
  enemy.speed = 0;
  enemy.hp = 1_000;
  enemy.slowFor = 0;
  return enemy;
}

function onlyWall(internals: CinderWallInternals): CinderWallInternal {
  expect(internals.cinderWalls.size).toBe(1);
  return [...internals.cinderWalls.values()][0]!;
}

describe("canonical Cinder Wall contract", () => {
  test("the shared line owns exact duration, endpoints, width growth, slow, and capsule geometry", () => {
    expect(CINDER_WALL_DURATION_SECONDS).toBe(2);
    expect(CINDER_WALL_START_DISTANCE).toBe(3.2);
    expect(CINDER_WALL_END_DISTANCE).toBe(16);
    expect(CINDER_WALL_LENGTH).toBeCloseTo(12.8);
    expect(CINDER_WALL_BASE_HALF_WIDTH).toBe(3.2);
    expect(CINDER_WALL_SLOW_SECONDS).toBe(2);
    expect([1, 2, 3].map(cinderWallHalfWidth)).toEqual([
      3.2,
      3.2 * 1.08,
      3.2 * 1.16,
    ]);

    expect(cinderWallEndpoints({ x: 5, z: 7 }, { x: 0, z: -4 })).toEqual({
      start: { x: 5, z: 7 - CINDER_WALL_START_DISTANCE },
      end: { x: 5, z: 7 - CINDER_WALL_END_DISTANCE },
    });
    expect(cinderWallEndpoints({ x: 1, z: 2 }, { x: 0, z: 0 })).toEqual({
      start: { x: 1, z: 2 - CINDER_WALL_START_DISTANCE },
      end: { x: 1, z: 2 - CINDER_WALL_END_DISTANCE },
    });

    const { start, end } = cinderWallEndpoints({ x: 0, z: 0 }, NORTH);
    expect(cinderWallContainsPoint(start, end, { x: 3.2, z: -8 }, 3.2)).toBe(true);
    expect(cinderWallContainsPoint(start, end, { x: 3.201, z: -8 }, 3.2)).toBe(false);
    expect(cinderWallContainsPoint(start, end, { x: 0, z: -19.2 }, 3.2)).toBe(true);
    expect(cinderWallContainsPoint(start, end, { x: 0, z: -19.201 }, 3.2)).toBe(false);
  });

  test("present and late enemies take one hit and one slow while outside targets and re-entry stay untouched", () => {
    const { game, internals } = readyAshcaller();
    learnCinderWall(game);
    const present = spawnStationaryEnemy(internals, { x: 0, z: -8 });
    const outside = spawnStationaryEnemy(internals, {
      x: cinderWallHalfWidth(1) + 0.01,
      z: -8,
    });

    castCinderWall(game);
    const baseDamage = ABILITY_IMPACT_DEFINITIONS.ashcaller.ability2.primary.base;
    expect(present.hp).toBeCloseTo(1_000 - baseDamage);
    expect(present.slowFor).toBeGreaterThan(1.8);
    expect(outside.hp).toBe(1_000);
    expect(outside.slowFor).toBe(0);

    const wall = onlyWall(internals);
    expect(wall.ownerId).toBe("p1");
    expect(wall.damage).toBe(baseDamage);
    expect(wall.halfWidth).toBe(cinderWallHalfWidth(1));
    expect(wall.slowSeconds).toBe(CINDER_WALL_SLOW_SECONDS);
    expect(wall.hitIds.has(present.id)).toBe(true);
    expect(wall.hitIds.has(outside.id)).toBe(false);
    expect(wall.remaining).toBeGreaterThan(1.9);

    const effects = game.getSnapshot().effects;
    const visible = effects.filter(({ kind }) => String(kind) === "cinder_wall");
    const companions = effects.filter(({ kind }) => String(kind) === "cinder_wall_companion");
    expect(visible).toHaveLength(1);
    expect(companions).toHaveLength(4);
    expect(visible[0]!.id).toBe(wall.id);
    expect(visible[0]!.position).toEqual({
      x: (wall.start.x + wall.end.x) / 2,
      z: (wall.start.z + wall.end.z) / 2,
    });
    expect(visible[0]!.radius).toBe(wall.halfWidth);
    expect(visible[0]!.rotation).toBeCloseTo(Math.atan2(-NORTH.z, NORTH.x));
    expect(visible[0]!.remaining).toBeCloseTo(wall.remaining);

    advance(game, 0.7);
    expect(present.hp).toBeCloseTo(1_000 - baseDamage);
    const slowBeforeReentry = present.slowFor;
    present.position = { x: 12, z: -8 };
    advance(game, 0.1);
    present.position = { x: 0, z: -8 };
    advance(game, 0.1);
    expect(present.hp).toBeCloseTo(1_000 - baseDamage);
    expect(present.slowFor).toBeLessThan(slowBeforeReentry);

    const late = spawnStationaryEnemy(internals, { x: 0, z: -12 });
    advance(game, 0.05);
    expect(late.hp).toBeCloseTo(1_000 - baseDamage);
    expect(late.slowFor).toBeGreaterThan(1.9);
    advance(game, 0.5);
    expect(late.hp).toBeCloseTo(1_000 - baseDamage);

    advance(game, CINDER_WALL_DURATION_SECONDS);
    expect(internals.cinderWalls.size).toBe(0);
    const afterExpiry = spawnStationaryEnemy(internals, { x: 0, z: -12 });
    advance(game, 0.05);
    expect(afterExpiry.hp).toBe(1_000);
  });

  test("rank geometry and Focus damage are sampled when the wall is cast", () => {
    const { game, player, internals } = readyAshcaller();
    game.grantExperience("p1", 135);
    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
    player.equipment[0] = "runebound_focus";

    castCinderWall(game);
    const wall = onlyWall(internals);
    const expectedDamage = scaleAbilityMagnitude(
      ABILITY_IMPACT_DEFINITIONS.ashcaller.ability2.primary.base,
      2,
      1.15,
    );
    expect(wall.damage).toBeCloseTo(expectedDamage);
    expect(wall.halfWidth).toBeCloseTo(cinderWallHalfWidth(2));
    expect(wall.start).toEqual({ x: 0, z: -CINDER_WALL_START_DISTANCE });
    expect(wall.end).toEqual({ x: 0, z: -CINDER_WALL_END_DISTANCE });

    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
    player.equipment.fill("runebound_focus");
    player.position = { x: 40, z: 40 };
    player.aim = { x: 1, z: 0 };
    const frozenStart = { ...wall.start };
    const frozenEnd = { ...wall.end };
    const insideOriginal = spawnStationaryEnemy(internals, { x: 0, z: -10 });
    const outsideSampledWidth = spawnStationaryEnemy(internals, {
      x: (cinderWallHalfWidth(2) + cinderWallHalfWidth(3)) / 2,
      z: -10,
    });
    advance(game, 0.05);

    expect(wall.start).toEqual(frozenStart);
    expect(wall.end).toEqual(frozenEnd);
    expect(wall.halfWidth).toBeCloseTo(cinderWallHalfWidth(2));
    expect(wall.damage).toBeCloseTo(expectedDamage);
    expect(insideOriginal.hp).toBeCloseTo(1_000 - expectedDamage);
    expect(outsideSampledWidth.hp).toBe(1_000);
  });

  test("one wall can damage the Rift Heart only once across its full lifetime", () => {
    const { game, player, internals } = readyAshcaller({
      accelerated: true,
      timings: { defenseDuration: 24, breachDuration: 12, pushDuration: 180 },
    });
    learnCinderWall(game);
    expect(game.debugAdvance().ok).toBe(true);
    expect(game.debugAdvance().ok).toBe(true);
    internals.spawnTimer = 1_000;
    internals.enemies.clear();
    player.position = { x: 0, z: -150 };

    const before = game.getSnapshot().riftHeart.hp;
    castCinderWall(game);
    const damage = ABILITY_IMPACT_DEFINITIONS.ashcaller.ability2.primary.base;
    expect(before - game.getSnapshot().riftHeart.hp).toBeCloseTo(damage);
    expect(onlyWall(internals).riftHeartHit).toBe(true);

    advance(game, 3.4);
    expect(before - game.getSnapshot().riftHeart.hp).toBeCloseTo(damage);
  });

  test("ending and resetting the run removes authoritative wall and presentation state", () => {
    const { game, internals } = readyAshcaller();
    learnCinderWall(game);
    castCinderWall(game);
    expect(internals.cinderWalls.size).toBe(1);
    expect(game.getSnapshot().effects.some(({ kind }) => String(kind).startsWith("cinder_wall"))).toBe(true);

    game.damageNexus(10_000);
    expect(game.phase).toBe("defeat");
    expect(internals.cinderWalls.size).toBe(0);
    expect(game.getSnapshot().effects.some(({ kind }) => String(kind).startsWith("cinder_wall"))).toBe(false);
    expect(game.resetRun("p1").ok).toBe(true);
    expect(game.phase).toBe("lobby");
    expect(internals.cinderWalls.size).toBe(0);
    expect(game.getSnapshot().effects.some(({ kind }) => String(kind).startsWith("cinder_wall"))).toBe(false);
  });
});
