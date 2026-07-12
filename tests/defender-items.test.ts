import { describe, expect, test } from "bun:test";
import { GameWorld } from "../src/server/game";
import { goldToUnits } from "../src/server/economy";
import {
  ITEM_DEFINITIONS,
  VENDOR_DEFINITIONS,
  deriveEquipmentModifiers,
  effectiveStackCopies,
} from "../src/shared/armory-data";
import type { ItemId, VendorId } from "../src/shared/protocol";

function activeDefender(): GameWorld {
  const game = new GameWorld({ accelerated: true });
  expect(game.addPlayer("p1", "Item Defender").ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
  expect(game.handleMessage("p1", { type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" }).ok).toBe(true);
  for (let index = 0; index < 26; index += 1) game.update(0.1);
  return game;
}

function fundAndPlace(game: GameWorld, vendorId: VendorId, gold = 600): void {
  const state = game.players.get("p1")!;
  state.goldUnits = goldToUnits(gold);
  state.position = { ...VENDOR_DEFINITIONS[vendorId].position };
}

function buy(game: GameWorld, vendorId: VendorId, itemId: ItemId) {
  return game.handleMessage("p1", { type: "buy_item", vendorId, itemId });
}

describe("declarative six-slot Defender items", () => {
  test("every item owns one declarative modifier and raw copies remain linear", () => {
    for (const item of Object.values(ITEM_DEFINITIONS)) expect(item.modifiers.length).toBeGreaterThan(0);
    expect(effectiveStackCopies(4)).toBe(4);
    expect(effectiveStackCopies(6)).toBe(6);
    expect(deriveEquipmentModifiers(["tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge"]).basicDamagePercent).toBeCloseTo(0.8);
  });

  test("physical vendor range, stock, funds, and six-slot capacity remain atomic", () => {
    const game = activeDefender();
    expect(buy(game, "ironbound_forge", "tempered_edge")).toMatchObject({ ok: false, code: "OUT_OF_RANGE" });
    fundAndPlace(game, "ironbound_forge", 59);
    expect(buy(game, "ironbound_forge", "tempered_edge")).toMatchObject({ ok: false, code: "INSUFFICIENT_GOLD" });
    fundAndPlace(game, "ironbound_forge", 360);
    for (let index = 0; index < 6; index += 1) expect(buy(game, "ironbound_forge", "tempered_edge").ok).toBe(true);
    const full = game.getSnapshot().players[0]!;
    expect(full.equipment).toEqual(["tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge", "tempered_edge"]);
    expect(full.stats.basicDamage).toBeCloseTo(66);
    game.players.get("p1")!.goldUnits = goldToUnits(60);
    expect(buy(game, "ironbound_forge", "tempered_edge")).toMatchObject({ ok: false, code: "EQUIPMENT_FULL" });
    const serialized = JSON.stringify({ snapshot: game.getSnapshot(), events: game.takePendingEvents() });
    expect(serialized.toLowerCase()).not.toContain("attunement");
    expect(serialized.toLowerCase()).not.toContain("attuned");
  });

  test("exact-slot replacement and sale preserve the 60/30 transaction contract", () => {
    const game = activeDefender();
    fundAndPlace(game, "ironbound_forge", 360);
    for (let index = 0; index < 6; index += 1) expect(buy(game, "ironbound_forge", "tempered_edge").ok).toBe(true);
    fundAndPlace(game, "veilglass_reliquary", 30);
    expect(game.handleMessage("p1", {
      type: "replace_item",
      vendorId: "veilglass_reliquary",
      itemId: "runebound_focus",
      slotIndex: 2,
      expectedItemId: "tempered_edge",
    }).ok).toBe(true);
    let player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(0);
    expect(player.equipment[2]).toBe("runebound_focus");
    expect(game.handleMessage("p1", {
      type: "sell_item",
      vendorId: "veilglass_reliquary",
      slotIndex: 2,
      expectedItemId: "tempered_edge",
    })).toMatchObject({ ok: false, code: "EQUIPMENT_CHANGED" });
    expect(game.handleMessage("p1", {
      type: "sell_item",
      vendorId: "veilglass_reliquary",
      slotIndex: 2,
      expectedItemId: "runebound_focus",
    }).ok).toBe(true);
    player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(30);
    expect(player.equipment[2]).toBeNull();
  });

  test("Max Health trades preserve health ratio and item state remains personal", () => {
    const game = new GameWorld({ accelerated: true });
    for (const id of ["p1", "p2"]) {
      game.addPlayer(id, id);
      game.setReady(id, true);
    }
    game.startGame("p1");
    for (const id of ["p1", "p2"]) game.handleMessage(id, { type: "buy_weapon", arsenalId: "citadel_arsenal", weaponId: "greatsword" });
    for (let index = 0; index < 26; index += 1) game.update(0.1);
    const buyer = game.players.get("p1")!;
    buyer.hp = 75;
    buyer.goldUnits = goldToUnits(60);
    buyer.position = { ...VENDOR_DEFINITIONS.ironbound_forge.position };
    expect(buy(game, "ironbound_forge", "gateward_plate").ok).toBe(true);
    const [accepted, ally] = game.getSnapshot().players;
    expect(accepted!.stats.maxHp).toBe(165);
    expect(accepted!.hp / accepted!.stats.maxHp).toBeCloseTo(0.5);
    expect(ally!.equipment).toEqual([null, null, null, null, null, null]);
  });

  test("run reset removes items and accepted mastery/item cooldown state", () => {
    const game = activeDefender();
    fundAndPlace(game, "ironbound_forge", 60);
    expect(buy(game, "ironbound_forge", "fleetstep_greaves").ok).toBe(true);
    game.damageNexus(800);
    expect(game.resetRun("p1").ok).toBe(true);
    const reset = game.getSnapshot().players[0]!;
    expect(reset.equipment).toEqual([null, null, null, null, null, null]);
    expect(reset.weaponId).toBe("practice");
    expect(reset.mastery).toBeNull();
    expect(reset.cooldownsBySkillId).toEqual({});
  });
});
