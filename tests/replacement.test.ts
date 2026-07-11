import { describe, expect, test } from "bun:test";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_SELL_VALUE,
  ARMORY_WARE_PRICE,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import { HERO_IDS } from "../src/shared/game-data";
import {
  parseClientMessage,
  type ClientMessage,
  type EquipmentSlotIndex,
  type EquipmentSlots,
  type HeroId,
  type ItemId,
  type VendorId,
} from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";

const sixFocuses: EquipmentSlots = [
  "runebound_focus",
  "runebound_focus",
  "runebound_focus",
  "runebound_focus",
  "runebound_focus",
  "runebound_focus",
];

function readyParty(game: GameWorld, heroIds: HeroId[]): void {
  for (const [index, heroId] of heroIds.entries()) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.claimHero(playerId, heroId).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
}

function readyHero(game: GameWorld, heroId: HeroId): void {
  readyParty(game, [heroId]);
}

function equip(
  game: GameWorld,
  equipment: EquipmentSlots,
  playerId = "p1",
  gold = ARMORY_REFORGE_NET_COST,
): void {
  const player = game.players.get(playerId)!;
  player.equipment = [...equipment] as EquipmentSlots;
  player.goldUnits = goldToUnits(gold);
}

function placeAt(game: GameWorld, vendorId: VendorId, playerId = "p1"): void {
  game.players.get(playerId)!.position = { ...VENDOR_DEFINITIONS[vendorId].position };
}

function replace(
  game: GameWorld,
  vendorId: VendorId,
  itemId: ItemId,
  slotIndex: EquipmentSlotIndex,
  expectedItemId: ItemId,
  playerId = "p1",
) {
  return game.handleMessage(playerId, {
    type: "replace_item",
    vendorId,
    itemId,
    slotIndex,
    expectedItemId,
  });
}

function advance(game: GameWorld, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
}

function expectNumbers(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [index, value] of actual.entries()) expect(value).toBeCloseTo(expected[index]!);
}

