import { describe, expect, test } from "bun:test";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_SELL_VALUE,
  ARMORY_WARE_PRICE,
  ITEM_DEFINITIONS,
  ITEM_IDS,
  VENDOR_DEFINITIONS,
  effectiveStackCopies,
} from "../src/shared/armory-data";
import { ABILITY_IMPACT_DEFINITIONS } from "../src/shared/ability-impact";
import { HERO_IDS } from "../src/shared/game-data";
import { deriveHeroStats } from "../src/shared/hero-stats";
import type {
  AbilityImpactMetricId,
} from "../src/shared/ability-impact";
import type {
  AbilitySlot,
  EquipmentSlotIndex,
  EquipmentSlots,
  HeroId,
  ItemId,
  VendorId,
} from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";
import { completeArming } from "./support/defender-fixture";

function equipmentOf(itemId: ItemId, count: number): EquipmentSlots {
  return Array.from({ length: 6 }, (_, index) => index < count ? itemId : null) as EquipmentSlots;
}

function readyHero(game: GameWorld, heroId: HeroId = "defender"): void {
  expect(game.addPlayer("p1", "Gateward").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
  completeArming(game, ["p1"]);
}

function placeAt(game: GameWorld, vendorId: VendorId): void {
  game.players.get("p1")!.position = { ...VENDOR_DEFINITIONS[vendorId].position };
}

function fund(game: GameWorld, gold: number): void {
  game.players.get("p1")!.goldUnits = goldToUnits(gold);
}

function buy(game: GameWorld, vendorId: VendorId = "ironbound_forge") {
  return game.handleMessage("p1", {
    type: "buy_item",
    vendorId,
    itemId: "gateward_plate",
  });
}

function sell(game: GameWorld, vendorId: VendorId, slotIndex: EquipmentSlotIndex) {
  return game.handleMessage("p1", {
    type: "sell_item",
    vendorId,
    slotIndex,
    expectedItemId: "gateward_plate",
  });
}

describe("authoritative Gateward Plate", () => {
  test("is a distinct 60-gold Forge ware and every canonical item is stocked exactly once", () => {
    expect(ITEM_DEFINITIONS.gateward_plate).toMatchObject({
      id: "gateward_plate",
      name: "Gateward Plate",
      effectLabel: "+15 Max Health",
      primaryStatKey: "maxHp",
      price: 60,
      maxHealthFlat: 15,
      basicDamagePercent: 0,
      moveSpeedPercent: 0,
      abilityPowerPercent: 0,
      cooldownRecoveryPercent: 0,
    });
    expect(ARMORY_WARE_PRICE).toBe(60);
    expect(ARMORY_SELL_VALUE).toBe(30);
    expect(ARMORY_REFORGE_NET_COST).toBe(30);

    const stockedItems = Object.values(VENDOR_DEFINITIONS).flatMap((vendor) => vendor.itemIds);
    expect(stockedItems).toHaveLength(ITEM_IDS.length);
    expect(new Set(stockedItems)).toEqual(new Set(ITEM_IDS));
    for (const itemId of ITEM_IDS) {
      expect(stockedItems.filter((stockedItemId) => stockedItemId === itemId)).toHaveLength(1);
    }
    expect(VENDOR_DEFINITIONS.ironbound_forge.itemIds).toContain("gateward_plate");
    expect(VENDOR_DEFINITIONS.veilglass_reliquary.itemIds).not.toContain("gateward_plate");
  });

  test("adds exactly 15 flat Max Health per effective copy for every hero and changes no other stat", () => {
    const expectedHealthGains = [0, 15, 30, 45, 60, 75, 90];
    expect(Array.from({ length: 7 }, (_, count) => 15 * effectiveStackCopies(count))).toEqual(
      expectedHealthGains,
    );

    for (const heroId of HERO_IDS) {
      for (const level of [1, 5]) {
        const baseline = deriveHeroStats(heroId, level);
        for (let count = 0; count <= 6; count += 1) {
          const stats = deriveHeroStats(heroId, level, equipmentOf("gateward_plate", count));
          expect(stats.maxHp).toBe(baseline.maxHp + expectedHealthGains[count]!);
          expect({ ...stats, maxHp: baseline.maxHp }).toEqual(baseline);
        }
      }
    }
  });

  test("ordinary buying and selling at either physical shop preserve health percentage and exact economics", () => {
    for (const sellVendorId of Object.keys(VENDOR_DEFINITIONS) as VendorId[]) {
      const game = new GameWorld();
      readyHero(game);
      const state = game.players.get("p1")!;
      state.hp = 95;
      fund(game, ARMORY_WARE_PRICE);
      placeAt(game, "ironbound_forge");
      game.takePendingEvents();

      expect(buy(game).ok).toBe(true);
      let player = game.getSnapshot().players[0]!;
      expect(player.equipment).toEqual(["gateward_plate", null, null, null, null, null]);
      expect(player.stats.maxHp).toBe(165);
      expect(player.hp).toBeCloseTo(104.5);
      expect(player.hp / player.stats.maxHp).toBeCloseTo(95 / 150);
      expect(player.gold).toBe(0);
      expect(game.takePendingEvents()).toEqual([
        expect.objectContaining({
          kind: "item_purchased",
          itemId: "gateward_plate",
          vendorId: "ironbound_forge",
          slotIndex: 0,
          goldDelta: -60,
        }),
      ]);

      placeAt(game, sellVendorId);
      expect(sell(game, sellVendorId, 0).ok).toBe(true);
      player = game.getSnapshot().players[0]!;
      expect(player.equipment).toEqual([null, null, null, null, null, null]);
      expect(player.stats.maxHp).toBe(150);
      expect(player.hp).toBeCloseTo(95);
      expect(player.hp / player.stats.maxHp).toBeCloseTo(95 / 150);
      expect(player.gold).toBe(30);
      expect(game.takePendingEvents()).toEqual([
        expect.objectContaining({
          kind: "item_sold",
          itemId: "gateward_plate",
          vendorId: sellVendorId,
          slotIndex: 0,
          goldDelta: 30,
        }),
      ]);
    }
  });

  test("wrong-vendor purchase rejection is atomic", () => {
    const game = new GameWorld();
    readyHero(game);
    const state = game.players.get("p1")!;
    state.hp = 95;
    fund(game, ARMORY_WARE_PRICE);
    placeAt(game, "veilglass_reliquary");
    const before = game.getSnapshot().players[0]!;

    expect(buy(game, "veilglass_reliquary").code).toBe("ITEM_NOT_STOCKED");
    const after = game.getSnapshot().players[0]!;
    expect(after.gold).toBe(before.gold);
    expect(after.hp).toBe(before.hp);
    expect(after.stats).toEqual(before.stats);
    expect(after.equipment).toEqual(before.equipment);
  });

  test("a full-build reforge costs 30, replaces the exact slot, and preserves health percentage", () => {
    const game = new GameWorld();
    readyHero(game);
    const state = game.players.get("p1")!;
    state.equipment = equipmentOf("tempered_edge", 6);
    state.hp = 47.5;
    fund(game, ARMORY_REFORGE_NET_COST);
    placeAt(game, "ironbound_forge");
    game.takePendingEvents();

    expect(game.handleMessage("p1", {
      type: "replace_item",
      vendorId: "ironbound_forge",
      itemId: "gateward_plate",
      slotIndex: 2,
      expectedItemId: "tempered_edge",
    }).ok).toBe(true);

    const player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual([
      "tempered_edge",
      "tempered_edge",
      "gateward_plate",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
    ]);
    expect(player.stats.maxHp).toBe(165);
    expect(player.hp).toBeCloseTo(52.25);
    expect(player.hp / player.stats.maxHp).toBeCloseTo(47.5 / 150);
    expect(player.gold).toBe(0);
    expect(game.takePendingEvents()).toEqual([
      expect.objectContaining({
        kind: "item_purchased",
        itemId: "gateward_plate",
        replacedItemId: "tempered_edge",
        slotIndex: 2,
        goldDelta: -30,
      }),
    ]);
  });

  test("the fourth Plate remains linear and preserves health percentage", () => {
    const game = new GameWorld();
    readyHero(game);
    const state = game.players.get("p1")!;
    state.equipment = equipmentOf("gateward_plate", 3);
    state.hp = 97.5;
    fund(game, ARMORY_WARE_PRICE);
    placeAt(game, "ironbound_forge");
    game.takePendingEvents();

    expect(buy(game).ok).toBe(true);
    const player = game.getSnapshot().players[0]!;
    expect(player.stats.maxHp).toBe(210);
    expect(player.hp).toBeCloseTo(105);
    expect(player.hp / player.stats.maxHp).toBeCloseTo(0.5);
    expect(game.takePendingEvents()).toEqual([
      expect.objectContaining({ kind: "item_purchased", itemId: "gateward_plate" }),
    ]);
  });

  test("does not strengthen Defender ability power", () => {
    const game = new GameWorld();
    readyHero(game, "defender");
    const player = game.players.get("p1")!;
    player.equipment = equipmentOf("gateward_plate", 0);
    const baseline = game.getSnapshot().players[0]!.stats.abilityPower;
    player.equipment = equipmentOf("gateward_plate", 6);
    expect(game.getSnapshot().players[0]!.stats.abilityPower).toBeCloseTo(baseline);
  });
});
