import { describe, expect, test } from "bun:test";
import { GameWorld } from "../src/server/game";
import { HERO_IDS, LANE_IDS, WORLD_LAYOUT } from "../src/shared/game-data";
import { parseClientMessage } from "../src/shared/protocol";

const readySolo = (game: GameWorld) => {
  expect(game.addPlayer("p1", "Ada").ok).toBe(true);
  expect(game.claimHero("p1", "warden").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
};

const readyParty = (game: GameWorld, count: number) => {
  for (let index = 0; index < count; index += 1) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.claimHero(playerId, HERO_IDS[index]!).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
};

const advance = (game: GameWorld, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
};

describe("authoritative siege world", () => {
  test("the protocol removes dodge and accepts explicit ability leveling", () => {
    expect(parseClientMessage(JSON.stringify({ type: "dodge", direction: { x: 1, z: 0 } }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "choose_talent", talentId: "fury" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "level_ability", slot: "ability2" }))).toEqual({
      type: "level_ability",
      slot: "ability2",
    });
  });

  test("a hero can only be claimed by one of up to four players", () => {
    const game = new GameWorld();
    game.addPlayer("p1", "Ada");
    game.addPlayer("p2", "Bryn");

    expect(game.claimHero("p1", "riftstalker").ok).toBe(true);
    const duplicate = game.claimHero("p2", "riftstalker");

    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe("HERO_TAKEN");
    expect(game.getSnapshot().lobby.claimedHeroes.riftstalker).toBe("p1");
  });

  test("destroying the central Nexus immediately loses the run", () => {
    const game = new GameWorld();
    readySolo(game);

    game.damageNexus(10_000);

    expect(game.phase).toBe("defeat");
    expect(game.getSnapshot().nexus.hp).toBe(0);
  });

  test("the host can return a finished room to hero selection", () => {
    const game = new GameWorld();
    readySolo(game);
    game.damageNexus(10_000);

    expect(game.resetRun("p1").ok).toBe(true);

    const snapshot = game.getSnapshot();
    expect(snapshot.phase).toBe("lobby");
    expect(snapshot.players[0]!.heroId).toBe("warden");
    expect(snapshot.players[0]!.ready).toBe(false);
  });

  test("solo defense opens one clearly signalled front", () => {
    const game = new GameWorld({ timings: { defenseDuration: 10, waveCount: 5 }, random: () => 0.5 });
    readySolo(game);
    advance(game, 0.8);

    const snapshot = game.getSnapshot();
    expect(snapshot.pressureLane).toBe("north");
    expect(snapshot.activeLanes).toEqual(["north"]);
    expect(snapshot.enemies.length).toBeGreaterThan(0);
    expect(new Set(snapshot.enemies.map((enemy) => enemy.lane))).toEqual(new Set(["north"]));
  });

  test("enemies take stable spread-out gate positions instead of collapsing onto one contact point", () => {
    const game = new GameWorld({
      timings: { defenseDuration: 60, waveCount: 1 },
      random: () => 0.5,
      enemyCap: 24,
    });
    readySolo(game);
    advance(game, 14);

    const snapshot = game.getSnapshot();
    const attackers = snapshot.enemies.filter((enemy) => enemy.targetKind === "gate" && enemy.action);
    expect(attackers.length).toBeGreaterThanOrEqual(4);
    const xPositions = attackers.map((enemy) => enemy.position.x);
    expect(Math.max(...xPositions) - Math.min(...xPositions)).toBeGreaterThan(4);
    expect(snapshot.gates.find((gate) => gate.lane === "north")!.hp).toBeLessThan(260);
  });

  for (const playerCount of [1, 2, 3, 4]) {
    test(`${playerCount} player${playerCount === 1 ? "" : "s"} open ${playerCount} fixed lane${playerCount === 1 ? "" : "s"} with solo-calibrated pressure per lane`, () => {
      const solo = new GameWorld({ timings: { defenseDuration: 20, waveCount: 4 }, random: () => 0.5 });
      readyParty(solo, 1);
      advance(solo, 0.8);
      const soloSnapshot = solo.getSnapshot();
      const soloPerLaneCount = soloSnapshot.enemies.length;
      const soloEnemyHp = soloSnapshot.enemies[0]!.maxHp;

      const game = new GameWorld({ timings: { defenseDuration: 20, waveCount: 4 }, random: () => 0.5 });
      readyParty(game, playerCount);
      advance(game, 0.8);

      const snapshot = game.getSnapshot();
      const expectedLanes = LANE_IDS.slice(0, playerCount);
      expect(snapshot.activeLanes).toEqual(expectedLanes);
      expect(new Set(snapshot.enemies.map((enemy) => enemy.lane))).toEqual(new Set(expectedLanes));
      for (const lane of expectedLanes) {
        const laneEnemies = snapshot.enemies.filter((enemy) => enemy.lane === lane);
        expect(laneEnemies.length).toBe(soloPerLaneCount);
        expect(new Set(laneEnemies.map((enemy) => enemy.maxHp))).toEqual(new Set([soloEnemyHp]));
      }
      expect(snapshot.enemies.length).toBe(soloPerLaneCount * playerCount);
    });
  }

  test("the enemy safety cap never gives an extra batch to earlier lanes", () => {
    const game = new GameWorld({
      timings: { defenseDuration: 10, waveCount: 1 },
      random: () => 0.5,
      enemyCap: 6,
    });
    readyParty(game, 4);
    advance(game, 1.5);

    const snapshot = game.getSnapshot();
    expect(snapshot.enemies).toHaveLength(4);
    for (const lane of LANE_IDS) {
      expect(snapshot.enemies.filter((enemy) => enemy.lane === lane)).toHaveLength(1);
    }
  });

  test("the breach always reserves room for its mandatory Gatebreaker", () => {
    const game = new GameWorld({
      timings: { defenseDuration: 0.2, breachDuration: 1, waveCount: 1 },
      random: () => 0.5,
      enemyCap: 1,
    });
    readySolo(game);
    advance(game, 0.25);

    expect(game.phase).toBe("breach");
    expect(game.getSnapshot().enemies.map((enemy) => enemy.kind)).toEqual(["siege"]);
    advance(game, 0.3);
    expect(game.phase).toBe("breach");
  });

  test("the run's lane allocation survives disconnects and wave changes while wave HP scaling remains", () => {
    const game = new GameWorld({ timings: { defenseDuration: 12, waveCount: 3 }, random: () => 0.5 });
    readyParty(game, 3);
    advance(game, 0.8);
    expect(game.getSnapshot().activeLanes).toEqual(["north", "east", "south"]);

    game.removePlayer("p3");
    advance(game, 4.1);

    const snapshot = game.getSnapshot();
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.wave.number).toBe(2);
    expect(snapshot.activeLanes).toEqual(["north", "east", "south"]);
    expect(snapshot.enemies.every((enemy) => snapshot.activeLanes.includes(enemy.lane))).toBe(true);
    expect(new Set(snapshot.enemies.map((enemy) => enemy.maxHp))).toContain(Math.round(42 * 1.07));
  });

  test("a run starts with one skill point and rejects unlearned casts and overspending", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);

    let player = game.getSnapshot().players[0]!;
    expect(player.skillPoints).toBe(1);
    expect(player.abilityRanks).toEqual({ ability1: 0, ability2: 0, ability3: 0, ultimate: 0 });
    expect(game.handleMessage("p1", { type: "cast", slot: "ability1" }).code).toBe("ABILITY_UNLEARNED");

    expect(game.levelAbility("p1", "ability1").ok).toBe(true);
    player = game.getSnapshot().players[0]!;
    expect(player.abilityRanks.ability1).toBe(1);
    expect(player.skillPoints).toBe(0);
    expect(game.levelAbility("p1", "ability2").code).toBe("NO_SKILL_POINTS");
  });

  test("the ultimate has a level gate and a two-rank cap", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);

    expect(game.levelAbility("p1", "ultimate").code).toBe("LEVEL_REQUIRED");
    expect(game.getSnapshot().players[0]!.skillPoints).toBe(1);

    game.grantExperience("p1", 135);
    expect(game.getSnapshot().players[0]!.level).toBe(3);
    expect(game.levelAbility("p1", "ultimate").ok).toBe(true);
    expect(game.levelAbility("p1", "ultimate").ok).toBe(true);
    expect(game.levelAbility("p1", "ultimate").code).toBe("MAX_RANK");
    expect(game.getSnapshot().players[0]!.skillPoints).toBe(1);
    expect(game.levelAbility("p1", "ability1").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.skillPoints).toBe(0);
  });

  test("a fully maxed build never receives an unusable skill point", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);
    game.grantExperience("p1", 2_075);

    expect(game.getSnapshot().players[0]!.level).toBe(11);
    expect(game.getSnapshot().players[0]!.skillPoints).toBe(11);
    for (let rank = 0; rank < 3; rank += 1) {
      expect(game.levelAbility("p1", "ability1").ok).toBe(true);
      expect(game.levelAbility("p1", "ability2").ok).toBe(true);
      expect(game.levelAbility("p1", "ability3").ok).toBe(true);
    }
    for (let rank = 0; rank < 2; rank += 1) expect(game.levelAbility("p1", "ultimate").ok).toBe(true);

    let player = game.getSnapshot().players[0]!;
    expect(player.abilityRanks).toEqual({ ability1: 3, ability2: 3, ability3: 3, ultimate: 2 });
    expect(player.skillPoints).toBe(0);

    game.grantExperience("p1", 400);
    player = game.getSnapshot().players[0]!;
    expect(player.level).toBe(12);
    expect(player.skillPoints).toBe(0);
  });

  test("banked skill points cannot exceed the hero's remaining rank capacity", () => {
    for (const heroId of HERO_IDS) {
      const game = new GameWorld({ timings: { defenseDuration: 20 } });
      expect(game.addPlayer("p1", "Ada").ok).toBe(true);
      expect(game.claimHero("p1", heroId).ok).toBe(true);
      expect(game.setReady("p1", true).ok).toBe(true);
      expect(game.startGame("p1").ok).toBe(true);

      game.grantExperience("p1", 2_475);
      const player = game.getSnapshot().players[0]!;
      expect(player.level).toBe(12);
      expect(player.skillPoints).toBe(11);
    }
  });

  test("higher ability ranks visibly increase the effect radius", () => {
    const rankOne = new GameWorld({ timings: { defenseDuration: 20 }, random: () => 0.5 });
    readySolo(rankOne);
    expect(rankOne.levelAbility("p1", "ability3").ok).toBe(true);
    expect(rankOne.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(rankOne, 0.4);
    const rankOneRadius = rankOne.getSnapshot().effects.find((effect) => effect.kind === "war_standard")!.radius;

    const rankTwo = new GameWorld({ timings: { defenseDuration: 20 }, random: () => 0.5 });
    readySolo(rankTwo);
    rankTwo.grantExperience("p1", 50);
    expect(rankTwo.levelAbility("p1", "ability3").ok).toBe(true);
    expect(rankTwo.levelAbility("p1", "ability3").ok).toBe(true);
    expect(rankTwo.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(rankTwo, 0.4);
    const rankTwoRadius = rankTwo.getSnapshot().effects.find((effect) => effect.kind === "war_standard")!.radius;

    expect(rankTwoRadius).toBeCloseTo(rankOneRadius * 1.08);
  });

  test("Wraith Host raises persistent authoritative summons instead of firing a projectile fan", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 }, random: () => 0.5 });
    expect(game.addPlayer("p1", "Ada").ok).toBe(true);
    expect(game.claimHero("p1", "gravebinder").ok).toBe(true);
    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);
    expect(game.levelAbility("p1", "ability3").ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);

    advance(game, 0.4);
    const raised = game.getSnapshot();
    expect(raised.summons).toHaveLength(3);
    expect(raised.summons.every((summon) => summon.kind === "wraith" && summon.ownerId === "p1")).toBe(true);
    expect(raised.projectiles).toHaveLength(0);
    const initialPositions = raised.summons.map((summon) => ({ ...summon.position }));

    advance(game, 0.5);
    const hunting = game.getSnapshot().summons;
    expect(hunting).toHaveLength(3);
    expect(hunting.some((summon, index) => summon.position.x !== initialPositions[index]!.x || summon.position.z !== initialPositions[index]!.z)).toBe(true);
    const pairDistances = hunting.flatMap((summon, index) => hunting.slice(index + 1).map((other) =>
      Math.hypot(summon.position.x - other.position.x, summon.position.z - other.position.z),
    ));
    expect(Math.min(...pairDistances)).toBeGreaterThan(2);
  });

  test("hero attacks expose an authoritative windup before impact", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);
    game.handleMessage("p1", {
      type: "input",
      seq: 1,
      move: { x: 0, z: 0 },
      aim: { x: 0, z: -1 },
      attacking: true,
    });
    game.update(0.01);

    const player = game.getSnapshot().players[0]!;
    expect(player.action?.kind).toBe("basic");
    expect(player.action?.phase).toBe("windup");
    expect(player.velocity).toEqual({ x: 0, z: 0 });
  });

  test("an ability interrupts a held basic attack without overlapping another ability", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);
    expect(game.levelAbility("p1", "ability1").ok).toBe(true);
    game.handleMessage("p1", {
      type: "input",
      seq: 1,
      move: { x: 0, z: 0 },
      aim: { x: 0, z: -1 },
      attacking: true,
    });
    game.update(0.01);
    expect(game.getSnapshot().players[0]!.action?.kind).toBe("basic");

    expect(game.handleMessage("p1", { type: "cast", slot: "ability1" }).ok).toBe(true);
    const player = game.getSnapshot().players[0]!;
    expect(player.action?.kind).toBe("ability1");
    expect(player.action?.phase).toBe("windup");
    expect(player.cooldowns.ability1).toBe(6);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability1" }).code).toBe("ACTION_BUSY");
  });

  test("enemies stop and telegraph before their attack applies damage", () => {
    const game = new GameWorld({ timings: { defenseDuration: 30, waveCount: 1 }, random: () => 0.5 });
    readySolo(game);

    let attacking = game.getSnapshot().enemies.find((enemy) => enemy.action?.phase === "windup");
    for (let steps = 0; !attacking && steps < 1_000; steps += 1) {
      game.update(0.02);
      attacking = game.getSnapshot().enemies.find((enemy) => enemy.action?.phase === "windup");
    }

    expect(attacking).toBeDefined();
    expect(attacking!.velocity).toEqual({ x: 0, z: 0 });
    const gateBefore = game.getSnapshot().gates.find((gate) => gate.lane === attacking!.lane)!.hp;
    advance(game, 0.1);
    expect(game.getSnapshot().gates.find((gate) => gate.lane === attacking!.lane)!.hp).toBe(gateBefore);
    advance(game, 0.2);
    expect(game.getSnapshot().gates.find((gate) => gate.lane === attacking!.lane)!.hp).toBeLessThan(gateBefore);
  });

  test("the slice progresses defense to breach to push and Rift Heart victory", () => {
    const game = new GameWorld({
      timings: { defenseDuration: 0.2, breachDuration: 0.2, pushDuration: 2, waveCount: 1 },
      random: () => 0.5,
    });
    readySolo(game);
    advance(game, 0.25);
    expect(game.phase).toBe("breach");
    expect(game.getSnapshot().gates.find((gate) => gate.lane === "north")!.breached).toBe(true);
    game.damageGatebreaker(10_000);
    advance(game, 0.1);
    expect(game.phase).toBe("push");
    expect(game.getSnapshot().riftHeart.active).toBe(true);
    advance(game, 0.1);
    const guard = game.getSnapshot().enemies.find((enemy) => enemy.kind === "rift_guard");
    expect(guard).toBeDefined();
    expect(guard!.position.z).toBeGreaterThan(WORLD_LAYOUT.riftHeart.z);
    expect(guard!.position.z).toBeLessThanOrEqual(WORLD_LAYOUT.riftHeart.z + 46);

    game.damageRiftHeart(10_000);

    expect(game.phase).toBe("victory");
    expect(game.getSnapshot().riftHeart.hp).toBe(0);
  });
});
