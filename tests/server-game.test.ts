import { describe, expect, test } from "bun:test";
import { GameWorld } from "../src/server/game";
import { LANE_IDS, WORLD_LAYOUT } from "../src/shared/game-data";
import { configureGreatsword } from "./support/defender-fixture";

const readySolo = (game: GameWorld) => {
  expect(game.addPlayer("p1", "Ada").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
  expect(game.handleMessage("p1", { type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" }).ok).toBe(true);
  for (let index = 0; index < 26; index += 1) game.update(0.1);
};

const readyParty = (game: GameWorld, count: number) => {
  for (let index = 0; index < count; index += 1) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
  for (let index = 0; index < count; index += 1) {
    expect(game.handleMessage(`p${index + 1}`, { type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" }).ok).toBe(true);
  }
  for (let index = 0; index < 26; index += 1) game.update(0.1);
};

const advance = (game: GameWorld, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
};

describe("authoritative siege world", () => {

  test("a reserved defender becomes inert without losing authoritative run state", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);
    const state = game.players.get("p1")!;
    state.goldUnits = 360;
    state.equipment[0] = "fleetstep_greaves";
    game.handleMessage("p1", {
      type: "input",
      seq: 7,
      move: { x: 1, z: 0 },
      aim: { x: 0, z: -1 },
      attacking: true,
    });

    expect(game.setPlayerConnected("p1", false).ok).toBe(true);
    const reserved = game.getSnapshot().players[0]!;
    expect(reserved.connected).toBe(false);
    expect(reserved.velocity).toEqual({ x: 0, z: 0 });
    expect(reserved.gold).toBe(30);
    expect(reserved.equipment[0]).toBe("fleetstep_greaves");
    expect(reserved.lastInputSeq).toBe(7);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability1" }).code).toBe("PLAYER_DISCONNECTED");

    expect(game.setPlayerConnected("p1", true).ok).toBe(true);
    expect(game.getSnapshot().players[0]!.connected).toBe(true);
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
    expect(snapshot.players[0]!.heroId).toBe("defender");
    expect(snapshot.players[0]!.ready).toBe(false);
  });

  test("authoritative run time survives clients and freezes with the outcome", () => {
    const game = new GameWorld({ timings: { defenseDuration: 20 } });
    readySolo(game);
    const defenseStart = game.getSnapshot().runElapsed;
    advance(game, 1.25);
    const activeTime = game.getSnapshot().runElapsed;
    expect(activeTime - defenseStart).toBeCloseTo(1.25);

    game.damageNexus(10_000);
    advance(game, 1);
    expect(game.getSnapshot().runElapsed).toBe(activeTime);
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
    configureGreatsword(game, "p1", ["cleave"], { ability1: "cleave" });
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
    expect(player.cooldownsBySkillId.cleave).toBeGreaterThan(0);
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
