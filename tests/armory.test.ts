import { describe, expect, test } from "bun:test";
import {
  EQUIPMENT_SLOT_COUNT,
  VENDOR_DEFINITIONS,
  createEmptyEquipment,
} from "../src/shared/armory-data";
import { HERO_IDS } from "../src/shared/game-data";
import { parseClientMessage, type ClientMessage, type EquipmentSlots } from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";
import { deriveHeroStats } from "../src/server/hero-stats";

const forge = VENDOR_DEFINITIONS.ironbound_forge;

function readyParty(game: GameWorld, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.claimHero(playerId, HERO_IDS[index]!).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
}

function placeAtForge(game: GameWorld, playerId = "p1"): void {
  game.players.get(playerId)!.position = { ...forge.position };
}

function fund(game: GameWorld, gold: number, playerId = "p1"): void {
  game.players.get(playerId)!.goldUnits = goldToUnits(gold);
}

function buy(game: GameWorld, itemId: "tempered_edge" | "fleetstep_greaves", playerId = "p1") {
  return game.handleMessage(playerId, { type: "buy_item", vendorId: "ironbound_forge", itemId });
}

function enterFundedPush(): GameWorld {
  const game = new GameWorld({
    accelerated: true,
    timings: { pushDuration: 180 },
    random: () => 0.5,
    enemyCap: 1,
  });
  readyParty(game, 1);
  expect(game.debugAdvance().ok).toBe(true);
  expect(game.debugAdvance().ok).toBe(true);
  expect(game.getSnapshot().phase).toBe("push");
  expect(game.getSnapshot().players[0]!.gold).toBe(35);
  return game;
}

function walkTo(game: GameWorld, target: { x: number; z: number }, stopDistance: number, startSequence = 1): number {
  let sequence = startSequence;
  for (let step = 0; step < 10_000; step += 1) {
    const position = game.getSnapshot().players[0]!.position;
    const delta = { x: target.x - position.x, z: target.z - position.z };
    const distance = Math.hypot(delta.x, delta.z);
    if (distance <= stopDistance) break;
    game.handleMessage("p1", {
      type: "input",
      seq: sequence,
      move: { x: delta.x / distance, z: delta.z / distance },
      aim: delta,
      attacking: false,
    });
    sequence += 1;
    game.update(1 / 30);
  }
  game.handleMessage("p1", {
    type: "input",
    seq: sequence,
    move: { x: 0, z: 0 },
    aim: { x: target.x, z: target.z },
    attacking: false,
  });
  return sequence + 1;
}

