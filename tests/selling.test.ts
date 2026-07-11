import { describe, expect, test } from "bun:test";
import {
  ARMORY_REFORGE_NET_COST,
  ARMORY_SELL_VALUE,
  ARMORY_WARE_PRICE,
  ITEM_IDS,
  VENDOR_DEFINITIONS,
  armoryReforgeNetCost,
  projectEquipmentRemoval,
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

function readyParty(game: GameWorld, heroIds: HeroId[]): void {
  for (const [index, heroId] of heroIds.entries()) {
    const playerId = `p${index + 1}`;
    expect(game.addPlayer(playerId, `Hero ${index + 1}`).ok).toBe(true);
    expect(game.claimHero(playerId, heroId).ok).toBe(true);
    expect(game.setReady(playerId, true).ok).toBe(true);
  }
  expect(game.startGame("p1").ok).toBe(true);
}

function readyHero(game: GameWorld, heroId: HeroId = "warden"): void {
  readyParty(game, [heroId]);
}

function equip(
  game: GameWorld,
  equipment: EquipmentSlots,
  playerId = "p1",
  gold = 0,
): void {
  const player = game.players.get(playerId)!;
  player.equipment = [...equipment] as EquipmentSlots;
  player.goldUnits = goldToUnits(gold);
}

function placeAt(game: GameWorld, vendorId: VendorId, playerId = "p1"): void {
  game.players.get(playerId)!.position = { ...VENDOR_DEFINITIONS[vendorId].position };
}

function sell(
  game: GameWorld,
  vendorId: VendorId,
  slotIndex: EquipmentSlotIndex,
  expectedItemId: ItemId,
  playerId = "p1",
) {
  return game.handleMessage(playerId, {
    type: "sell_item",
    vendorId,
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

describe("authoritative exact-slot item selling", () => {
  test("the 60 buy, 30 sell, and 30 net contract is bounded and protocol-strict", () => {
    expect(ARMORY_WARE_PRICE).toBe(60);
    expect(ARMORY_SELL_VALUE).toBe(30);
    expect(ARMORY_SELL_VALUE).toBeLessThan(ARMORY_WARE_PRICE);
    expect(ARMORY_REFORGE_NET_COST).toBe(30);
    expect(armoryReforgeNetCost(20)).toBe(0);
    expect(armoryReforgeNetCost(Number.NaN)).toBe(0);

    const base = {
      type: "sell_item",
      vendorId: "ironbound_forge",
      expectedItemId: "runebound_focus",
    } as const;
    for (const slotIndex of [0, 5] as EquipmentSlotIndex[]) {
      expect(parseClientMessage(JSON.stringify({ ...base, slotIndex }))).toEqual({ ...base, slotIndex });
    }
    for (const slotIndex of [-1, 6, 1.5, "0", null]) {
      expect(parseClientMessage(JSON.stringify({ ...base, slotIndex }))).toBeNull();
    }
    expect(parseClientMessage(JSON.stringify({ ...base, slotIndex: 0, expectedItemId: "unknown_item" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ ...base, slotIndex: 0, vendorId: "remote_catalog" }))).toBeNull();
  });

  test("every ware sells for exactly 30 at either physical shop and a stale replay cannot credit twice", () => {
    for (const vendorId of Object.keys(VENDOR_DEFINITIONS) as VendorId[]) {
      for (const itemId of ITEM_IDS) {
        const game = new GameWorld();
        readyHero(game);
        const equipment: EquipmentSlots = ["tempered_edge", null, itemId, null, null, null];
        equip(game, equipment);
        placeAt(game, vendorId);
        game.takePendingEvents();

        expect(sell(game, vendorId, 2, itemId).ok).toBe(true);
        expect(sell(game, vendorId, 2, itemId).code).toBe("EMPTY_EQUIPMENT_SLOT");
        const player = game.getSnapshot().players[0]!;
        expect(player.gold).toBe(ARMORY_SELL_VALUE);
        expect(player.equipment).toEqual(["tempered_edge", null, null, null, null, null]);
        expect(game.takePendingEvents()).toEqual([
          expect.objectContaining({
            kind: "item_sold",
            playerId: "p1",
            vendorId,
            itemId,
            slotIndex: 2,
            goldDelta: ARMORY_SELL_VALUE,
            position: VENDOR_DEFINITIONS[vendorId].position,
          }),
        ]);
      }
    }
  });

  test("inactive, downed, disconnected, remote, invalid, empty, and stale requests remain atomic", () => {
    const scenarios: Array<{
      code: string;
      start?: boolean;
      setup?: (game: GameWorld) => void;
      message?: ClientMessage;
    }> = [
      { code: "RUN_INACTIVE", start: false, setup: (game) => placeAt(game, "ironbound_forge") },
      { code: "PLAYER_DOWNED", setup: (game) => { placeAt(game, "ironbound_forge"); game.players.get("p1")!.downedFor = 1; } },
      { code: "PLAYER_DISCONNECTED", setup: (game) => { placeAt(game, "ironbound_forge"); game.setPlayerConnected("p1", false); } },
      { code: "VENDOR_UNKNOWN", message: { type: "sell_item", vendorId: "unknown_vendor", slotIndex: 0, expectedItemId: "tempered_edge" } as unknown as ClientMessage },
      { code: "ITEM_UNKNOWN", message: { type: "sell_item", vendorId: "ironbound_forge", slotIndex: 0, expectedItemId: "unknown_item" } as unknown as ClientMessage },
      { code: "OUT_OF_RANGE" },
      { code: "INVALID_EQUIPMENT_SLOT", setup: (game) => placeAt(game, "ironbound_forge"), message: { type: "sell_item", vendorId: "ironbound_forge", slotIndex: 6, expectedItemId: "tempered_edge" } as unknown as ClientMessage },
      { code: "EMPTY_EQUIPMENT_SLOT", setup: (game) => { placeAt(game, "ironbound_forge"); game.players.get("p1")!.equipment[0] = null; } },
      { code: "EQUIPMENT_CHANGED", setup: (game) => placeAt(game, "ironbound_forge"), message: { type: "sell_item", vendorId: "ironbound_forge", slotIndex: 0, expectedItemId: "runebound_focus" } },
    ];

    for (const scenario of scenarios) {
      const game = new GameWorld();
      expect(game.addPlayer("p1", "Hero 1").ok).toBe(true);
      expect(game.claimHero("p1", "warden").ok).toBe(true);
      equip(game, ["tempered_edge", null, null, null, null, null], "p1", 17);
      if (scenario.start !== false) {
        expect(game.setReady("p1", true).ok).toBe(true);
        expect(game.startGame("p1").ok).toBe(true);
        equip(game, ["tempered_edge", null, null, null, null, null], "p1", 17);
      }
      scenario.setup?.(game);
      game.takePendingEvents();
      const before = game.getSnapshot().players[0];
      const message = scenario.message ?? {
        type: "sell_item",
        vendorId: "ironbound_forge",
        slotIndex: 0,
        expectedItemId: "tempered_edge",
      };
      expect(game.handleMessage("p1", message).code).toBe(scenario.code);
      const after = game.getSnapshot().players[0];
      if (before && after) {
        expect(after.gold).toBe(before.gold);
        expect(after.equipment).toEqual(before.equipment);
        expect(after.cooldowns).toEqual(before.cooldowns);
      }
      expect(game.takePendingEvents()).toHaveLength(0);
    }
  });

  test("selling the fourth copy releases Attunement and Combat Stride while five to four stays Attuned", () => {
    const four = new GameWorld();
    readyHero(four);
    equip(four, ["fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", null, null]);
    placeAt(four, "veilglass_reliquary");
    four.takePendingEvents();
    expect(four.getSnapshot().players[0]!.stats.basicMoveRetention).toBeCloseTo(0.15);
    expect(sell(four, "veilglass_reliquary", 3, "fleetstep_greaves").ok).toBe(true);
    expect(four.getSnapshot().players[0]!.stats.basicMoveRetention).toBe(0);
    expect(four.takePendingEvents()[0]).toMatchObject({
      kind: "item_sold",
      attunementTransition: {
        itemId: "fleetstep_greaves",
        change: "lost",
        fromCount: 4,
        toCount: 3,
      },
    });

    const five = new GameWorld();
    readyHero(five);
    equip(five, ["fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", "fleetstep_greaves", null]);
    placeAt(five, "veilglass_reliquary");
    five.takePendingEvents();
    expect(sell(five, "veilglass_reliquary", 4, "fleetstep_greaves").ok).toBe(true);
    expect(five.getSnapshot().players[0]!.stats.basicMoveRetention).toBeCloseTo(0.15);
    expect(five.takePendingEvents()[0]!.attunementTransition).toBeUndefined();
  });

  test("selling Quickening preserves active ability progress without touching LMB or action timing", () => {
    const game = new GameWorld();
    readyHero(game);
    equip(game, ["quickening_sigil", "quickening_sigil", "quickening_sigil", "quickening_sigil", null, null]);
    placeAt(game, "ironbound_forge");
    const state = game.players.get("p1")!;
    Object.assign(state.cooldowns, { basic: 0.37, ability1: 4, ability2: 6, ability3: 8, ultimate: 10 });
    state.action = { kind: "ability2", phase: "windup", remaining: 0.19, duration: 0.26, direction: { x: 0, z: -1 } };
    const before = game.getSnapshot().players[0]!;
    const actionBefore = structuredClone(state.action);

    expect(sell(game, "ironbound_forge", 3, "quickening_sigil").ok).toBe(true);
    const after = game.getSnapshot().players[0]!;
    for (const slot of ["ability1", "ability2", "ability3", "ultimate"] as const) {
      expect(after.cooldowns[slot] * after.stats.cooldownRecovery)
        .toBeCloseTo(before.cooldowns[slot] * before.stats.cooldownRecovery);
    }
    expect(after.cooldowns.basic).toBe(0.37);
    expect(state.action).toEqual(actionBefore);
  });

  test("selling Focus never rewrites existing projectiles, delayed strikes, or Wraiths", () => {
    const focusBuild: EquipmentSlots = ["runebound_focus", null, null, null, null, null];

    const projectileGame = new GameWorld();
    readyHero(projectileGame, "riftstalker");
    equip(projectileGame, focusBuild);
    expect(projectileGame.levelAbility("p1", "ability2").ok).toBe(true);
    expect(projectileGame.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(projectileGame, 0.4);
    const projectileInternal = projectileGame as unknown as { projectiles: Map<string, { damage: number; kind: string }> };
    const splitboltDamage = () => [...projectileInternal.projectiles.values()].filter((projectile) => projectile.kind === "splitbolt").map((projectile) => projectile.damage);
    expectNumbers(splitboltDamage(), [54.05, 54.05, 54.05]);
    placeAt(projectileGame, "ironbound_forge");
    expect(sell(projectileGame, "ironbound_forge", 0, "runebound_focus").ok).toBe(true);
    expectNumbers(splitboltDamage(), [54.05, 54.05, 54.05]);

    const delayedGame = new GameWorld();
    readyHero(delayedGame, "ashcaller");
    equip(delayedGame, focusBuild);
    expect(delayedGame.levelAbility("p1", "ability3").ok).toBe(true);
    expect(delayedGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(delayedGame, 0.4);
    const delayedInternal = delayedGame as unknown as { delayed: Array<{ damage: number }> };
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [120.75]);
    placeAt(delayedGame, "ironbound_forge");
    expect(sell(delayedGame, "ironbound_forge", 0, "runebound_focus").ok).toBe(true);
    expectNumbers(delayedInternal.delayed.map((strike) => strike.damage), [120.75]);

    const summonGame = new GameWorld();
    readyHero(summonGame, "gravebinder");
    equip(summonGame, focusBuild);
    expect(summonGame.levelAbility("p1", "ability3").ok).toBe(true);
    expect(summonGame.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(summonGame, 0.4);
    const summonInternal = summonGame as unknown as { summons: Map<string, { damage: number }> };
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [27.6, 27.6, 27.6]);
    placeAt(summonGame, "ironbound_forge");
    expect(sell(summonGame, "ironbound_forge", 0, "runebound_focus").ok).toBe(true);
    expectNumbers([...summonInternal.summons.values()].map((summon) => summon.damage), [27.6, 27.6, 27.6]);
  });

  test("two heroes sell independently at opposite shops", () => {
    const game = new GameWorld();
    readyParty(game, [HERO_IDS[0]!, HERO_IDS[1]!]);
    equip(game, ["tempered_edge", null, null, null, null, null], "p1");
    equip(game, ["runebound_focus", null, null, null, null, null], "p2");
    placeAt(game, "ironbound_forge", "p1");
    placeAt(game, "veilglass_reliquary", "p2");
    game.takePendingEvents();

    expect(sell(game, "ironbound_forge", 0, "tempered_edge", "p1").ok).toBe(true);
    expect(sell(game, "veilglass_reliquary", 0, "runebound_focus", "p2").ok).toBe(true);
    const snapshot = game.getSnapshot();
    for (const playerId of ["p1", "p2"]) {
      const player = snapshot.players.find((candidate) => candidate.id === playerId)!;
      expect(player.gold).toBe(ARMORY_SELL_VALUE);
      expect(player.equipment).toEqual([null, null, null, null, null, null]);
    }
    expect(game.takePendingEvents().filter((event) => event.kind === "item_sold")).toHaveLength(2);
  });

  test("the canonical removal projection clears only the confirmed slot", () => {
    const equipment: EquipmentSlots = ["tempered_edge", "runebound_focus", null, null, null, null];
    expect(projectEquipmentRemoval(equipment, 1, "runebound_focus")).toEqual({
      equipment: ["tempered_edge", null, null, null, null, null],
      slotIndex: 1,
      removedItemId: "runebound_focus",
    });
    expect(projectEquipmentRemoval(equipment, 1, "tempered_edge")).toBeNull();
    expect(projectEquipmentRemoval(equipment, 2)).toBeNull();
  });
});
