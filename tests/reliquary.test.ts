import { describe, expect, test } from "bun:test";
import {
  ARMORY_WARE_PRICE,
  ITEM_DEFINITIONS,
  VENDOR_DEFINITIONS,
} from "../src/shared/armory-data";
import { HERO_IDS } from "../src/shared/game-data";
import { parseClientMessage, type EquipmentSlots, type ItemId, type VendorId } from "../src/shared/protocol";
import { goldToUnits } from "../src/server/economy";
import { GameWorld } from "../src/server/game";
import { deriveHeroStats } from "../src/server/hero-stats";

const reliquary = VENDOR_DEFINITIONS.veilglass_reliquary;
const forge = VENDOR_DEFINITIONS.ironbound_forge;

function readyHero(game: GameWorld, heroId: "warden" | "riftstalker" | "ashcaller" | "gravebinder"): void {
  expect(game.addPlayer("p1", "Ada").ok).toBe(true);
  expect(game.claimHero("p1", heroId).ok).toBe(true);
  expect(game.setReady("p1", true).ok).toBe(true);
  expect(game.startGame("p1").ok).toBe(true);
}

function placeAt(game: GameWorld, vendorId: VendorId): void {
  game.players.get("p1")!.position = { ...VENDOR_DEFINITIONS[vendorId].position };
}

function fund(game: GameWorld, gold: number): void {
  game.players.get("p1")!.goldUnits = goldToUnits(gold);
}

function buy(game: GameWorld, vendorId: VendorId, itemId: ItemId) {
  return game.handleMessage("p1", { type: "buy_item", vendorId, itemId });
}

function advance(game: GameWorld, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
}

function expectDamages(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [index, damage] of actual.entries()) expect(damage).toBeCloseTo(expected[index]!);
}

