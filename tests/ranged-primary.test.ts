import { describe, expect, test } from "bun:test";
import { ABILITY_IMPACT_DEFINITIONS } from "../src/shared/ability-impact";
import { HERO_DEFINITIONS } from "../src/shared/game-data";
import {
  ASHCALLER_BASIC_BURST_DAMAGE_RATIO,
  ASHCALLER_BASIC_BURST_RADIUS,
  ASHCALLER_BASIC_RECOVERY_INTERVAL_RATIO,
  ASHCALLER_BASIC_RECOVERY_MIN_SECONDS,
  RANGED_BASIC_ACTIVE_SECONDS,
  RANGED_BASIC_PROJECTILE_RADIUS,
  RIFTSTALKER_BASIC_PIERCE,
  RIFTSTALKER_BASIC_RECOVERY_SECONDS,
} from "../src/shared/ranged-primary";
import type {
  AbilitySlot,
  EnemyKind,
  HeroId,
  LaneId,
  ProjectileKind,
  Vec2,
} from "../src/shared/protocol";
import { GameWorld } from "../src/server/game";

type TestPlayer = NonNullable<ReturnType<GameWorld["players"]["get"]>>;

interface TestEnemy {
  id: string;
  position: Vec2;
  hp: number;
  radius: number;
}

interface TestProjectile {
  id: string;
  kind: ProjectileKind;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  remaining: number;
  damage: number;
  pierce: number;
  hitIds: Set<string>;
}

interface GameInternals {
  enemies: Map<string, TestEnemy>;
  projectiles: Map<string, TestProjectile>;
  basicAttackImpact(player: TestPlayer, direction: Vec2): void;
  updateProjectiles(dt: number): void;
  spawnEnemy(lane: LaneId, kind: EnemyKind, position: Vec2): string | null;
  castRiftstalker(
    player: TestPlayer,
    slot: AbilitySlot,
    aim: Vec2,
    target: Vec2,
    rank: number,
  ): void;
  castGravebinder(
    player: TestPlayer,
    slot: AbilitySlot,
    aim: Vec2,
    target: Vec2,
    rank: number,
  ): void;
}

const NORTH: Vec2 = { x: 0, z: -1 };
const EAST: Vec2 = { x: 1, z: 0 };