describe("authoritative Ironbound Forge", () => {
  test("the protocol accepts only known typed Forge purchases", () => {
    expect(parseClientMessage(JSON.stringify({
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
    }))).toEqual({ type: "buy_item", vendorId: "ironbound_forge", itemId: "tempered_edge" });
    expect(parseClientMessage(JSON.stringify({
      type: "buy_item",
      vendorId: "unknown_forge",
      itemId: "tempered_edge",
    }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "unknown_item",
    }))).toBeNull();
  });

  test("server validation independently rejects unknown vendors and items", () => {
    const game = new GameWorld();
    readyParty(game, 1);
    placeAtForge(game);
    fund(game, 48);
    const before = game.getSnapshot().players[0]!;

    const unknownVendor = game.handleMessage("p1", {
      type: "buy_item",
      vendorId: "unknown_forge",
      itemId: "tempered_edge",
    } as unknown as ClientMessage);
    const unknownItem = game.handleMessage("p1", {
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "unknown_item",
    } as unknown as ClientMessage);

    expect(unknownVendor.code).toBe("VENDOR_UNKNOWN");
    expect(unknownItem.code).toBe("ITEM_UNKNOWN");
    const after = game.getSnapshot().players[0]!;
    expect(after.gold).toBe(before.gold);
    expect(after.equipment).toEqual(before.equipment);
  });

  test("remote and insufficient-fund attempts leave wallet, equipment, and stats untouched", () => {
    const game = new GameWorld();
    readyParty(game, 1);
    fund(game, 24);
    const baseline = game.getSnapshot().players[0]!;

    expect(buy(game, "tempered_edge").code).toBe("OUT_OF_RANGE");
    let player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(24);
    expect(player.equipment).toEqual(createEmptyEquipment());
    expect(player.stats).toEqual(baseline.stats);

    placeAtForge(game);
    fund(game, 23);
    expect(buy(game, "tempered_edge").code).toBe("INSUFFICIENT_GOLD");
    player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(23);
    expect(player.equipment).toEqual(createEmptyEquipment());
    expect(player.stats).toEqual(baseline.stats);
  });

  test("an earned Gatebreaker reward funds a real Forge purchase", () => {
    const game = new GameWorld({ accelerated: true, random: () => 0.5 });
    readyParty(game, 1);
    expect(game.debugAdvance().ok).toBe(true);
    game.damageGatebreaker(10_000);
    expect(game.getSnapshot().players[0]!.gold).toBe(35);

    placeAtForge(game);
    expect(buy(game, "tempered_edge").ok).toBe(true);
    const player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(11);
    expect(player.equipment[0]).toBe("tempered_edge");
    expect(player.stats.basicDamage).toBeCloseTo(36);
  });

  test("only a living hero in an active run can trade", () => {
    const game = new GameWorld();
    expect(game.addPlayer("p1", "Ada").ok).toBe(true);
    expect(game.claimHero("p1", "warden").ok).toBe(true);
    placeAtForge(game);
    fund(game, 24);
    expect(buy(game, "tempered_edge").code).toBe("RUN_INACTIVE");

    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);
    placeAtForge(game);
    game.players.get("p1")!.downedFor = 1;
    expect(buy(game, "tempered_edge").code).toBe("PLAYER_DOWNED");
    expect(game.getSnapshot().players[0]!.equipment).toEqual(createEmptyEquipment());
  });

  test("purchases atomically equip both items and apply additive-from-base stats even during an action", () => {
    const game = new GameWorld();
    readyParty(game, 1);
    placeAtForge(game);
    fund(game, 48);
    game.handleMessage("p1", {
      type: "input",
      seq: 1,
      move: { x: 0, z: 0 },
      aim: { x: 0, z: -1 },
      attacking: true,
    });
    game.update(0.01);
    expect(game.getSnapshot().players[0]!.action?.kind).toBe("basic");

    expect(buy(game, "tempered_edge").ok).toBe(true);
    expect(buy(game, "fleetstep_greaves").ok).toBe(true);

    const player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(0);
    expect(player.equipment).toEqual([
      "tempered_edge",
      "fleetstep_greaves",
      null,
      null,
      null,
      null,
    ]);
    expect(player.stats.basicDamage).toBeCloseTo(36);
    expect(player.stats.moveSpeed).toBeCloseTo(11.55);
    expect(player.stats.maxHp).toBe(190);
    expect(player.stats.basicAttackInterval).toBe(0.52);
    expect(player.stats.abilityPower).toBe(1);
    expect(player.stats.cooldownRecovery).toBe(1);
    expect(game.takePendingEvents().filter((event) => event.kind === "item_purchased")).toHaveLength(2);
  });

  test("Fleetstep Greaves increase real fixed-dt server displacement by exactly ten percent", () => {
    const game = enterFundedPush();
    let sequence = walkTo(game, forge.position, 0.5);
    const baselineStart = game.getSnapshot().players[0]!.position.x;
    game.handleMessage("p1", {
      type: "input",
      seq: sequence++,
      move: { x: 1, z: 0 },
      aim: { x: 1, z: 0 },
      attacking: false,
    });
    game.update(0.1);
    const baselineDistance = game.getSnapshot().players[0]!.position.x - baselineStart;

    expect(buy(game, "fleetstep_greaves").ok).toBe(true);
    const boostedStart = game.getSnapshot().players[0]!.position.x;
    game.handleMessage("p1", {
      type: "input",
      seq: sequence,
      move: { x: 1, z: 0 },
      aim: { x: 1, z: 0 },
      attacking: false,
    });
    game.update(0.1);
    const boostedDistance = game.getSnapshot().players[0]!.position.x - boostedStart;

    expect(baselineDistance).toBeCloseTo(1.05);
    expect(boostedDistance).toBeCloseTo(1.155);
    expect(boostedDistance / baselineDistance).toBeCloseTo(1.1);
  });

  test("Tempered Edge increases a real subsequent Warden basic hit from thirty to thirty-six", () => {
    function strikeRift(withEdge: boolean): number {
      const game = enterFundedPush();
      let sequence = 1;
      if (withEdge) {
        sequence = walkTo(game, forge.position, 0.5, sequence);
        expect(buy(game, "tempered_edge").ok).toBe(true);
      }
      const rift = game.getSnapshot().riftHeart;
      sequence = walkTo(game, rift.position, 5.5, sequence);
      const player = game.getSnapshot().players[0]!;
      const before = game.getSnapshot().riftHeart.hp;
      game.handleMessage("p1", {
        type: "input",
        seq: sequence,
        move: { x: 0, z: 0 },
        aim: { x: rift.position.x - player.position.x, z: rift.position.z - player.position.z },
        attacking: true,
      });
      for (let step = 0; step < 15; step += 1) game.update(1 / 60);
      return before - game.getSnapshot().riftHeart.hp;
    }

    expect(strikeRift(false)).toBeCloseTo(30);
    expect(strikeRift(true)).toBeCloseTo(36);
  });

  test("duplicate items stack into six unrestricted slots and a seventh purchase is rejected atomically", () => {
    const game = new GameWorld();
    readyParty(game, 1);
    placeAtForge(game);
    fund(game, 7 * 24);

    for (let copy = 0; copy < EQUIPMENT_SLOT_COUNT; copy += 1) {
      expect(buy(game, "tempered_edge").ok).toBe(true);
    }
    const sixEdges: EquipmentSlots = [
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
    ];
    let player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual(sixEdges);
    expect(player.stats.basicDamage).toBeCloseTo(66);
    expect(player.gold).toBe(24);

    expect(buy(game, "fleetstep_greaves").code).toBe("EQUIPMENT_FULL");
    player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(24);
    expect(player.equipment).toEqual(sixEdges);
    expect(player.stats.basicDamage).toBeCloseTo(66);
  });

  test("one hero's purchase never changes an ally's wallet, equipment, or stats", () => {
    const game = new GameWorld();
    readyParty(game, 2);
    placeAtForge(game, "p1");
    fund(game, 24, "p1");

    expect(buy(game, "tempered_edge", "p1").ok).toBe(true);
    const snapshot = game.getSnapshot();
    const buyer = snapshot.players.find((player) => player.id === "p1")!;
    const ally = snapshot.players.find((player) => player.id === "p2")!;
    expect(buyer.stats.basicDamage).toBeCloseTo(36);
    expect(buyer.equipment[0]).toBe("tempered_edge");
    expect(ally.gold).toBe(0);
    expect(ally.equipment).toEqual(createEmptyEquipment());
    expect(ally.stats.basicDamage).toBe(19);
    expect(ally.stats.moveSpeed).toBe(12.5);
  });

  test("equipment is run-only and reset restores the verified baseline", () => {
    const game = new GameWorld();
    readyParty(game, 1);
    placeAtForge(game);
    fund(game, 24);
    expect(buy(game, "fleetstep_greaves").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.stats.moveSpeed).toBeCloseTo(11.55);

    game.damageNexus(10_000);
    expect(game.resetRun("p1").ok).toBe(true);
    let player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual(createEmptyEquipment());
    expect(player.stats).toEqual(deriveHeroStats("warden", 1));

    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);
    player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual(createEmptyEquipment());
    expect(player.stats).toEqual(deriveHeroStats("warden", 1));
  });

  test("equipped items survive downing and authoritative revival", () => {
    const game = new GameWorld();
    readyParty(game, 1);
    placeAtForge(game);
    fund(game, 24);
    expect(buy(game, "tempered_edge").ok).toBe(true);

    const state = game.players.get("p1")!;
    state.hp = 0;
    state.downedFor = 0.05;
    game.update(0.1);
    const revived = game.getSnapshot().players[0]!;
    expect(revived.downed).toBe(false);
    expect(revived.equipment[0]).toBe("tempered_edge");
    expect(revived.stats.basicDamage).toBeCloseTo(36);
  });

  test("empty equipment preserves every hero's verified baseline", () => {
    for (const heroId of HERO_IDS) {
      expect(deriveHeroStats(heroId, 1, createEmptyEquipment())).toEqual(deriveHeroStats(heroId, 1));
    }
  });

  test("both wares derive only their promised stat for every hero", () => {
    for (const heroId of HERO_IDS) {
      const baseline = deriveHeroStats(heroId, 1);
      const edge = deriveHeroStats(heroId, 1, ["tempered_edge"]);
      const greaves = deriveHeroStats(heroId, 1, ["fleetstep_greaves"]);

      expect(edge.basicDamage).toBeCloseTo(baseline.basicDamage * 1.2);
      expect(edge.moveSpeed).toBe(baseline.moveSpeed);
      expect(greaves.moveSpeed).toBeCloseTo(baseline.moveSpeed * 1.1);
      expect(greaves.basicDamage).toBe(baseline.basicDamage);
      expect(edge.maxHp).toBe(baseline.maxHp);
      expect(greaves.basicAttackInterval).toBe(baseline.basicAttackInterval);
    }
  });
});