describe("authoritative Veilglass Reliquary", () => {
  test("canonical data and protocol expose the locked vendor and wares", () => {
    expect(reliquary).toEqual({
      id: "veilglass_reliquary",
      name: "Veilglass Reliquary",
      position: { x: 20, z: -14.5 },
      interactionRadius: 7,
      itemIds: ["runebound_focus", "quickening_sigil"],
    });
    expect(ITEM_DEFINITIONS.runebound_focus).toMatchObject({
      price: ARMORY_WARE_PRICE,
      description: "A caged star that sharpens every invocation.",
      effectLabel: "+15% Skill Power",
      abilityPowerPercent: 0.15,
    });
    expect(ITEM_DEFINITIONS.quickening_sigil).toMatchObject({
      price: ARMORY_WARE_PRICE,
      description: "A sliver of time held under glass.",
      effectLabel: "+15% Cooldown Speed",
      cooldownRecoveryPercent: 0.15,
    });
    expect(parseClientMessage(JSON.stringify({
      type: "buy_item",
      vendorId: "veilglass_reliquary",
      itemId: "runebound_focus",
    }))).toEqual({ type: "buy_item", vendorId: "veilglass_reliquary", itemId: "runebound_focus" });
  });

  test("each physical vendor rejects the other vendor's stock atomically", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    fund(game, 2 * ARMORY_WARE_PRICE);

    placeAt(game, "veilglass_reliquary");
    expect(buy(game, "veilglass_reliquary", "tempered_edge").code).toBe("ITEM_NOT_STOCKED");
    placeAt(game, "ironbound_forge");
    expect(buy(game, "ironbound_forge", "runebound_focus").code).toBe("ITEM_NOT_STOCKED");

    const player = game.getSnapshot().players[0]!;
    expect(player.gold).toBe(2 * ARMORY_WARE_PRICE);
    expect(player.equipment.every((itemId) => itemId === null)).toBe(true);
  });

  test("both new stats derive additively from base for every hero and every socket mix", () => {
    const sixFocuses = Array<ItemId>(6).fill("runebound_focus");
    const sixSigils = Array<ItemId>(6).fill("quickening_sigil");
    const mixed: ItemId[] = [
      "runebound_focus",
      "quickening_sigil",
      "runebound_focus",
      "quickening_sigil",
      "runebound_focus",
      "quickening_sigil",
    ];

    for (const heroId of HERO_IDS) {
      const baseline = deriveHeroStats(heroId, 1);
      const focus = deriveHeroStats(heroId, 1, ["runebound_focus"]);
      const sigil = deriveHeroStats(heroId, 1, ["quickening_sigil"]);
      expect(focus).toEqual({ ...baseline, abilityPower: 1.15 });
      expect(sigil).toEqual({ ...baseline, cooldownRecovery: 1.15 });
      expect(deriveHeroStats(heroId, 1, sixFocuses).abilityPower).toBeCloseTo(2.05);
      expect(deriveHeroStats(heroId, 1, sixSigils).cooldownRecovery).toBeCloseTo(2.05);
      expect(deriveHeroStats(heroId, 1, mixed)).toEqual({
        ...baseline,
        abilityPower: 1.45,
        cooldownRecovery: 1.45,
      });
    }
  });

  test("Quickening Sigils preserve Q E R F cooldown progress, stack, and never alter basic cadence", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    placeAt(game, "veilglass_reliquary");
    fund(game, 2 * ARMORY_WARE_PRICE);
    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);

    const state = game.players.get("p1")!;
    const remaining = {
      ability1: 2,
      ability2: 4,
      ability3: 6,
      ultimate: 10,
    } as const;
    Object.assign(state.cooldowns, remaining);
    state.cooldowns.basic = 0.37;
    expect(buy(game, "veilglass_reliquary", "quickening_sigil").ok).toBe(true);
    for (const [slot, value] of Object.entries(remaining)) {
      expect(state.cooldowns[slot as keyof typeof remaining]).toBeCloseTo(value / 1.15);
    }
    expect(state.cooldowns.basic).toBe(0.37);

    expect(buy(game, "veilglass_reliquary", "quickening_sigil").ok).toBe(true);
    for (const [slot, value] of Object.entries(remaining)) {
      expect(state.cooldowns[slot as keyof typeof remaining]).toBeCloseTo(value / 1.3);
    }
    expect(state.cooldowns.basic).toBe(0.37);
    expect(game.getSnapshot().players[0]!.stats.cooldownRecovery).toBeCloseTo(1.3);

    state.cooldowns.ability2 = 0;
    state.action = null;
    expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    const cast = game.getSnapshot().players[0]!;
    expect(cast.cooldowns.ability2).toBeCloseTo(8 / 1.3);
    expect(cast.action?.duration).toBe(0.26);
    expect(cast.stats.basicAttackInterval).toBe(0.52);
  });

  test("Runebound Focus scales both ability damage and defensive magnitude", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    placeAt(game, "veilglass_reliquary");
    fund(game, ARMORY_WARE_PRICE);
    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expect(game.levelAbility("p1", "ability3").ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(game, 0.4);

    const player = game.getSnapshot().players[0]!;
    expect(player.stats.abilityPower).toBe(1.15);
    expect(player.barrier).toBeCloseTo(34.5);
  });

  test("Runebound Focus increases a real authoritative Warden ability hit", () => {
    function rupturingArcDamage(withFocus: boolean): number {
      const game = new GameWorld({ accelerated: true, timings: { pushDuration: 180 }, random: () => 0.5, enemyCap: 1 });
      readyHero(game, "warden");
      expect(game.debugAdvance().ok).toBe(true);
      expect(game.debugAdvance().ok).toBe(true);
      expect(game.getSnapshot().phase).toBe("push");

      if (withFocus) {
        placeAt(game, "veilglass_reliquary");
        expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
      }
      const rift = game.getSnapshot().riftHeart;
      game.players.get("p1")!.position = { x: rift.position.x, z: rift.position.z + 24 };
      expect(game.levelAbility("p1", "ability2").ok).toBe(true);
      const before = game.getSnapshot().riftHeart.hp;
      expect(game.handleMessage("p1", {
        type: "input",
        seq: 1,
        move: { x: 0, z: 0 },
        aim: { x: 0, z: -1 },
        attacking: false,
      }).ok).toBe(true);
      expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
      advance(game, 0.3);
      return before - game.getSnapshot().riftHeart.hp;
    }

    expect(rupturingArcDamage(false)).toBeCloseTo(72);
    expect(rupturingArcDamage(true)).toBeCloseTo(82.8);
  });

  test("two heroes can buy at different vendors without sharing wallets, equipment, or stats", () => {
    const game = new GameWorld();
    expect(game.addPlayer("p1", "Ada").ok).toBe(true);
    expect(game.addPlayer("p2", "Bryn").ok).toBe(true);
    expect(game.claimHero("p1", "warden").ok).toBe(true);
    expect(game.claimHero("p2", "riftstalker").ok).toBe(true);
    expect(game.setReady("p1", true).ok).toBe(true);
    expect(game.setReady("p2", true).ok).toBe(true);
    expect(game.startGame("p1").ok).toBe(true);

    game.players.get("p1")!.position = { ...forge.position };
    game.players.get("p2")!.position = { ...reliquary.position };
    game.players.get("p1")!.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
    game.players.get("p2")!.goldUnits = goldToUnits(ARMORY_WARE_PRICE);
    expect(game.handleMessage("p1", {
      type: "buy_item",
      vendorId: "ironbound_forge",
      itemId: "tempered_edge",
    }).ok).toBe(true);
    expect(game.handleMessage("p2", {
      type: "buy_item",
      vendorId: "veilglass_reliquary",
      itemId: "runebound_focus",
    }).ok).toBe(true);

    const snapshot = game.getSnapshot();
    const forgeBuyer = snapshot.players.find((player) => player.id === "p1")!;
    const reliquaryBuyer = snapshot.players.find((player) => player.id === "p2")!;
    expect(forgeBuyer.gold).toBe(0);
    expect(reliquaryBuyer.gold).toBe(0);
    expect(forgeBuyer.equipment).toEqual(["tempered_edge", null, null, null, null, null]);
    expect(reliquaryBuyer.equipment).toEqual(["runebound_focus", null, null, null, null, null]);
    expect(forgeBuyer.stats.basicDamage).toBeCloseTo(36);
    expect(forgeBuyer.stats.abilityPower).toBe(1);
    expect(reliquaryBuyer.stats.basicDamage).toBe(19);
    expect(reliquaryBuyer.stats.abilityPower).toBe(1.15);
  });

  test("six Reliquary duplicates fill shared capacity and reject a seventh Forge purchase atomically", () => {
    const game = new GameWorld();
    readyHero(game, "warden");
    placeAt(game, "veilglass_reliquary");
    fund(game, 7 * ARMORY_WARE_PRICE);
    for (let copy = 0; copy < 6; copy += 1) {
      expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    }
    const sixFocuses: EquipmentSlots = [
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
      "runebound_focus",
    ];
    let player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual(sixFocuses);
    expect(player.stats.abilityPower).toBeCloseTo(2.05);
    expect(player.gold).toBe(ARMORY_WARE_PRICE);

    placeAt(game, "ironbound_forge");
    expect(buy(game, "ironbound_forge", "tempered_edge").code).toBe("EQUIPMENT_FULL");
    player = game.getSnapshot().players[0]!;
    expect(player.equipment).toEqual(sixFocuses);
    expect(player.stats.abilityPower).toBeCloseTo(2.05);
    expect(player.stats.basicDamage).toBe(30);
    expect(player.gold).toBe(ARMORY_WARE_PRICE);
  });

  test("Falling Star snapshots Skill Power when the delayed strike is created", () => {
    const game = new GameWorld();
    readyHero(game, "ashcaller");
    placeAt(game, "veilglass_reliquary");
    fund(game, 2 * ARMORY_WARE_PRICE);
    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expect(game.levelAbility("p1", "ability3").ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(game, 0.4);

    const internal = game as unknown as { delayed: Array<{ damage: number }> };
    expectDamages(internal.delayed.map((strike) => strike.damage), [120.75]);
    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expectDamages(internal.delayed.map((strike) => strike.damage), [120.75]);

    const state = game.players.get("p1")!;
    state.cooldowns.ability3 = 0;
    state.action = null;
    expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(game, 0.4);
    expectDamages(internal.delayed.map((strike) => strike.damage), [120.75, 136.5]);
  });

  test("existing Splitbolts keep their created damage while the next volley uses new Skill Power", () => {
    const game = new GameWorld();
    readyHero(game, "riftstalker");
    placeAt(game, "veilglass_reliquary");
    fund(game, 2 * ARMORY_WARE_PRICE);
    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expect(game.levelAbility("p1", "ability2").ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(game, 0.4);

    const internal = game as unknown as { projectiles: Map<string, { damage: number; kind: string }> };
    const splitbolts = () => [...internal.projectiles.values()]
      .filter((projectile) => projectile.kind === "splitbolt")
      .map((projectile) => projectile.damage);
    expectDamages(splitbolts(), [54.05, 54.05, 54.05]);

    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expectDamages(splitbolts(), [54.05, 54.05, 54.05]);

    const state = game.players.get("p1")!;
    state.cooldowns.ability2 = 0;
    state.action = null;
    expect(game.handleMessage("p1", { type: "cast", slot: "ability2" }).ok).toBe(true);
    advance(game, 0.4);
    expectDamages(splitbolts(), [54.05, 54.05, 54.05, 61.1, 61.1, 61.1]);
  });

  test("retained Wraiths keep their spawned damage while the next bounded Host uses new Skill Power", () => {
    const game = new GameWorld();
    readyHero(game, "gravebinder");
    placeAt(game, "veilglass_reliquary");
    fund(game, 2 * ARMORY_WARE_PRICE);
    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expect(game.levelAbility("p1", "ability3").ok).toBe(true);
    expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(game, 0.4);

    const internal = game as unknown as { summons: Map<string, { damage: number }> };
    expectDamages([...internal.summons.values()].map((summon) => summon.damage), [27.6, 27.6, 27.6]);
    expect(buy(game, "veilglass_reliquary", "runebound_focus").ok).toBe(true);
    expectDamages([...internal.summons.values()].map((summon) => summon.damage), [27.6, 27.6, 27.6]);

    const state = game.players.get("p1")!;
    state.cooldowns.ability3 = 0;
    state.action = null;
    expect(game.handleMessage("p1", { type: "cast", slot: "ability3" }).ok).toBe(true);
    advance(game, 0.4);
    expectDamages([...internal.summons.values()].map((summon) => summon.damage), [
      27.6,
      27.6,
      31.2,
      31.2,
      31.2,
    ]);
  });
});