function readyHero(heroId: HeroId, options: ConstructorParameters<typeof GameWorld>[0] = {}): {
  game: GameWorld;
  player: TestPlayer;
  internals: GameInternals;
} {
  const game = new GameWorld({ enemyCap: 16, ...options });
  expect(game.addPlayer("p1", `${heroId} geometry`).ok).toBe(true);
  expect(game.claimHero("p1", heroId).ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
  const player = game.players.get("p1")!;
  player.position = { x: 0, z: 0 };
  const internals = game as unknown as GameInternals;
  internals.enemies.clear();
  internals.projectiles.clear();
  return { game, player, internals };
}

function spawnGeometryEnemy(
  internals: GameInternals,
  position: Vec2,
  radius = 0,
  hp = 1_000,
): TestEnemy {
  const id = internals.spawnEnemy("north", "imp", position);
  expect(id).not.toBeNull();
  const enemy = internals.enemies.get(id!)!;
  enemy.position = { ...position };
  enemy.radius = radius;
  enemy.hp = hp;
  return enemy;
}

function fireBasic(
  internals: GameInternals,
  player: TestPlayer,
  direction: Vec2 = NORTH,
): TestProjectile {
  const existing = new Set(internals.projectiles.keys());
  internals.basicAttackImpact(player, direction);
  const projectile = [...internals.projectiles.values()].find(({ id }) => !existing.has(id));
  expect(projectile).toBeDefined();
  return projectile!;
}

function advanceUntilActive(game: GameWorld): void {
  for (let step = 0; step < 40; step += 1) {
    game.update(0.01);
    if (game.getSnapshot().players[0]!.action?.phase === "active") return;
  }
  throw new Error("Basic attack never reached its active phase.");
}

describe("authoritative ranged primary geometry", () => {
  test("ranged release and recovery create a real idle movement gap without changing attack cadence", () => {
    for (const heroId of ["riftstalker", "ashcaller"] as const) {
      const { game } = readyHero(heroId);
      const interval = HERO_DEFINITIONS[heroId].basicCooldown;
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 1,
        move: EAST,
        aim: NORTH,
        attacking: true,
      }).ok).toBe(true);
      game.update(0.001);
      expect(game.getSnapshot().players[0]!.cooldowns.basic).toBeCloseTo(interval, 2);

      advanceUntilActive(game);
      expect(game.getSnapshot().players[0]!.action).toMatchObject({
        kind: "basic",
        phase: "active",
        duration: RANGED_BASIC_ACTIVE_SECONDS,
      });

      for (let step = 0; step < 20; step += 1) {
        game.update(0.01);
        if (game.getSnapshot().players[0]!.action?.phase === "recovery") break;
      }
      expect(game.getSnapshot().players[0]!.action).toMatchObject({
        kind: "basic",
        phase: "recovery",
        duration: heroId === "riftstalker"
          ? RIFTSTALKER_BASIC_RECOVERY_SECONDS
          : Math.max(
              ASHCALLER_BASIC_RECOVERY_MIN_SECONDS,
              interval * ASHCALLER_BASIC_RECOVERY_INTERVAL_RATIO,
            ),
      });

      for (let step = 0; step < 30; step += 1) {
        game.update(0.005);
        if (!game.getSnapshot().players[0]!.action) break;
      }
      const idle = game.getSnapshot().players[0]!;
      expect(idle.action).toBeNull();
      expect(idle.cooldowns.basic).toBeGreaterThan(0);
      expect(Math.hypot(idle.velocity.x, idle.velocity.z)).toBeCloseTo(idle.stats.moveSpeed);
    }
  });

  test("ranged releases follow latest accepted aim while melee keeps its committed start aim", () => {
    for (const heroId of ["riftstalker", "ashcaller"] as const) {
      const { game, player, internals } = readyHero(heroId);
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 1,
        move: { x: 0, z: 0 },
        aim: NORTH,
        attacking: true,
      }).ok).toBe(true);
      game.update(0.001);
      expect(game.getSnapshot().players[0]!.action).toMatchObject({
        kind: "basic",
        phase: "windup",
        direction: NORTH,
      });

      expect(game.handleMessage("p1", {
        type: "input",
        seq: 2,
        move: { x: 0, z: 0 },
        aim: EAST,
        attacking: false,
      }).ok).toBe(true);
      advanceUntilActive(game);

      const projectile = [...internals.projectiles.values()][0]!;
      expect(projectile.kind).toBe(heroId === "riftstalker" ? "repeater" : "ember");
      expect(projectile.velocity.x).toBeGreaterThan(0);
      expect(projectile.velocity.z).toBeCloseTo(0);
      expect(game.getSnapshot().players[0]!.action?.direction).toEqual(EAST);
      expect(player.aim).toEqual(EAST);
    }

    for (const heroId of ["warden", "gravebinder"] as const) {
      const { game, player } = readyHero(heroId);
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 1,
        move: { x: 0, z: 0 },
        aim: NORTH,
        attacking: true,
      }).ok).toBe(true);
      game.update(0.001);
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 2,
        move: { x: 0, z: 0 },
        aim: EAST,
        attacking: false,
      }).ok).toBe(true);
      advanceUntilActive(game);

      const slash = game.getSnapshot().effects.find((effect) => effect.kind === "slash");
      expect(slash).toBeDefined();
      expect(slash!.position.x).toBeCloseTo(0);
      expect(slash!.position.z).toBeCloseTo(-3.2);
      expect(game.getSnapshot().players[0]!.action?.direction).toEqual(NORTH);
      expect(player.aim).toEqual(EAST);
    }
  });

  for (const heroId of ["riftstalker", "ashcaller"] as const) {
    test(`${heroId} uses its exact canonical endpoint, 0.75 radius, and expires beyond that envelope`, () => {
      const definition = HERO_DEFINITIONS[heroId];
      const speed = heroId === "riftstalker" ? 29 : 23;
      const { player, internals } = readyHero(heroId);
      const endpointTarget = spawnGeometryEnemy(internals, { x: 0, z: -definition.basicRange });
      const projectile = fireBasic(internals, player);

      expect(RANGED_BASIC_PROJECTILE_RADIUS).toBe(0.75);
      expect(projectile.radius).toBe(0.75);
      expect(projectile.position).toEqual({ x: 0, z: -1.7 });
      expect(projectile.remaining).toBeCloseTo((definition.basicRange - 1.7) / speed);
      expect(projectile.position.z + projectile.velocity.z * projectile.remaining).toBeCloseTo(
        -definition.basicRange,
      );

      internals.updateProjectiles(2);
      expect(endpointTarget.hp).toBeCloseTo(1_000 - definition.basicDamage);
      expect(internals.projectiles.size).toBe(0);

      const miss = readyHero(heroId);
      const outsideTarget = spawnGeometryEnemy(miss.internals, {
        x: 0,
        z: -(definition.basicRange + RANGED_BASIC_PROJECTILE_RADIUS + 0.01),
      });
      fireBasic(miss.internals, miss.player);
      miss.internals.updateProjectiles(2);
      expect(outsideTarget.hp).toBe(1_000);
      expect(miss.internals.projectiles.size).toBe(0);
    });

    test(`${heroId} sweeps the complete 0.1-second path instead of point-sampling its endpoint`, () => {
      const speed = heroId === "riftstalker" ? 29 : 23;
      const { player, internals } = readyHero(heroId);
      const startZ = -1.7;
      const endZ = startZ - speed * 0.1;
      const target = spawnGeometryEnemy(internals, { x: 0, z: (startZ + endZ) / 2 });
      const projectile = fireBasic(internals, player);

      expect(Math.abs(target.position.z - startZ)).toBeGreaterThan(projectile.radius);
      expect(Math.abs(target.position.z - endZ)).toBeGreaterThan(projectile.radius);
      internals.updateProjectiles(0.1);
      expect(target.hp).toBeCloseTo(1_000 - HERO_DEFINITIONS[heroId].basicDamage);
    });
  }

  test("Riftstalker penetrates the nearest two targets in path order regardless of insertion order", () => {
    const { player, internals } = readyHero("riftstalker");
    const far = spawnGeometryEnemy(internals, { x: 0, z: -4.3 });
    const middle = spawnGeometryEnemy(internals, { x: 0, z: -3 });
    const near = spawnGeometryEnemy(internals, { x: 0, z: -2 });
    const projectile = fireBasic(internals, player);

    expect(RIFTSTALKER_BASIC_PIERCE).toBe(2);
    expect(projectile.pierce).toBe(2);
    internals.updateProjectiles(0.1);

    expect(near.hp).toBeCloseTo(1_000 - HERO_DEFINITIONS.riftstalker.basicDamage);
    expect(middle.hp).toBeCloseTo(1_000 - HERO_DEFINITIONS.riftstalker.basicDamage);
    expect(far.hp).toBe(1_000);
    expect(internals.projectiles.has(projectile.id)).toBe(false);
  });

  test("Riftstalker orders penetration by first physical contact across mixed enemy sizes", () => {
    const { player, internals } = readyHero("riftstalker");
    const laterImp = spawnGeometryEnemy(internals, { x: 0, z: -3.7 });
    const firstImp = spawnGeometryEnemy(internals, { x: 0, z: -3.5 });
    const physicallyFirstBrute = spawnGeometryEnemy(internals, { x: 0, z: -4.7 }, 2.1);
    const projectile = fireBasic(internals, player);

    internals.updateProjectiles(0.1);

    const damage = HERO_DEFINITIONS.riftstalker.basicDamage;
    expect(physicallyFirstBrute.hp).toBeCloseTo(1_000 - damage);
    expect(firstImp.hp).toBeCloseTo(1_000 - damage);
    expect(laterImp.hp).toBe(1_000);
    expect(internals.projectiles.has(projectile.id)).toBe(false);
  });

  test("Ashcaller deals one full direct hit and one half-damage burst only inside three units", () => {
    const { player, internals } = readyHero("ashcaller");
    const direct = spawnGeometryEnemy(internals, { x: 0, z: -2.2 });
    const nearby = spawnGeometryEnemy(internals, { x: 3, z: -2.2 });
    const outside = spawnGeometryEnemy(internals, { x: 3.01, z: -2.2 });
    const projectile = fireBasic(internals, player);

    expect(ASHCALLER_BASIC_BURST_RADIUS).toBe(3);
    expect(ASHCALLER_BASIC_BURST_DAMAGE_RATIO).toBe(0.5);
    internals.updateProjectiles(0.1);

    const damage = HERO_DEFINITIONS.ashcaller.basicDamage;
    expect(direct.hp).toBeCloseTo(1_000 - damage);
    expect(nearby.hp).toBeCloseTo(1_000 - damage * 0.5);
    expect(outside.hp).toBe(1_000);
    expect(internals.projectiles.has(projectile.id)).toBe(false);
  });

  test("single-target and Rift Heart damage remain one canonical basic hit", () => {
    for (const heroId of ["riftstalker", "ashcaller"] as const) {
      const { player, internals } = readyHero(heroId);
      const target = spawnGeometryEnemy(internals, { x: 0, z: -3 });
      fireBasic(internals, player);
      internals.updateProjectiles(0.1);
      expect(target.hp).toBeCloseTo(1_000 - HERO_DEFINITIONS[heroId].basicDamage);

      const push = readyHero(heroId, {
        accelerated: true,
        timings: { pushDuration: 180 },
        enemyCap: 1,
      });
      expect(push.game.debugAdvance().ok).toBe(true);
      expect(push.game.debugAdvance().ok).toBe(true);
      push.internals.enemies.clear();
      push.player.position = { x: 0, z: -155 };
      const before = push.game.getSnapshot().riftHeart.hp;
      fireBasic(push.internals, push.player);
      push.internals.updateProjectiles(0.1);
      expect(before - push.game.getSnapshot().riftHeart.hp).toBeCloseTo(
        HERO_DEFINITIONS[heroId].basicDamage,
      );
    }
  });

  test("the Rift Heart participates in ranged first-contact order and terminates the shot", () => {
    for (const heroId of ["riftstalker", "ashcaller"] as const) {
      const blocked = readyHero(heroId, {
        accelerated: true,
        timings: { pushDuration: 180 },
        enemyCap: 4,
      });
      expect(blocked.game.debugAdvance().ok).toBe(true);
      expect(blocked.game.debugAdvance().ok).toBe(true);
      blocked.internals.enemies.clear();
      blocked.player.position = { x: 0, z: -155 };
      const behindHeartContact = spawnGeometryEnemy(
        blocked.internals,
        { x: 0, z: -158 },
      );
      const blockedHeartBefore = blocked.game.getSnapshot().riftHeart.hp;
      fireBasic(blocked.internals, blocked.player);
      blocked.internals.updateProjectiles(0.1);
      expect(blockedHeartBefore - blocked.game.getSnapshot().riftHeart.hp).toBeCloseTo(
        HERO_DEFINITIONS[heroId].basicDamage,
      );
      expect(behindHeartContact.hp).toBe(1_000);

      const guarded = readyHero(heroId, {
        accelerated: true,
        timings: { pushDuration: 180 },
        enemyCap: 4,
      });
      expect(guarded.game.debugAdvance().ok).toBe(true);
      expect(guarded.game.debugAdvance().ok).toBe(true);
      guarded.internals.enemies.clear();
      guarded.player.position = { x: 0, z: -148 };
      const guard = spawnGeometryEnemy(guarded.internals, { x: 0, z: -151 });
      const guardedHeartBefore = guarded.game.getSnapshot().riftHeart.hp;
      fireBasic(guarded.internals, guarded.player);
      guarded.internals.updateProjectiles(2);
      expect(guard.hp).toBeCloseTo(1_000 - HERO_DEFINITIONS[heroId].basicDamage);
      expect(guardedHeartBefore - guarded.game.getSnapshot().riftHeart.hp).toBeCloseTo(
        heroId === "riftstalker" ? HERO_DEFINITIONS.riftstalker.basicDamage : 0,
      );
    }
  });

  test("Riftstalker and Gravebinder ability projectiles retain their established kinds and geometry", () => {
    for (const [slot, kind, count, speed, pierce] of [
      ["ability1", "arrow", 1, 31, 2],
      ["ability2", "splitbolt", 3, 29, 4],
      ["ultimate", "arrow", 11, 34, 3],
    ] as const) {
      const { player, internals } = readyHero("riftstalker");
      internals.castRiftstalker(player, slot, NORTH, { x: 0, z: -14 }, 1);
      const projectiles = [...internals.projectiles.values()];
      expect(projectiles).toHaveLength(count);
      expect(new Set(projectiles.map((projectile) => projectile.kind))).toEqual(new Set([kind]));
      for (const projectile of projectiles) {
        expect(projectile.radius).toBe(0.45);
        expect(projectile.remaining).toBe(2.2);
        expect(Math.hypot(projectile.velocity.x, projectile.velocity.z)).toBeCloseTo(speed);
        expect(projectile.pierce).toBe(pierce);
        expect(projectile.damage).toBeCloseTo(
          ABILITY_IMPACT_DEFINITIONS.riftstalker[slot].primary!.base,
        );
      }
    }

    const gravebinder = readyHero("gravebinder");
    gravebinder.internals.castGravebinder(
      gravebinder.player,
      "ultimate",
      NORTH,
      { x: 0, z: -14 },
      1,
    );
    const deathTide = [...gravebinder.internals.projectiles.values()];
    expect(deathTide).toHaveLength(1);
    expect(deathTide[0]).toMatchObject({
      kind: "death_tide",
      radius: 3.2,
      remaining: 4,
      pierce: 99,
      damage: ABILITY_IMPACT_DEFINITIONS.gravebinder.ultimate.primary!.base,
    });
    expect(Math.hypot(deathTide[0]!.velocity.x, deathTide[0]!.velocity.z)).toBeCloseTo(19);
  });

  test("ability arrows retain established endpoint sampling rather than ranged-basic sweep", () => {
    const { player, internals } = readyHero("riftstalker");
    const midpoint = spawnGeometryEnemy(internals, { x: 0, z: -3.25 });
    internals.castRiftstalker(player, "ability1", NORTH, { x: 0, z: -14 }, 1);
    const arrow = [...internals.projectiles.values()][0]!;

    expect(arrow.kind).toBe("arrow");
    expect(Math.abs(midpoint.position.z - arrow.position.z)).toBeGreaterThan(
      arrow.radius + midpoint.radius,
    );
    internals.updateProjectiles(0.1);
    expect(Math.abs(midpoint.position.z - arrow.position.z)).toBeGreaterThan(
      arrow.radius + midpoint.radius,
    );
    expect(midpoint.hp).toBe(1_000);
    expect(internals.projectiles.has(arrow.id)).toBe(true);
  });
});