describe("authoritative full-build item replacement", () => {
  test("protocol requires a known expected item and an integer slot from zero through five", () => {
    const base = {
      type: "replace_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
      expectedItemId: "runebound_focus",
    } as const;

    for (const slotIndex of [0, 5] as EquipmentSlotIndex[]) {
      expect(parseClientMessage(JSON.stringify({ ...base, slotIndex }))).toEqual({
        ...base,
        slotIndex,
      });
    }
    for (const slotIndex of [-1, 6, 1.5, "0", null]) {
      expect(parseClientMessage(JSON.stringify({ ...base, slotIndex }))).toBeNull();
    }
    expect(parseClientMessage(JSON.stringify({ ...base, slotIndex: 0, expectedItemId: "unknown_item" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({
      type: "replace_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
      slotIndex: 0,
    }))).toBeNull();
  });

  test("a 30-gold net reforge changes exactly the selected slot and emits one atomic receipt", () => {
    expect(ARMORY_WARE_PRICE - ARMORY_SELL_VALUE).toBe(ARMORY_REFORGE_NET_COST);
    const game = new GameWorld();
    readyHero(game, "warden");
    equip(game, sixFocuses);
    placeAt(game, "ironbound_forge");
    game.takePendingEvents();

    expect(replace(game, "ironbound_forge", "tempered_edge", 3, "runebound_focus").ok).toBe(true);
    expect(replace(game, "ironbound_forge", "tempered_edge", 3, "runebound_focus").code)
      .toBe("EQUIPMENT_CHANGED");

    const player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(0);
    expect(player.equipment).toEqual([
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "tempered_edge",
      "runebound_focus",
      "runebound_focus",
    ]);
    expect(player.equipment).toHaveLength(6);
    expect(player.stats.basicDamage).toBeCloseTo(36);
    expect(player.stats.abilityPower).toBeCloseTo(1.9);

    const pendingEvents = game.takePendingEvents();
    expect(pendingEvents.filter((event) => event.kind === "item_sold")).toHaveLength(0);
    const events = pendingEvents.filter((event) => event.kind === "item_purchased");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "item_purchased",
      text: "Hero 1 replaced Runebound Focus with Tempered Edge at Ironbound Forge.",
      playerId: "p1",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
      slotIndex: 3,
      replacedItemId: "runebound_focus",
      goldDelta: -ARMORY_REFORGE_NET_COST,
      position: VENDOR_DEFINITIONS.ironbound_forge.position,
    });
  });

  test("replacement is unavailable before six slots are filled and normal buying stays non-destructive", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    const partial: EquipmentSlots = ["runebound_focus", null, null, null, null, null];
    equip(game, partial);
    placeAt(game, "ironbound_forge");
    game.takePendingEvents();

    expect(replace(game, "ironbound_forge", "tempered_edge", 0, "runebound_focus").code)
      .toBe("REPLACEMENT_NOT_REQUIRED");
    let player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(ARMORY_REFORGE_NET_COST);
    expect(player.equipment).toEqual(partial);
    expect(game.takePendingEvents().filter((event) => event.kind === "item_purchased")).toHaveLength(0);

    equip(game, sixFocuses, "p1", ARMORY_WARE_PRICE);
    expect(game.handleMessage("p1", {
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
    }).code).toBe("EQUIPMENT_FULL");
    player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(ARMORY_WARE_PRICE);
    expect(player.equipment).toEqual(sixFocuses);
  });

  test("stale selection, invalid slot, and same-item confirmations never charge or mutate", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    equip(game, sixFocuses, "p1", 3 * ARMORY_WARE_PRICE);
    placeAt(game, "ironbound_forge");
    game.takePendingEvents();
    const before = game.getSnapshot().players[0]!;

    expect(replace(game, "ironbound_forge", "tempered_edge", 2, "quickening_sigil").code)
      .toBe("EQUIPMENT_CHANGED");
    expect(game.handleMessage("p1", {
      type: "replace_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
      slotIndex: 6,
      expectedItemId: "runebound_focus",
    } as unknown as ClientMessage).code).toBe("INVALID_EQUIPMENT_SLOT");
    expect(replace(game, "veilglass_reliquary", "runebound_focus", 2, "runebound_focus").code)
      .toBe("OUT_OF_RANGE");
    placeAt(game, "veilglass_reliquary");
    expect(replace(game, "veilglass_reliquary", "runebound_focus", 2, "runebound_focus").code)
      .toBe("SAME_ITEM");

    const after = game.getSnapshot().players[0]!;
    expect(after.gold).toBe(before.gold);
    expect(after.equipment).toEqual(before.equipment);
    expect(after.stats).toEqual(before.stats);
    expect(after.cooldowns).toEqual(before.cooldowns);
    expect(game.takePendingEvents().filter((event) => event.kind === "item_purchased")).toHaveLength(0);
  });

  test("phase, living state, vendor, stock, range, and funds are all enforced atomically", () => {
    const scenarios: Array<{
      code: string;
      setup: (game: GameWorld) => void;
      message?: ClientMessage;
      start?: boolean;
    }> = [
      { code: "RUN_INACTIVE", start: false, setup: (game) => placeAt(game, "ironbound_forge") },
      {
        code: "PLAYER_DOWNED",
        setup: (game) => {
          placeAt(game, "ironbound_forge");
          game.players.get("p1")!.downedFor = 1;
        },
      },
      {
        code: "VENDOR_UNKNOWN",
        setup: () => {},
        message: {
          type: "replace_item",
          vendorId: "unknown_vendor",
          itemId: "tempered_edge",
          slotIndex: 0,
          expectedItemId: "runebound_focus",
        } as unknown as ClientMessage,
      },
      {
        code: "ITEM_UNKNOWN",
        setup: () => {},
        message: {
          type: "replace_item",
          vendorId: "ironbound_forge",
          itemId: "unknown_item",
          slotIndex: 0,
          expectedItemId: "runebound_focus",
        } as unknown as ClientMessage,
      },
      {
        code: "ITEM_UNKNOWN",
        setup: (game) => placeAt(game, "ironbound_forge"),
        message: {
          type: "replace_item",
          vendorId: "ironbound_forge",
          itemId: "tempered_edge",
          slotIndex: 0,
          expectedItemId: "unknown_item",
        } as unknown as ClientMessage,
      },
      {
        code: "ITEM_NOT_STOCKED",
        setup: (game) => placeAt(game, "ironbound_forge"),
        message: {
          type: "replace_item",
          vendorId: "ironbound_forge",
          itemId: "runebound_focus",
          slotIndex: 0,
          expectedItemId: "runebound_focus",
        },
      },
      { code: "OUT_OF_RANGE", setup: () => {} },
      {
        code: "INSUFFICIENT_GOLD",
        setup: (game) => {
          placeAt(game, "ironbound_forge");
          game.players.get("p1")!.goldUnits = goldToUnits(ARMORY_REFORGE_NET_COST) - 1;
        },
      },
    ];

    for (const scenario of scenarios) {
      const game = new GameWorld();
      expect(game.addPlayer("p1", "Hero 1").ok).toBe(true);
      expect(game.claimHero("p1", "warden").ok).toBe(true);
      expect(game.setReady("p1", true).ok).toBe(true);
      if (scenario.start !== false) expect(game.startGame("p1").ok).toBe(true);
      equip(game, sixFocuses);
      scenario.setup(game);
      game.takePendingEvents();
      const before = game.getSnapshot().players[0]!;
      const message = scenario.message ?? {
        type: "replace_item",
        vendorId: "ironbound_forge",
        itemId: "tempered_edge",
        slotIndex: 0,
        expectedItemId: "runebound_focus",
      };

      expect(game.handleMessage("p1", message).code).toBe(scenario.code);
      const after = game.getSnapshot().players[0]!;
      expect(after.gold).toBe(before.gold);
      expect(after.equipment).toEqual(before.equipment);
      expect(after.stats).toEqual(before.stats);
      expect(after.cooldowns).toEqual(before.cooldowns);
      expect(game.takePendingEvents().filter((event) => event.kind === "item_purchased")).toHaveLength(0);
    }
  });

  test("duplicates remain unrestricted while replacing a slot with its current item is rejected", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    const equipment: EquipmentSlots = [
      "tempered_edge",
      "runebound_focus",
      "fleetstep_greaves",
      "runebound_focus",
      "fleetstep_greaves",
      "runebound_focus",
    ];
    equip(game, equipment, "p1", 2 * ARMORY_REFORGE_NET_COST);
    placeAt(game, "ironbound_forge");

    expect(replace(game, "ironbound_forge", "tempered_edge", 0, "tempered_edge").code).toBe("SAME_ITEM");
    expect(replace(game, "ironbound_forge", "tempered_edge", 1, "runebound_focus").ok).toBe(true);
    const player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(ARMORY_REFORGE_NET_COST);
    expect(player.equipment.filter((itemId) => itemId === "tempered_edge")).toHaveLength(2);
    expect(player.equipment).toHaveLength(6);
  });

  test("Quickening replacement preserves Q E R F progress in both directions without touching LMB or action timing", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    const equipment: EquipmentSlots = [
      "quickening_sigil",
      "quickening_sigil",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
    ];
    equip(game, equipment, "p1", 2 * ARMORY_REFORGE_NET_COST);
    placeAt(game, "ironbound_forge");
    const state = game.players.get("p1")!;
    Object.assign(state.cooldowns, {
      basic: 0.37,
      ability1: 0,
      ability2: 4,
      ability3: 6,
      ultimate: 10,
    });
    state.action = {
      kind: "ability2",
      phase: "windup",
      remaining: 0.19,
      duration: 0.26,
      direction: { x: 0, z: -1 },
    };
    const actionBefore = structuredClone(state.action);

    expect(replace(game, "ironbound_forge", "tempered_edge", 0, "quickening_sigil").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.stats.cooldownRecovery).toBeCloseTo(1.15);
    expect(state.cooldowns.ability1).toBe(0);
    expect(state.cooldowns.ability2).toBeCloseTo(4 * 1.3 / 1.15);
    expect(state.cooldowns.ability3).toBeCloseTo(6 * 1.3 / 1.15);
    expect(state.cooldowns.ultimate).toBeCloseTo(10 * 1.3 / 1.15);
    expect(state.cooldowns.basic).toBe(0.37);
    expect(state.action).toEqual(actionBefore);

    placeAt(game, "veilglass_reliquary");
    expect(replace(game, "veilglass_reliquary", "quickening_sigil", 0, "tempered_edge").ok).toBe(true);
    expect(game.getSnapshot().players[0]!.stats.cooldownRecovery).toBeCloseTo(1.3);
    expect(state.cooldowns.ability1).toBe(0);
    expect(state.cooldowns.ability2).toBeCloseTo(4);
    expect(state.cooldowns.ability3).toBeCloseTo(6);
    expect(state.cooldowns.ultimate).toBeCloseTo(10);
    expect(state.cooldowns.basic).toBe(0.37);
    expect(state.action).toEqual(actionBefore);
  });

  test("removing Focus never rewrites existing projectiles, delayed strikes, or summons", () => {
    const focusBuild: EquipmentSlots = [
      "runebound_focus",
      "fleetstep_greaves",
      "fleetstep_greaves",
      "fleetstep_greaves",
      "fleetstep_greaves",
      "fleetstep_greaves",
    ];

    const projectileGame = new GameWorld();
    readyHero(projectileGame, "riftstalker");
    equip(projectileGame, focusBuild);
    expect(projectileGame.levelAbility("p1", "ability2").ok).toBe(true);
    expect(projectileGame.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(projectileGame, 0.4);
    const projectileInternal = projectileGame as unknown as {
      projectiles: Map<string, { damage: number; kind: string }>;
    };
    const splitboltDamage = () => [...projectileInternal.projectiles.values()]
      .filter((projectile) => projectile.kind === "splitbolt")
      .map((projectile) => projectile.damage);
    expectNumbers(splitboltDamage(), [54.05, 54.05, 54.05]);
    placeAt(projectileGame, "ironbound_forge");
    expect(replace(projectileGame, "ironbound_forge", "tempered_edge", 0, "runebound_focus").ok).toBe(true);
    expectNumbers(splitboltDamage(), [54.05, 54.05, 54.05]);
    const projectilePlayer = projectileGame.players.get("p1")!;
    projectilePlayer.cooldowns.ability2 = 0;
    projectilePlayer.action = null;
    expect(projectileGame.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(projectileGame, 0.4);
    expectNumbers(splitboltDamage(), [54.05, 54.05, 54.05, 47, 47, 47]);

    const delayedGame = new GameWorld();
    readyHero(delayedGame, "ashcaller");
    equip(delayedGame, focusBuild);
    expect(delayedGame.levelAbility("p1", "ability3").ok).toBe(true);
    expect(delayedGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(delayedGame, 0.4);
    const delayedInternal = delayedGame as unknown as { delayed: Array<{ damage: number }> };
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [120.75]);
    placeAt(delayedGame, "ironbound_forge");
    expect(replace(delayedGame, "ironbound_forge", "tempered_edge", 0, "runebound_focus").ok).toBe(true);
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [120.75]);
    const delayedPlayer = delayedGame.players.get("p1")!;
    delayedPlayer.cooldowns.ability3 = 0;
    delayedPlayer.action = null;
    expect(delayedGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(delayedGame, 0.4);
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [120.75, 105]);

    const summonGame = new GameWorld();
    readyHero(summonGame, "gravebinder");
    equip(summonGame, focusBuild);
    expect(summonGame.levelAbility("p1", "ability3").ok).toBe(true);
    expect(summonGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(summonGame, 0.4);
    const summonInternal = summonGame as unknown as { summons: Map<string, { damage: number }> };
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [27.6, 27.6, 27.6]);
    placeAt(summonGame, "ironbound_forge");
    expect(replace(summonGame, "ironbound_forge", "tempered_edge", 0, "runebound_focus").ok).toBe(true);
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [27.6, 27.6, 27.6]);
    const summonPlayer = summonGame.players.get("p1")!;
    summonPlayer.cooldowns.ability3 = 0;
    summonPlayer.action = null;
    expect(summonGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(summonGame, 0.4);
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [
      27.6,
      27.6,
      24,
      24,
      24,
    ]);
  });

  test("two heroes can replace at different vendors without sharing wallets, slots, or stats", () => {
    const game = new GameWorld();
    readyParty(game, [HERO_IDS[0]!, HERO_IDS[1]!]);
    const sixEdges: EquipmentSlots = [
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
      "tempered_edge",
    ];
    equip(game, sixFocuses, "p1");
    equip(game, sixEdges, "p2");
    placeAt(game, "ironbound_forge", "p1");
    placeAt(game, "veilglass_reliquary", "p2");
    game.takePendingEvents();

    expect(replace(game, "ironbound_forge", "tempered_edge", 2, "runebound_focus", "p1").ok).toBe(true);
    expect(replace(game, "veilglass_reliquary", "runebound_focus", 4, "tempered_edge", "p2").ok).toBe(true);

    const snapshot = game.getSnapshot();
    const forgeBuyer = snapshot.players.find((player) => player.id === "p1")!;
    const reliquaryBuyer = snapshot.players.find((player) => player.id === "p2")!;
    expect(forgeBuyer.gold).toBe(0);
    expect(reliquaryBuyer.gold).toBe(0);
    expect(forgeBuyer.equipment[2]).toBe("tempered_edge");
    expect(forgeBuyer.equipment.filter((itemId) => itemId === "runebound_focus")).toHaveLength(5);
    expect(reliquaryBuyer.equipment[4]).toBe("runebound_focus");
    expect(reliquaryBuyer.equipment.filter((itemId) => itemId === "tempered_edge")).toHaveLength(5);
    expect(forgeBuyer.stats.basicDamage).toBeCloseTo(36);
    expect(forgeBuyer.stats.abilityPower).toBeCloseTo(1.9);
    expect(reliquaryBuyer.stats.basicDamage).toBeCloseTo(41.8);
    expect(reliquaryBuyer.stats.abilityPower).toBeCloseTo(1.15);
    const events = game.takePendingEvents().filter((event) => event.kind === "item_purchased");
    expect(events).toHaveLength(2);
    expect(events.map((event) => [event.playerId, event.slotIndex, event.replacedItemId])).toEqual([
      ["p1", 2, "runebound_focus"],
      ["p2", 4, "tempered_edge"],
    ]);
  });
});
