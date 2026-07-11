import { describe, expect, test } from "bun:test";
import { ABILITY_IMPACT_DEFINITIONS } from "../src/shared/ability-impact";
import { WORLD_LAYOUT } from "../src/shared/game-data";
import {
  SPLITBOLT_FORK_ANGLE_RADIANS,
  SPLITBOLT_FORK_COUNT,
  SPLITBOLT_FORK_PIERCE,
  SPLITBOLT_FORK_RADIUS,
  SPLITBOLT_LIFETIME_SECONDS,
  SPLITBOLT_SEED_PIERCE,
  SPLITBOLT_SEED_RADIUS,
  SPLITBOLT_SPEED,
} from "../src/shared/splitbolt";
import type {
  AbilitySlot,
  EnemyKind,
  LaneId,
  ProjectileSnapshot,
  SplitboltStage,
  Vec2,
} from "../src/shared/protocol";
import { GameWorld, type GameWorldOptions } from "../src/server/game";

type TestPlayer = NonNullable<ReturnType<GameWorld["players"]["get"]>>;

interface TestEnemy {
  id: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
}

interface TestProjectile extends ProjectileSnapshot {
  damage: number;
  pierce: number;
  hitIds: Set<string>;
  splitTriggered?: boolean;
  reservedForkIds?: [string, string];
}

interface SplitboltInternals {
  enemies: Map<string, TestEnemy>;
  projectiles: Map<string, TestProjectile>;
  pickups: Map<string, unknown>;
  spawnTimer: number;
  riftHeart: { hp: number; maxHp: number; active: boolean };
  spawnEnemy(lane: LaneId, kind: EnemyKind, position: Vec2): string | null;
  castRiftstalker(
    player: TestPlayer,
    slot: AbilitySlot,
    aim: Vec2,
    target: Vec2,
    rank: number,
  ): void;
  updateProjectiles(dt: number): void;
}

const NORTH: Vec2 = { x: 0, z: -1 };
const EAST: Vec2 = { x: 1, z: 0 };

function readyRiftstalker(options: GameWorldOptions = {}): {
  game: GameWorld;
  player: TestPlayer;
  internals: SplitboltInternals;
} {
  const game = new GameWorld({ enemyCap: 96, ...options });
  expect(game.addPlayer("p1", "Splitbolt authority").ok).toBe(true);
  expect(game.claimHero("p1", "riftstalker").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
  const player = game.players.get("p1")!;
  player.position = { x: 0, z: 0 };
  const internals = game as unknown as SplitboltInternals;
  internals.enemies.clear();
  internals.projectiles.clear();
  return { game, player, internals };
}

function spawnEnemy(
  internals: SplitboltInternals,
  position: Vec2,
  hp: number,
  radius = 0,
): TestEnemy {
  const id = internals.spawnEnemy("north", "imp", position);
  expect(id).not.toBeNull();
  const enemy = internals.enemies.get(id!)!;
  enemy.position = { ...position };
  enemy.hp = hp;
  enemy.maxHp = Math.max(1, hp);
  enemy.radius = radius;
  return enemy;
}

function castSeed(
  internals: SplitboltInternals,
  player: TestPlayer,
  rank = 1,
): TestProjectile {
  const before = new Set(internals.projectiles.keys());
  internals.castRiftstalker(player, "ability2", NORTH, { x: 0, z: -14 }, rank);
  const created = [...internals.projectiles.values()].filter(({ id }) => !before.has(id));
  expect(created).toHaveLength(1);
  expect(created[0]!.splitStage).toBe("seed");
  return created[0]!;
}

function idSuffix(id: string): number {
  return Number(id.slice(id.lastIndexOf("-") + 1));
}

function expectPublicProjectile(snapshot: ProjectileSnapshot, stage: SplitboltStage): void {
  expect(snapshot).toMatchObject({ kind: "splitbolt", splitStage: stage });
  expect(Object.keys(snapshot).sort()).toEqual([
    "id",
    "kind",
    "ownerId",
    "position",
    "radius",
    "remaining",
    "splitStage",
    "team",
    "velocity",
  ].sort());
  for (const privateKey of [
    "damage",
    "pierce",
    "hitIds",
    "splitTriggered",
    "reservedForkIds",
  ]) {
    expect(snapshot).not.toHaveProperty(privateKey);
  }
}

function createForkedVolley(): {
  game: GameWorld;
  player: TestPlayer;
  internals: SplitboltInternals;
  seed: TestProjectile;
  forks: [TestProjectile, TestProjectile];
} {
  const { game, player, internals } = readyRiftstalker();
  const trigger = spawnEnemy(internals, { x: 0, z: -3.2 }, 1);
  const seed = castSeed(internals, player);
  internals.updateProjectiles(0.1);
  expect(internals.enemies.has(trigger.id)).toBe(false);
  const forks = [...internals.projectiles.values()]
    .filter((projectile) => projectile.splitStage === "fork") as TestProjectile[];
  expect(forks).toHaveLength(SPLITBOLT_FORK_COUNT);
  return { game, player, internals, seed, forks: [forks[0]!, forks[1]!] };
}

function enterPush(game: GameWorld, internals: SplitboltInternals): void {
  expect(game.debugAdvance().ok).toBe(true);
  expect(game.debugAdvance().ok).toBe(true);
  expect(game.phase).toBe("push");
  internals.enemies.clear();
  internals.projectiles.clear();
}

describe("authoritative kill-triggered Splitbolt", () => {
  test("casts one centered seed, reserves the old three-ID cadence, and strips private authority from snapshots", () => {
    const { game, player, internals } = readyRiftstalker();
    const seed = castSeed(internals, player);

    expect(ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base).toBe(47);
    expect(SPLITBOLT_SEED_RADIUS).toBe(1.4);
    expect(SPLITBOLT_SEED_PIERCE).toBe(4);

    expect(seed).toMatchObject({
      ownerId: "p1",
      team: "heroes",
      kind: "splitbolt",
      splitStage: "seed",
      position: { x: 0, z: -1.7 },
      velocity: { x: 0, z: -SPLITBOLT_SPEED },
      radius: SPLITBOLT_SEED_RADIUS,
      remaining: SPLITBOLT_LIFETIME_SECONDS,
      damage: ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base,
      pierce: SPLITBOLT_SEED_PIERCE,
      splitTriggered: false,
    });
    expect([...seed.hitIds]).toEqual([]);
    expect(seed.reservedForkIds).toHaveLength(SPLITBOLT_FORK_COUNT);
    expect(new Set([seed.id, ...seed.reservedForkIds!]).size).toBe(3);
    expect(seed.reservedForkIds!.map(idSuffix)).toEqual([
      idSuffix(seed.id) + 1,
      idSuffix(seed.id) + 2,
    ]);

    const publicSeed = game.getSnapshot().projectiles[0]!;
    expectPublicProjectile(publicSeed, "seed");
  });

  test("resolves the seed toward the latest accepted aim when the cast leaves windup", () => {
    const { game, player, internals } = readyRiftstalker();
    internals.spawnTimer = 1_000;
    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
    expect(game.handleMessage("p1", {
      type: "input",
      seq: 1,
      move: { x: 0, z: 0 },
      aim: NORTH,
      attacking: false,
    }).ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    expect(player.action).toMatchObject({
      kind: "ability2",
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
    for (let step = 0; step < 3; step += 1) game.update(0.1);

    const seed = [...internals.projectiles.values()][0]!;
    expect(seed).toMatchObject({ kind: "splitbolt", splitStage: "seed" });
    expect(seed.velocity.x).toBeCloseTo(SPLITBOLT_SPEED);
    expect(seed.velocity.z).toBeCloseTo(0);
    expect(player.action).toMatchObject({
      kind: "ability2",
      phase: "active",
      direction: EAST,
    });
  });

  test("sweeps the traveled segment but does not fork without an actual kill", () => {
    let randomDraws = 0;
    const { player, internals } = readyRiftstalker({
      random: () => {
        randomDraws += 1;
        return 0.25;
      },
    });
    const target = spawnEnemy(internals, { x: 0, z: -3.15 }, 1_000);
    const seed = castSeed(internals, player);
    const startZ = seed.position.z;
    const endZ = startZ + seed.velocity.z * 0.1;

    expect(Math.abs(target.position.z - startZ)).toBeGreaterThan(seed.radius + target.radius);
    expect(Math.abs(target.position.z - endZ)).toBeGreaterThan(seed.radius + target.radius);
    expect(randomDraws).toBe(0);
    internals.updateProjectiles(0.1);

    expect(target.hp).toBeCloseTo(1_000 - seed.damage);
    expect(internals.projectiles.size).toBe(1);
    expect(seed.splitTriggered).toBe(false);
    expect(seed.hitIds.has(target.id)).toBe(true);
    expect(seed.remaining).toBeCloseTo(SPLITBOLT_LIFETIME_SECONDS - 0.1);
    expect(randomDraws).toBe(1);
  });

  test("clamps the terminal sweep to remaining lifetime instead of granting a final full tick", () => {
    const { player, internals } = readyRiftstalker();
    const seed = castSeed(internals, player);
    seed.remaining = 0.05;
    const terminalZ = seed.position.z + seed.velocity.z * seed.remaining;
    const endpoint = spawnEnemy(internals, { x: 0, z: terminalZ }, 1_000);
    const beyond = spawnEnemy(internals, {
      x: 0,
      z: terminalZ - SPLITBOLT_SEED_RADIUS - 0.01,
    }, 1_000);

    internals.updateProjectiles(0.1);

    expect(seed.position.z).toBeCloseTo(terminalZ);
    expect(seed.remaining).toBe(0);
    expect(endpoint.hp).toBeCloseTo(1_000 - seed.damage);
    expect(beyond.hp).toBe(1_000);
    expect(internals.projectiles.size).toBe(0);
  });

  test("an HP-one kill on the terminal legal partial sweep earns two fresh forks", () => {
    const { game, player, internals } = readyRiftstalker();
    const seed = castSeed(internals, player);
    const reservedIds = [...seed.reservedForkIds!] as [string, string];
    seed.remaining = 0.05;
    const terminalPosition = {
      x: seed.position.x + seed.velocity.x * seed.remaining,
      z: seed.position.z + seed.velocity.z * seed.remaining,
    };
    const terminalKill = spawnEnemy(internals, terminalPosition, 1);

    internals.updateProjectiles(0.1);

    expect(internals.enemies.has(terminalKill.id)).toBe(false);
    expect(player.kills).toBe(1);
    expect(seed.remaining).toBe(0);
    expect(seed.splitTriggered).toBe(true);
    expect(internals.projectiles.has(seed.id)).toBe(false);

    const forks = [...internals.projectiles.values()];
    expect(forks.map(({ id }) => id)).toEqual(reservedIds);
    expect(forks).toHaveLength(SPLITBOLT_FORK_COUNT);
    for (const fork of forks) {
      expect(fork).toMatchObject({
        kind: "splitbolt",
        splitStage: "fork",
        position: terminalPosition,
        radius: SPLITBOLT_FORK_RADIUS,
        remaining: SPLITBOLT_LIFETIME_SECONDS,
        damage: seed.damage,
        pierce: SPLITBOLT_FORK_PIERCE,
      });
      expect([...fork.hitIds]).toEqual([terminalKill.id]);
    }
    expect(game.getSnapshot().projectiles.map(({ id, splitStage, remaining }) => ({
      id,
      splitStage,
      remaining,
    }))).toEqual(reservedIds.map((id) => ({
      id,
      splitStage: "fork",
      remaining: SPLITBOLT_LIFETIME_SECONDS,
    })));
  });

  test("uses the exact 1.4 seed and 1.2 fork lateral collision envelopes", () => {
    const seedCase = readyRiftstalker();
    const seed = castSeed(seedCase.internals, seedCase.player);
    const seedMidpointZ = seed.position.z + seed.velocity.z * 0.05;
    const seedInside = spawnEnemy(seedCase.internals, {
      x: SPLITBOLT_SEED_RADIUS - 0.001,
      z: seedMidpointZ,
    }, 1_000);
    const seedOutside = spawnEnemy(seedCase.internals, {
      x: SPLITBOLT_SEED_RADIUS + 0.001,
      z: seedMidpointZ,
    }, 1_000);
    seedCase.internals.updateProjectiles(0.1);
    expect(seedInside.hp).toBeCloseTo(1_000 - seed.damage);
    expect(seedOutside.hp).toBe(1_000);

    const forkCase = createForkedVolley();
    forkCase.internals.enemies.clear();
    const fork = forkCase.forks[0];
    forkCase.internals.projectiles.clear();
    forkCase.internals.projectiles.set(fork.id, fork);
    fork.position = { x: 0, z: 0 };
    fork.velocity = { x: 0, z: -SPLITBOLT_SPEED };
    const forkInside = spawnEnemy(forkCase.internals, {
      x: SPLITBOLT_FORK_RADIUS - 0.001,
      z: -SPLITBOLT_SPEED * 0.05,
    }, 1_000);
    const forkOutside = spawnEnemy(forkCase.internals, {
      x: SPLITBOLT_FORK_RADIUS + 0.001,
      z: -SPLITBOLT_SPEED * 0.05,
    }, 1_000);
    forkCase.internals.updateProjectiles(0.1);
    expect(forkInside.hp).toBeCloseTo(1_000 - fork.damage);
    expect(forkOutside.hp).toBe(1_000);
  });

  test("the first seed kill creates two snapshotted forks at the kill, then leaves later root contacts branch-eligible", () => {
    const { game, player, internals } = readyRiftstalker();
    const seed = castSeed(internals, player);
    const castDamage = ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base;
    expect(seed.damage).toBeCloseTo(castDamage);
    const reservedIds = [...seed.reservedForkIds!] as [string, string];

    const beforeSplit = spawnEnemy(internals, { x: 0, z: -2.2 }, 1_000);
    const killed = spawnEnemy(internals, { x: 0, z: -3.3 }, 1);
    const afterSplit = spawnEnemy(internals, { x: 0, z: -4.45 }, 1_000);

    // Neither later owner movement nor aim can rewrite the projectile that was
    // created at release time.
    player.position = { x: 40, z: 40 };
    player.aim = { x: 1, z: 0 };
    internals.updateProjectiles(0.1);

    expect(seed.splitTriggered).toBe(true);
    expect(seed.hitIds.has(beforeSplit.id)).toBe(true);
    expect(seed.hitIds.has(killed.id)).toBe(true);
    expect(seed.hitIds.has(afterSplit.id)).toBe(true);
    expect(beforeSplit.hp).toBeCloseTo(1_000 - castDamage);
    expect(afterSplit.hp).toBeCloseTo(1_000 - castDamage);

    const forks = [...internals.projectiles.values()]
      .filter((projectile) => projectile.splitStage === "fork");
    expect(forks).toHaveLength(SPLITBOLT_FORK_COUNT);
    expect(forks.map((fork) => fork.id)).toEqual(reservedIds);
    expect(forks.map((fork) => fork.position)).toEqual([
      { ...killed.position },
      { ...killed.position },
    ]);

    const expectedVelocity = (angle: number): Vec2 => ({
      x: Math.sin(angle) * SPLITBOLT_SPEED,
      z: -Math.cos(angle) * SPLITBOLT_SPEED,
    });
    expect(SPLITBOLT_FORK_ANGLE_RADIANS).toBe(0.22);
    expect(forks[0]!.velocity.x).toBeCloseTo(expectedVelocity(-SPLITBOLT_FORK_ANGLE_RADIANS).x);
    expect(forks[0]!.velocity.z).toBeCloseTo(expectedVelocity(-SPLITBOLT_FORK_ANGLE_RADIANS).z);
    expect(forks[1]!.velocity.x).toBeCloseTo(expectedVelocity(SPLITBOLT_FORK_ANGLE_RADIANS).x);
    expect(forks[1]!.velocity.z).toBeCloseTo(expectedVelocity(SPLITBOLT_FORK_ANGLE_RADIANS).z);

    for (const fork of forks) {
      expect(fork).toMatchObject({
        kind: "splitbolt",
        splitStage: "fork",
        radius: SPLITBOLT_FORK_RADIUS,
        remaining: SPLITBOLT_LIFETIME_SECONDS,
        damage: seed.damage,
        pierce: SPLITBOLT_FORK_PIERCE,
      });
      expect(fork.hitIds).not.toBe(seed.hitIds);
      expect(fork.hitIds).not.toBe(forks.find((candidate) => candidate !== fork)!.hitIds);
      expect([...fork.hitIds]).toEqual([beforeSplit.id, killed.id]);
      expect(fork.hitIds.has(afterSplit.id)).toBe(false);
    }
    expect(SPLITBOLT_FORK_RADIUS).toBe(1.2);
    expect(seed.remaining).toBeCloseTo(SPLITBOLT_LIFETIME_SECONDS - 0.1);
    expect(forks.every((fork) => fork.remaining === SPLITBOLT_LIFETIME_SECONDS)).toBe(true);

    // The projectile update iterates a stable copy: new forks have not moved
    // or contacted the later target during their creation tick.
    expect(afterSplit.hp).toBeCloseTo(1_000 - castDamage);
    expect(game.getSnapshot().projectiles.map((projectile) => projectile.splitStage)).toEqual([
      "seed",
      "fork",
      "fork",
    ]);
    for (const projectile of game.getSnapshot().projectiles) {
      expectPublicProjectile(projectile, projectile.splitStage!);
    }
  });

  test("later seed kills and fork kills never recurse or allocate another projectile", () => {
    const { player, internals, seed, forks } = createForkedVolley();
    internals.enemies.clear();
    const volley = [seed, ...forks];
    const originalIds = volley.map((projectile) => projectile.id);

    for (const [index, projectile] of volley.entries()) {
      const x = (index - 1) * 7;
      projectile.position = { x, z: 0 };
      projectile.velocity = { x: 0, z: -SPLITBOLT_SPEED };
      spawnEnemy(internals, { x, z: -2 }, 1);
    }
    internals.updateProjectiles(0.1);

    expect([...internals.projectiles.keys()]).toEqual(originalIds);
    expect(seed.splitTriggered).toBe(true);
    expect(forks.every((fork) => fork.splitStage === "fork" && !fork.reservedForkIds)).toBe(true);
    expect(player.kills).toBe(4);
    expect(internals.pickups.size).toBe(4);
  });

  test("one seed plus its two forks can deliver at most twelve enemy contacts", () => {
    const { internals, seed, forks } = createForkedVolley();
    internals.enemies.clear();
    const volley = [seed, ...forks];
    const targetsByBranch: TestEnemy[][] = [];

    for (const [branchIndex, projectile] of volley.entries()) {
      const x = (branchIndex - 1) * 8;
      projectile.position = { x, z: 0 };
      projectile.velocity = { x: 0, z: -SPLITBOLT_SPEED };
      const targetCount = branchIndex === 0 ? 4 : 5;
      const targets = Array.from({ length: targetCount }, (_, index) =>
        spawnEnemy(internals, { x, z: -0.55 - index * 0.55 }, 1_000));
      targetsByBranch.push(targets);
    }

    internals.updateProjectiles(0.1);
    const contacted = targetsByBranch.flat().filter((enemy) => enemy.hp < 1_000);
    const untouched = targetsByBranch.flat().filter((enemy) => enemy.hp === 1_000);

    // The triggering kill already spent one of the seed's four contacts.
    expect(1 + contacted.length).toBe(
      SPLITBOLT_SEED_PIERCE + SPLITBOLT_FORK_COUNT * SPLITBOLT_FORK_PIERCE,
    );
    expect(untouched).toHaveLength(3);
    expect(internals.projectiles.size).toBe(0);
  });

  test("the Rift Heart wins first-contact order, never causes a fork, and takes one unsplit hit", () => {
    const { game, player, internals } = readyRiftstalker({
      accelerated: true,
      timings: { pushDuration: 180 },
    });
    enterPush(game, internals);
    player.position = {
      x: WORLD_LAYOUT.riftHeart.x,
      z: WORLD_LAYOUT.riftHeart.z + 9.2,
    };
    const behindHeart = spawnEnemy(internals, {
      x: WORLD_LAYOUT.riftHeart.x,
      z: WORLD_LAYOUT.riftHeart.z + 4,
    }, 1);
    castSeed(internals, player);
    const before = game.getSnapshot().riftHeart.hp;

    internals.updateProjectiles(0.1);

    expect(before - game.getSnapshot().riftHeart.hp).toBeCloseTo(
      ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base,
    );
    expect(behindHeart.hp).toBe(1);
    expect(internals.projectiles.size).toBe(0);
    expect(game.phase).toBe("push");
  });

  test("defeat clears an unsplit Splitbolt seed from authority and the public snapshot", () => {
    const { game, player, internals } = readyRiftstalker();
    const seed = castSeed(internals, player);
    expect(internals.projectiles.has(seed.id)).toBe(true);
    expect(game.getSnapshot().projectiles.map(({ splitStage }) => splitStage)).toEqual(["seed"]);

    game.damageNexus(10_000);

    expect(game.phase).toBe("defeat");
    expect(internals.projectiles.size).toBe(0);
    expect(game.getSnapshot().projectiles).toEqual([]);
  });

  test("defeat clears an earned Splitbolt seed-and-fork lineage", () => {
    const { game, internals, seed, forks } = createForkedVolley();
    expect([...internals.projectiles.keys()]).toEqual([
      seed.id,
      ...forks.map(({ id }) => id),
    ]);
    expect(game.getSnapshot().projectiles.map(({ splitStage }) => splitStage)).toEqual([
      "seed",
      "fork",
      "fork",
    ]);

    game.damageNexus(10_000);

    expect(game.phase).toBe("defeat");
    expect(internals.projectiles.size).toBe(0);
    expect(game.getSnapshot().projectiles).toEqual([]);
  });

  test("a previously split volley can hit the Rift Heart three times, and victory clears every surviving branch", () => {
    const prepareSplitPush = () => {
      const prepared = readyRiftstalker({
        accelerated: true,
        timings: { pushDuration: 180 },
      });
      enterPush(prepared.game, prepared.internals);
      prepared.player.position = {
        x: WORLD_LAYOUT.riftHeart.x,
        z: WORLD_LAYOUT.riftHeart.z + 20,
      };
      spawnEnemy(prepared.internals, {
        x: WORLD_LAYOUT.riftHeart.x,
        z: WORLD_LAYOUT.riftHeart.z + 16.5,
      }, 1);
      castSeed(prepared.internals, prepared.player);
      prepared.internals.updateProjectiles(0.1);
      expect(prepared.internals.projectiles.size).toBe(3);
      for (const projectile of prepared.internals.projectiles.values()) {
        projectile.position = {
          x: WORLD_LAYOUT.riftHeart.x,
          z: WORLD_LAYOUT.riftHeart.z + 7.5,
        };
      }
      return prepared;
    };

    const threeHits = prepareSplitPush();
    const before = threeHits.game.getSnapshot().riftHeart.hp;
    threeHits.internals.updateProjectiles(0.1);
    expect(before - threeHits.game.getSnapshot().riftHeart.hp).toBeCloseTo(
      ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base * 3,
    );
    expect(threeHits.internals.projectiles.size).toBe(0);

    const lethal = prepareSplitPush();
    lethal.internals.riftHeart.hp = ABILITY_IMPACT_DEFINITIONS.riftstalker.ability2.primary.base;
    lethal.internals.updateProjectiles(0.1);
    expect(lethal.game.phase).toBe("victory");
    expect(lethal.game.getSnapshot().riftHeart.hp).toBe(0);
    expect(lethal.internals.projectiles.size).toBe(0);
    expect(lethal.game.getSnapshot().projectiles).toEqual([]);
  });
});
